'use client';
import { db } from '@/firebase';
import { collection, writeBatch, query, where, getDocs, orderBy, doc, setDoc, getDoc, updateDoc, runTransaction, increment, deleteDoc as deleteFirestoreDoc, collectionGroup, DocumentReference, arrayUnion, arrayRemove, DocumentSnapshot } from 'firebase/firestore';
import { allContent as seedData, telegramInbox } from '@/lib/file-data';
import { v4 as uuidv4 } from 'uuid';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { nanoid } from 'nanoid';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { offlineStorage } from '@/lib/offline';
import type { Lecture } from './types';
import type { UserProfile } from '@/stores/auth-store';
import * as pdfjs from 'pdfjs-dist';

// Set workerSrc once, globally for client-side operations.
if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${'3.11.174'}/pdf.worker.min.js`;
}

export type Content = {
  id: string;
  name: string;
  type: 'LEVEL' | 'SEMESTER' | 'SUBJECT' | 'FOLDER' | 'FILE' | 'LINK' | 'INTERACTIVE_QUIZ' | 'INTERACTIVE_EXAM' | 'INTERACTIVE_FLASHCARD' | 'NOTE';
  parentId: string | null;
  metadata?: {
    size?: number;
    mime?: string;
    storagePath?: string;
    cloudinaryPublicId?: string;
    cloudinaryResourceType?: 'image' | 'video' | 'raw';
    url?: string; // For LINK type
    iconURL?: string; // For custom folder icons
    iconCloudinaryPublicId?: string;
    shortId?: string;
    sourceFileId?: string; // For generated files like quizzes
    quizData?: string; // For INTERACTIVE_QUIZ or INTERACTIVE_EXAM type
    isClassContainer?: boolean; // For the new "Class" type
    isHidden?: boolean; // For hiding content from non-admins
  };
  createdAt?: string;
  updatedAt?: string;
  order?: number;
  iconName?: string;
  color?: string;
};

export type UploadCallbacks = {
  onProgress: (progress: number) => void;
  onSuccess: (content: Content) => void;
  onError: (error: Error) => void;
};

/**
 * Creates a proxied URL through the Cloudflare worker if configured,
 * otherwise returns the direct Cloudinary URL.
 * @param secureUrl The full secure_url from Cloudinary.
 * @returns The final URL to be used in the app.
 */
function createProxiedUrl(secureUrl: string): string {
    const workerBase = process.env.NEXT_PUBLIC_FILES_BASE_URL;
    if (!workerBase) {
        return secureUrl;
    }
    try {
        const urlObject = new URL(secureUrl);
        // The path we need is everything after the cloud name, e.g., /image/upload/v123...
        const pathParts = urlObject.pathname.split('/');
        // The path starts with a '/', so the cloud name is at index 1.
        // We want the parts after the cloud name.
        const pathAfterCloudName = pathParts.slice(2).join('/');
       
        // Ensure workerBase doesn't have a trailing slash.
        const cleanWorkerBase = workerBase.endsWith('/') ? workerBase.slice(0, -1) : workerBase;
        return `${cleanWorkerBase}/${pathAfterCloudName}`;
    } catch (error) {
        console.error("Error creating proxied URL, falling back to direct URL:", error);
        return secureUrl;
    }
}

export const contentService = {
    async getFileContent(url: string, fileId?: string): Promise<Blob> {
        const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

        if (fileId) {
            const cached = await offlineStorage.getFile(fileId);
            if (cached) {
                console.log('📦 Loading from offline cache');
                return cached.content;
            }
        }
    
        if (!isOnline) {
            throw new Error("You are offline and the file is not available in the cache.");
        }
    
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch file from network: ${response.statusText}`);
            }
            const blob = await response.blob();
           
            if (fileId) {
                await offlineStorage.saveFile(fileId, {
                  name: url.split('/').pop() || 'file',
                  content: blob,
                  mime: blob.type
                });
                // Run cleaning process in the background
                offlineStorage.cleanOldFiles().catch(console.error);
            }
            return blob;
        } catch (error) {
            if (fileId) {
              const cached = await offlineStorage.getFile(fileId);
              if (cached) {
                  console.log('📦 Network failed, falling back to offline cache');
                  return cached.content;
              }
            }
            throw error;
        }
    },
    
    async extractTextFromPdf(pdfOrBlob: PDFDocumentProxy | Blob): Promise<string> {
        let pdf: PDFDocumentProxy;
        if (pdfOrBlob instanceof Blob) {
            const loadingTask = pdfjs.getDocument(await pdfOrBlob.arrayBuffer());
            pdf = await loadingTask.promise;
        } else {
            pdf = pdfOrBlob;
        }
    
        const maxPages = pdf.numPages;
        const textPromises: Promise<string>[] = [];

        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            textPromises.push(
                pdf.getPage(pageNum)
                .then(async (page) => {
                    const textContent = await page.getTextContent();
                    return textContent.items
                    .map((item: any) => item.str)
                    .join(' ');
                })
                .catch((error) => {
                    console.error(`Error extracting text from page ${pageNum}:`, error);
                    return '';
                })
            );
        }
        try {
            const pageTexts = await Promise.all(textPromises);
            return pageTexts.join('\n');
        } catch (error) {
            console.error('Failed to process all pages for text extraction:', error);
            throw new Error('Failed to extract text from PDF.');
        }
    },
 
  async seedInitialData() {
    if (!db) {
        console.error("Firestore is not initialized.");
        return;
    }
    const contentRef = collection(db, 'content');
    
    try {
        const batch = writeBatch(db);
        const allSeedItems = [...seedData, telegramInbox];

        allSeedItems.forEach((item, index) => {
            const docRef = doc(contentRef, item.id);
            const dataWithDefaults = {
                ...item,
                order: item.order ?? index,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            batch.set(docRef, dataWithDefaults, { merge: true }); // Use merge: true to avoid overwriting user data if item exists
        });

        await batch.commit();
        console.log('Data seeding/verification completed successfully.');
    } catch (e: any) {
        if (e && e.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: '/content (batch write)',
                operation: 'write',
                requestResourceData: { note: "Seeding multiple documents" }
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
            console.error("Error during data seeding transaction:", e);
        }
    }
},
  async getChildren(parentId: string | null): Promise<Content[]> {
    if (!db) return [];
    const q = query(collection(db, 'content'), where('parentId', '==', parentId), orderBy('order'));
    const snapshot = await getDocs(q);
    const children = snapshot.docs.map(doc => doc.data() as Content);
    return children;
  },
  async createFolder(parentId: string | null, name: string, metadata: Content['metadata'] = {}): Promise<Content> {
    if (!db) throw new Error("Firestore not initialized");
    const newFolderId = uuidv4();
    const newFolderRef = doc(db, 'content', newFolderId);
    let newFolderData: Content | null = null;
    try {
      await runTransaction(db, async (transaction) => {
        const childrenQuery = parentId
            ? query(collection(db, 'content'), where('parentId', '==', parentId))
            : query(collection(db, 'content'), where('parentId', '==', null));
        const childrenSnapshot = await getDocs(childrenQuery);
        const order = childrenSnapshot.size;
        newFolderData = {
          id: newFolderId,
          name: name,
          type: 'FOLDER',
          parentId: parentId,
          metadata: metadata,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          order: order,
        };
        transaction.set(newFolderRef, newFolderData);
      });
     
      if (!newFolderData) throw new Error("Folder creation failed within transaction.");
      return newFolderData;
    } catch (e: any) {
      if (e && e.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `/content/${newFolderId}`,
            operation: 'create',
            requestResourceData: { name, parentId, type: 'FOLDER', metadata },
        }));
      } else {
        console.error("Transaction failed: ", e);
      }
      throw e;
    }
  },
  async createLink(parentId: string | null, name: string, url: string): Promise<Content> {
    if (!db) throw new Error("Firestore not initialized");
    const newLinkId = uuidv4();
    const newLinkRef = doc(db, 'content', newLinkId);
    let newLinkData: Content | null = null;
    try {
      await runTransaction(db, async (transaction) => {
        const childrenQuery = parentId
            ? query(collection(db, 'content'), where('parentId', '==', parentId))
            : query(collection(db, 'content'), where('parentId', '==', null));
        const childrenSnapshot = await getDocs(childrenQuery);
        const order = childrenSnapshot.size;
        newLinkData = {
          id: newLinkId,
          name: name,
          type: 'LINK',
          parentId: parentId,
          metadata: {
            url: url,
            shortId: nanoid(10),
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          order: order,
        };
        transaction.set(newLinkRef, newLinkData);
      });
     
      if (!newLinkData) throw new Error("Link creation failed within transaction.");
      return newLinkData;
    } catch (e: any) {
      if (e && e.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `/content/${newLinkId}`,
            operation: 'create',
            requestResourceData: { name, parentId, type: 'LINK', url },
        }));
      } else {
        console.error("Transaction failed: ", e);
      }
      throw e;
    }
  },
  async createOrUpdateInteractiveContent(
    destination: Content,
    name: string,
    lectureData: Partial<Lecture>,
    sourceFileId: string,
    type: 'INTERACTIVE_QUIZ' | 'INTERACTIVE_EXAM' | 'INTERACTIVE_FLASHCARD'
  ): Promise<Content> {
      if (!db) throw new Error("Firestore not initialized");
 
      const originalFileName = name.replace(/\.[^/.]+$/, "");
      let contentName = name;
     
      if(destination.type === 'FOLDER') {
         switch (type) {
            case 'INTERACTIVE_QUIZ':
                contentName = `${originalFileName} - Quiz`;
                break;
            case 'INTERACTIVE_EXAM':
                contentName = `${originalFileName} - Exam`;
                break;
            case 'INTERACTIVE_FLASHCARD':
                contentName = `${originalFileName} - Flashcards`;
                break;
        }
      }
     
      const newLectureData: Lecture = {
          id: lectureData.id || sourceFileId || uuidv4(),
          name: lectureData.name || originalFileName,
          mcqs_level_1: lectureData.mcqs_level_1 || [],
          mcqs_level_2: lectureData.mcqs_level_2 || [],
          written: lectureData.written || [],
          flashcards: lectureData.flashcards || [],
      };
      // If destination is a folder, create a new interactive file
      if (destination.type === 'FOLDER') {
          const newId = uuidv4();
          const newRef = doc(db, 'content', newId);
 
          return runTransaction(db, async (transaction) => {
              const childrenQuery = query(collection(db, 'content'), where('parentId', '==', destination.id));
              const childrenSnapshot = await getDocs(childrenQuery);
              const order = childrenSnapshot.size;
             
              const newContentData: Content = {
                  id: newId,
                  name: contentName,
                  type: type,
                  parentId: destination.id,
                  metadata: {
                      quizData: type === 'INTERACTIVE_FLASHCARD'
                        ? JSON.stringify([{ id: `l${Date.now()}`, name: name, flashcards: [] }], null, 2)
                        : JSON.stringify([newLectureData], null, 2),
                      sourceFileId,
                  },
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  order: order,
              };
              transaction.set(newRef, newContentData);
              return newContentData;
          });
      }
 
      // If destination is an existing file of the same type, merge the content
      if (destination.type === type) {
          const docRef = doc(db, 'content', destination.id);
 
          return runTransaction(db, async (transaction) => {
              const docSnap = await transaction.get(docRef);
              if (!docSnap.exists()) throw new Error("Destination file does not exist.");
 
              const existingQuizData = docSnap.data().metadata?.quizData;
              let existingLectures: Lecture[] = [];
              if (existingQuizData) {
                  try {
                      existingLectures = JSON.parse(existingQuizData);
                      if (!Array.isArray(existingLectures)) existingLectures = [];
                  } catch (e) {
                      existingLectures = [];
                  }
              }
             
              const existingLectureIndex = existingLectures.findIndex(lec => lec.id === newLectureData.id);
 
              if (existingLectureIndex > -1) {
                  // Merge content into existing lecture object
                  const lectureToUpdate = { ...existingLectures[existingLectureIndex] };
                  // Smartly merge based on which content type is being updated
                  if(newLectureData.mcqs_level_1 && newLectureData.mcqs_level_1.length > 0) lectureToUpdate.mcqs_level_1 = newLectureData.mcqs_level_1;
                  if(newLectureData.mcqs_level_2 && newLectureData.mcqs_level_2.length > 0) lectureToUpdate.mcqs_level_2 = newLectureData.mcqs_level_2;
                  if(newLectureData.written && newLectureData.written.length > 0) lectureToUpdate.written = newLectureData.written;
                  if(newLectureData.flashcards && newLectureData.flashcards.length > 0) lectureToUpdate.flashcards = newLectureData.flashcards;
                 
                  existingLectures[existingLectureIndex] = lectureToUpdate;
              } else {
                  // Add as a new lecture object to the array
                  existingLectures.push(newLectureData);
              }
 
              const updatedQuizData = JSON.stringify(existingLectures, null, 2);
              transaction.update(docRef, {
                  'metadata.quizData': updatedQuizData,
                  'updatedAt': new Date().toISOString(),
              });
 
              const updatedDestination = { ...destination };
              if (!updatedDestination.metadata) updatedDestination.metadata = {};
              updatedDestination.metadata.quizData = updatedQuizData;
              return updatedDestination;
          });
      }
 
      throw new Error(`Cannot save ${type} to a file of type ${destination.type}.`);
  },
 
  async createFile(parentId: string | null, file: File, callbacks: UploadCallbacks, extraMetadata: { [key: string]: any } = {}): Promise<XMLHttpRequest> {
    const xhr = new XMLHttpRequest();
   
    try {
        const folder = 'content'; // Or derive a more specific folder if needed
        const public_id = `${folder}/${nanoid()}`;
        
        // The client only needs to specify non-sensitive parameters.
        const paramsToSign = {
            folder,
            public_id,
        };

        const sigResponse = await fetch('/api/sign-cloudinary-params', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paramsToSign })
        });

        if (!sigResponse.ok) {
            const errorBody = await sigResponse.json();
            throw new Error(`Failed to get Cloudinary signature: ${errorBody.error || sigResponse.statusText}`);
        }
        
        const { signature, apiKey, cloudName, timestamp } = await sigResponse.json();

        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', apiKey);
        formData.append('signature', signature);
        // Append all the signed parameters to the form data
        formData.append('folder', paramsToSign.folder);
        formData.append('public_id', paramsToSign.public_id);
        formData.append('timestamp', String(timestamp));


        xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`);
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const progress = (event.loaded / event.total) * 100;
                callbacks.onProgress(progress);
            }
        };
        xhr.onload = async () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                const data = JSON.parse(xhr.responseText);
               
                const q = query(collection(db, 'content'), where('metadata.cloudinaryPublicId', '==', data.public_id), where('parentId', '==', parentId));
                const existingDocs = await getDocs(q);
                if (!existingDocs.empty) {
                    console.log("File with this content already exists in this folder.");
                    callbacks.onSuccess(existingDocs.docs[0].data() as Content);
                    return;
                }
                const id = uuidv4();
                const children = await this.getChildren(parentId);
               
                const finalFileUrl = createProxiedUrl(data.secure_url);
                const mimeType = file.type || (file.name.endsWith('.md') ? 'text/markdown' : 'application/octet-stream');
               
                const fileNameWithoutExt = file.name.endsWith('.md') ? file.name.slice(0, -3) : file.name;
                const newFileContent: Content = {
                    id,
                    name: fileNameWithoutExt,
                    type: 'FILE',
                    parentId: parentId,
                    metadata: {
                        size: data.bytes,
                        mime: mimeType,
                        storagePath: finalFileUrl,
                        cloudinaryPublicId: data.public_id,
                        cloudinaryResourceType: 'raw',
                        ...extraMetadata
                    },
                    createdAt: new Date(data.created_at).toISOString(),
                    updatedAt: new Date(data.created_at).toISOString(),
                    order: children.length,
                };
               
                await setDoc(doc(db, 'content', id), newFileContent);
                callbacks.onSuccess(newFileContent);
            } else {
                 callbacks.onError(new Error(`Upload failed: ${xhr.statusText}`));
            }
        };
        xhr.onerror = () => {
            callbacks.onError(new Error('Network error during upload.'));
        };
        xhr.onabort = () => {
            console.log("Upload aborted by user.");
        };
       
        xhr.send(formData);
    } catch(e: any) {
        callbacks.onError(e);
    }
    return xhr;
  },
    async uploadUserAvatar(user: UserProfile, file: File, onProgress: (progress: number) => void, folderName: string = 'avatars'): Promise<{ publicId: string, url: string }> {
        // Before uploading, delete the old asset if it exists
        if (folderName === 'avatars' && user.metadata?.cloudinaryPublicId) {
            try {
                await this.deleteCloudinaryAsset(user.metadata.cloudinaryPublicId, 'image');
            } catch (e) {
                console.warn("Failed to delete old avatar, proceeding with upload:", e);
            }
        }
        
        const folder = `${folderName}/${user.id}`;
        const public_id = `${folder}/${nanoid()}`;
        const paramsToSign = { 
          public_id, 
          folder,
        };
        const sigResponse = await fetch('/api/sign-cloudinary-params', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paramsToSign })
        });
        if (!sigResponse.ok) throw new Error('Failed to get signature.');
        const { signature, apiKey, cloudName, timestamp } = await sigResponse.json();

        const resourceType = folderName === 'community_media' ? 'auto' : 'image';

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const formData = new FormData();
            formData.append('file', file);
            formData.append('api_key', apiKey);
            formData.append('timestamp', String(timestamp));
            formData.append('signature', signature);
            formData.append('public_id', public_id);
            formData.append('folder', folder);

            xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`);
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    onProgress((event.loaded / event.total) * 100);
                }
            };
           
            xhr.onload = async () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    const data = JSON.parse(xhr.responseText);
                    const finalUrl = createProxiedUrl(data.secure_url);

                    if (folderName === 'avatars') {
                        await updateDoc(doc(db, 'users', user.id), {
                            photoURL: finalUrl,
                            'metadata.cloudinaryPublicId': data.public_id,
                        });
                    }
                    
                    resolve({ publicId: data.public_id, url: finalUrl });
                } else {
                    reject(new Error(`Upload failed: ${xhr.statusText}`));
                }
            };
            xhr.onerror = () => reject(new Error('Network error.'));
            xhr.send(formData);
        });
    },
    async deleteUserAvatar(user: UserProfile) {
        if (!user.metadata?.cloudinaryPublicId) return;
        await this.deleteCloudinaryAsset(user.metadata.cloudinaryPublicId, 'image');
        await updateDoc(doc(db, 'users', user.id), {
            photoURL: null,
            'metadata.cloudinaryPublicId': null
        });
    },
    async uploadUserCoverPhoto(user: UserProfile, file: File, onProgress: (progress: number) => void): Promise<{ publicId: string, url: string }> {
        // Before uploading, delete the old asset if it exists
        if (user.metadata?.coverPhotoCloudinaryPublicId) {
            try {
                await this.deleteCloudinaryAsset(user.metadata.coverPhotoCloudinaryPublicId, 'image');
            } catch (e) {
                console.warn("Failed to delete old cover photo, proceeding with upload:", e);
            }
        }
        
        const folder = `covers/${user.id}`;
        const public_id = `${folder}/${uuidv4()}`;
        const paramsToSign = { 
          public_id, 
          folder,
        };
        const sigResponse = await fetch('/api/sign-cloudinary-params', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paramsToSign })
        });
        if (!sigResponse.ok) throw new Error('Failed to get signature.');
        const { signature, apiKey, cloudName, timestamp } = await sigResponse.json();

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const formData = new FormData();
            formData.append('file', file);
            formData.append('api_key', apiKey);
            formData.append('signature', signature);
            formData.append('timestamp', String(timestamp));
            formData.append('public_id', public_id);
            formData.append('folder', folder);
            xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) onProgress((event.loaded / event.total) * 100);
            };
            xhr.onload = async () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    const data = JSON.parse(xhr.responseText);
                    const finalUrl = createProxiedUrl(data.secure_url);
                    await updateDoc(doc(db, 'users', user.id), {
                        'metadata.coverPhotoURL': finalUrl,
                        'metadata.coverPhotoCloudinaryPublicId': data.public_id,
                    });
                    resolve({ publicId: data.public_id, url: finalUrl });
                } else {
                    reject(new Error(`Upload failed: ${xhr.statusText}`));
                }
            };
            xhr.onerror = () => reject(new Error('Network error.'));
            xhr.send(formData);
        });
    },
    async deleteUserCoverPhoto(user: UserProfile) {
        if (!user.metadata?.coverPhotoCloudinaryPublicId) return;
        await this.deleteCloudinaryAsset(user.metadata.coverPhotoCloudinaryPublicId, 'image');
        await updateDoc(doc(db, 'users', user.id), {
            'metadata.coverPhotoURL': null,
            'metadata.coverPhotoCloudinaryPublicId': null
        });
    },
  async uploadAndSetIcon(itemId: string, iconFile: File, callbacks: Omit<UploadCallbacks, 'onSuccess'> & { onSuccess: (url: string) => void }): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    try {
        const itemRef = doc(db, 'content', itemId);
        const itemSnap = await getDoc(itemRef);
        if (!itemSnap.exists()) throw new Error("Item not found");
        
        // Before uploading, delete the old asset if it exists
        const existingItem = itemSnap.data() as Content;
        const oldPublicId = existingItem.metadata?.iconCloudinaryPublicId;
        if (oldPublicId) {
            try {
                await this.deleteCloudinaryAsset(oldPublicId, 'image');
            } catch(e) {
                console.warn("Failed to delete old icon, proceeding with upload:", e);
            }
        }
        
        const folder = 'icons';
        const public_id = `${folder}/${uuidv4()}`;
        const paramsToSign = { 
          public_id, 
          folder,
        };
        const sigResponse = await fetch('/api/sign-cloudinary-params', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paramsToSign })
        });
        if (!sigResponse.ok) throw new Error(`Failed to get Cloudinary signature: ${sigResponse.statusText}`);
       
        const { signature, apiKey, cloudName, timestamp } = await sigResponse.json();
        const formData = new FormData();
        formData.append('file', iconFile);
        formData.append('api_key', apiKey);
        formData.append('signature', signature);
        formData.append('timestamp', String(timestamp));
        formData.append('public_id', public_id);
        formData.append('folder', folder);
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
       
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) callbacks.onProgress((event.loaded / event.total) * 100);
        };
       
        xhr.onload = async () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                const data = JSON.parse(xhr.responseText);
                const finalIconUrl = createProxiedUrl(data.secure_url);
                await updateDoc(itemRef, {
                    'metadata.iconURL': finalIconUrl,
                    'metadata.iconCloudinaryPublicId': data.public_id,
                    updatedAt: new Date().toISOString()
                });
                callbacks.onSuccess(finalIconUrl);
            } else {
                callbacks.onError(new Error(`Cloudinary upload failed: ${xhr.statusText}`));
            }
        };
        xhr.onerror = () => callbacks.onError(new Error('Network error during icon upload.'));
        xhr.send(formData);
    } catch (e: any) {
        if (e.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: `/content/${itemId}`,
                operation: 'update',
                requestResourceData: { 'metadata.iconURL': '...new_url...' },
            }));
        } else {
          console.error("Icon update failed:", e);
        }
        callbacks.onError(e);
        throw e;
    }
  },
  async updateFile(itemToUpdate: Content, newFile: File, callbacks: UploadCallbacks): Promise<XMLHttpRequest | undefined> {
    if (!db) {
        const error = new Error("Firestore not initialized");
        callbacks.onError(error);
        throw error;
    }
    const batch = writeBatch(db);

    try {
        const parentId = itemToUpdate.parentId;
        const oldFilePublicId = itemToUpdate.metadata?.cloudinaryPublicId;
        const oldFileResourceType = itemToUpdate.metadata?.cloudinaryResourceType || 'raw';
        
        // 1. Delete old Firestore document
        batch.delete(doc(db, 'content', itemToUpdate.id));
        await batch.commit();

        // 2. Delete old Cloudinary asset
        if (oldFilePublicId) {
            await this.deleteCloudinaryAsset(oldFilePublicId, oldFileResourceType);
        }

        // 3. Create the new file, preserving the original order
        return await this.createFile(parentId, newFile, callbacks, { order: itemToUpdate.order });

    } catch (e: any) {
        console.error("Update (delete and replace) failed:", e);
        callbacks.onError(e);
        // Don't re-throw as the callback handles the error state
    }
  },
 
  async getById(id: string): Promise<Content | null> {
    if (!db) return null;
    if (id === 'root') {
      return { id: 'root', name: 'Home', type: 'FOLDER', parentId: null };
    }
    const docRef = doc(db, 'content', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as Content : null;
  },
  async updateDoc(docId: string, data: { [key: string]: any }): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    const docRef = doc(db, 'content', docId);
   
    const updatedData = { ...data, updatedAt: new Date().toISOString() };
   
    await updateDoc(docRef, updatedData).catch(e => {
        if (e.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: `/content/${docId}`,
                operation: 'update',
                requestResourceData: data,
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw e;
    });
  },
  async rename(id: string, name: string): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    const docRef = doc(db, 'content', id);
    const updatedData = { name, updatedAt: new Date().toISOString() };
   
    await updateDoc(docRef, updatedData).catch(e => {
        if (e.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: `/content/${id}`,
                operation: 'update',
                requestResourceData: { name },
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw e;
    });
  },
 
  async move(itemId: string, newParentId: string): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    if (itemId === newParentId) throw new Error("Cannot move an item into itself.");
    const itemRef = doc(db, 'content', itemId);
    try {
        await runTransaction(db, async (transaction) => {
            const itemDoc = await transaction.get(itemRef);
            if (!itemDoc.exists()) {
                throw new Error("Item to move does not exist.");
            }
            let parentCheckId: string | null = newParentId;
            while (parentCheckId) {
                if (parentCheckId === itemId) {
                    throw new Error("Cannot move a folder into one of its own subfolders.");
                }
                const parentDocSnap = await transaction.get(doc(db, 'content', parentCheckId));
                const parentData = parentDocSnap.data() as Content | undefined;
                parentCheckId = parentData?.parentId ?? null;
            }
            const childrenInNewParentQuery = query(collection(db, 'content'), where('parentId', '==', newParentId));
            const childrenSnapshot = await getDocs(childrenInNewParentQuery);
            const newOrder = childrenSnapshot.size;
            transaction.update(itemRef, { parentId: newParentId, order: newOrder, updatedAt: new Date().toISOString() });
        });
    } catch (e: any) {
        if (e.code === 'permission-denied') {
             errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: `/content/${itemId}`,
                operation: 'update',
                requestResourceData: { parentId: newParentId },
            }));
        } else {
             console.error("Move transaction failed:", e);
        }
        throw e;
    }
  },
  async copy(itemToCopy: Content, newParentId: string): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    const batch = writeBatch(db);
    const performCopy = async (originalItem: Content, targetParentId: string | null) => {
        const newId = uuidv4();
       
        const childrenInNewParentQuery = query(collection(db, 'content'), where('parentId', '==', targetParentId));
        const childrenSnapshot = await getDocs(childrenInNewParentQuery);
        const newOrder = childrenSnapshot.size;
        const newItemData: Content = {
            ...originalItem,
            id: newId,
            parentId: targetParentId,
            name: `${originalItem.name} (Copy)`,
            order: newOrder,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        // Ensure icon URL is copied, but not public ID to avoid deleting original
        if (originalItem.metadata?.iconURL) {
            if (!newItemData.metadata) newItemData.metadata = {};
            newItemData.metadata.iconURL = originalItem.metadata.iconURL;
            newItemData.metadata.iconCloudinaryPublicId = undefined; // Don't copy public id
        }
       
        const newDocRef = doc(db, 'content', newId);
        batch.set(newDocRef, newItemData);
        if (originalItem.type === 'FOLDER' || originalItem.type === 'SUBJECT' || originalItem.type === 'SEMESTER' || originalItem.type === 'LEVEL') {
            const childrenQuery = query(collection(db, 'content'), where('parentId', '==', originalItem.id), orderBy('order'));
            const childrenSnapshot = await getDocs(childrenQuery);
            for (const childDoc of childrenSnapshot.docs) {
                await performCopy(childDoc.data() as Content, newId);
            }
        }
    };
   
    try {
        await performCopy(itemToCopy, newParentId);
        await batch.commit();
    } catch(e: any) {
         if (e.code === 'permission-denied') {
             errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: `/content/${newParentId}`,
                operation: 'create',
                requestResourceData: { note: "Copy operation" },
            }));
        } else {
             console.error("Copy operation failed:", e);
        }
        throw e;
    }
  },
 
  async toggleVisibility(id: string): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    const docRef = doc(db, 'content', id);
    try {
        await runTransaction(db, async (transaction) => {
            const docSnap = await transaction.get(docRef);
            if (!docSnap.exists()) {
                throw "Document does not exist!";
            }
            const currentHiddenState = docSnap.data().metadata?.isHidden ?? false;
            transaction.update(docRef, { "metadata.isHidden": !currentHiddenState });
        });
    } catch (e: any) {
        if (e.code === 'permission-denied') {
             errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: `/content/${id}`,
                operation: 'update',
                requestResourceData: { 'metadata.isHidden': '...' },
            }));
        }
        console.error("Toggle visibility failed: ", e);
        throw e;
    }
  },
  async toggleFavorite(userId: string, contentId: string): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    const userRef = doc(db, "users", userId);
    try {
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) throw new Error("User not found");
       
        const favorites = userDoc.data().favorites || [];
        const isFavorited = favorites.includes(contentId);
        if (isFavorited) {
            await updateDoc(userRef, { favorites: arrayRemove(contentId) });
        } else {
            await updateDoc(userRef, { favorites: arrayUnion(contentId) });
        }
    } catch (e: any) {
        if (e.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: `/users/${userId}`,
                operation: 'update',
                requestResourceData: { favorites: '...' },
            }));
        }
        console.error("Toggle favorite failed:", e);
        throw e;
    }
  },
  async deleteCloudinaryAsset(publicId: string, resourceType: 'image' | 'video' | 'raw' = 'raw'): Promise<void> {
    try {
        const res = await fetch('/api/delete-cloudinary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ publicId, resourceType }),
        });
        if (!res.ok) {
            const errorBody = await res.json();
            throw new Error(`Failed to delete asset from Cloudinary: ${errorBody.details || res.statusText}`);
        }
    } catch (err) {
        console.error("Cloudinary deletion via API failed:", err);
        // Don't re-throw, as this is a cleanup operation and shouldn't block the main flow.
    }
  },
  async delete(id: string): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    const deleteQueue: string[] = [id];
    const visited = new Set<string>([id]);
    const filesToDeleteFromCloudinary: { publicId: string; resourceType: 'image' | 'video' | 'raw'; }[] = [];
    const filesToDeleteFromCache: string[] = [];
    const batch = writeBatch(db);
    try {
        let head = 0;
        while(head < deleteQueue.length) {
            const currentId = deleteQueue[head++];
            const childrenQuery = query(collection(db, "content"), where("parentId", "==", currentId));
            const childrenSnapshot = await getDocs(childrenQuery);
            childrenSnapshot.forEach(childDoc => {
                if (!visited.has(childDoc.id)) {
                    deleteQueue.push(childDoc.id);
                    visited.add(childDoc.id);
                }
            });
        }
       
        const allDocsToDeleteQuery = query(collection(db, "content"), where("id", "in", Array.from(visited)));
        const allDocsSnapshot = await getDocs(allDocsToDeleteQuery);
       
        allDocsSnapshot.forEach(docSnap => {
            const item = docSnap.data() as Content;
            if (item.type === 'FILE' && item.metadata?.cloudinaryPublicId) {
                filesToDeleteFromCloudinary.push({
                    publicId: item.metadata.cloudinaryPublicId,
                    resourceType: item.metadata.cloudinaryResourceType || 'raw'
                });
                if (item.metadata.storagePath) {
                    filesToDeleteFromCache.push(item.metadata.storagePath);
                }
            }
            if ((item.type === 'FOLDER' || item.type === 'SUBJECT') && item.metadata?.iconCloudinaryPublicId) {
                filesToDeleteFromCloudinary.push({
                    publicId: item.metadata.iconCloudinaryPublicId,
                    resourceType: 'image'
                });
                 if (item.metadata.iconURL) {
                    filesToDeleteFromCache.push(item.metadata.iconURL);
                }
            }
            batch.delete(docSnap.ref);
        });
        if (filesToDeleteFromCloudinary.length > 0) {
            for (const file of filesToDeleteFromCloudinary) {
                await this.deleteCloudinaryAsset(file.publicId, file.resourceType);
            }
        }
       
        if (filesToDeleteFromCache.length > 0) {
            for (const url of filesToDeleteFromCache) {
                await offlineStorage.deleteFile(url);
            }
        }
        await batch.commit();
    } catch (e: any) {
        if (e.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: `/content (recursive delete starting from ${id})`,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
            console.error(`Recursive delete failed: ${e.message}`);
        }
        throw e;
    }
  },
  async updateOrder(parentId: string | null, orderedIds: string[]): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    const batch = writeBatch(db);
    orderedIds.forEach((id, index) => {
        const docRef = doc(db, 'content', id);
        batch.update(docRef, { order: index });
    });
   
    try {
        await batch.commit();
    } catch (e: any) {
        if (e.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: `/content (batch update for reordering)`,
                operation: 'update',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw e;
    }
  },
  async createNote(userId: string) {
    if (!db) throw new Error("Database not initialized");
    const notesCollection = collection(db, `users/${userId}/notes`);
    const newNote = {
      content: '## New Note\n\nStart writing here...',
      color: '#333333',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await addDoc(notesCollection, newNote);
  },

  async updateNote(userId: string, noteId: string, updates: Partial<Note>) {
    if (!db) throw new Error("Database not initialized");
    const noteRef = doc(db, `users/${userId}/notes`, noteId);
    await updateDoc(noteRef, { ...updates, updatedAt: new Date().toISOString() });
  },

  async deleteNote(userId: string, noteId: string) {
    if (!db) throw new Error("Database not initialized");
    const noteRef = doc(db, `users/${userId}/notes`, noteId);
    await deleteFirestoreDoc(noteRef);
  },
    
  async uploadNoteImage(file: File): Promise<string> {
      const folder = `notes_images`;
      const public_id = `${folder}/${nanoid()}`;
      const paramsToSign = { 
        public_id, 
        folder,
      };
      const sigResponse = await fetch('/api/sign-cloudinary-params', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paramsToSign })
      });
      if (!sigResponse.ok) throw new Error('Failed to get signature.');
      const { signature, apiKey, cloudName, timestamp } = await sigResponse.json();

      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', String(timestamp));
      formData.append('signature', signature);
      formData.append('public_id', public_id);
      formData.append('folder', folder);
      
      const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData,
      });

      if (!uploadResponse.ok) {
          throw new Error('Cloudinary image upload failed.');
      }
      const data = await uploadResponse.json();
      return createProxiedUrl(data.secure_url);
  },
  
  async resetToInitialStructure(): Promise<void> {
    if (!db) throw new Error("Firestore not initialized.");

    console.log("Starting structure reset...");
    
    // 1. Define the IDs of the items to keep (original Levels and Semesters)
    const seedIdsToKeep = new Set(
        seedData.map(item => item.id)
    );
    seedIdsToKeep.add(telegramInbox.id);

    // 2. Fetch all content from Firestore
    const contentRef = collection(db, 'content');
    const allContentSnapshot = await getDocs(contentRef);
    
    const itemsToDelete: Content[] = [];
    
    allContentSnapshot.forEach(doc => {
        const item = doc.data() as Content;
        if (!seedIdsToKeep.has(item.id)) {
            itemsToDelete.push(item);
        }
    });

    if (itemsToDelete.length === 0) {
        console.log("No items to delete. Structure is already clean.");
        return;
    }

    console.log(`Found ${itemsToDelete.length} items to delete.`);

    // 3. Collect Cloudinary public IDs for deletion
    const assetsToDelete: { publicId: string, resourceType: 'image' | 'video' | 'raw' }[] = [];
    itemsToDelete.forEach(item => {
        if (item.metadata?.cloudinaryPublicId) {
            assetsToDelete.push({
                publicId: item.metadata.cloudinaryPublicId,
                resourceType: item.metadata.cloudinaryResourceType || 'raw'
            });
        }
        if (item.metadata?.iconCloudinaryPublicId) {
             assetsToDelete.push({
                publicId: item.metadata.iconCloudinaryPublicId,
                resourceType: 'image'
            });
        }
    });

    // 4. Delete Firestore documents in a batch
    const batch = writeBatch(db);
    itemsToDelete.forEach(item => {
        batch.delete(doc(db, 'content', item.id));
    });
    
    console.log("Committing Firestore batch deletion...");
    await batch.commit();
    console.log("Firestore documents deleted.");

    // 5. Delete Cloudinary assets
    if (assetsToDelete.length > 0) {
        console.log(`Deleting ${assetsToDelete.length} assets from Cloudinary...`);
        for (const asset of assetsToDelete) {
            try {
                await this.deleteCloudinaryAsset(asset.publicId, asset.resourceType);
            } catch (error) {
                console.error(`Failed to delete Cloudinary asset ${asset.publicId}:`, error);
            }
        }
        console.log("Cloudinary asset deletion process completed.");
    }
  },
};
