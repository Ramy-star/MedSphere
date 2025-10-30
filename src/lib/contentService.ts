'use client';
import { db } from '@/firebase';
import { collection, writeBatch, query, where, getDocs, orderBy, doc, setDoc, getDoc, updateDoc, runTransaction, increment, deleteDoc as deleteFirestoreDoc, collectionGroup, DocumentReference, arrayUnion, arrayRemove, DocumentSnapshot } from 'firebase/firestore';
import { allContent as seedData, telegramInbox } from './file-data';
import { v4 as uuidv4 } from 'uuid';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { nanoid } from 'nanoid';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { cacheService } from './cacheService';
import type { Lecture } from './types';
import type { UserProfile } from '@/stores/auth-store';
import * as pdfjs from 'pdfjs-dist';

// Set workerSrc once, globally for client-side operations.
if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

export type Content = {
  id: string;
  name: string;
  type: 'LEVEL' | 'SEMESTER' | 'SUBJECT' | 'FOLDER' | 'FILE' | 'LINK' | 'INTERACTIVE_QUIZ' | 'INTERACTIVE_EXAM' | 'INTERACTIVE_FLASHCARD';
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
    async getFileContent(url: string): Promise<Blob> {
        const cachedFile = await cacheService.getFile(url);
        if (cachedFile) {
            console.log("Serving file from IndexedDB cache:", url);
            return cachedFile;
        }
        console.log("Fetching file from network and caching:", url);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch file from network: ${response.statusText}`);
        }
        const blob = await response.blob();
       
        // Don't wait for caching to complete to return the blob
        cacheService.saveFile(url, blob).catch(err => {
            console.error("Failed to cache file in IndexedDB:", err);
        });
        return blob;
    },
    
    async extractTextFromPdf(fileBlob: Blob): Promise<string> {
        const arrayBuffer = await fileBlob.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        const maxPages = pdf.numPages;
        const textPromises: Promise<string>[] = [];
        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            textPromises.push(
                pdf.getPage(pageNum)
                .then(async (page) => {
                    const textContent = await page.getTextContent();
                    return textContent.items
                    .map((item: any) => item.str) // Type assertion to access 'str'
                    .join(' ');
                })
                .catch((error) => {
                    console.error(`Error extracting text from page ${pageNum}:`, error);
                    return ''; // Return empty string on error to not fail the whole process
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
    const levelQuery = query(contentRef, where('type', '==', 'LEVEL'));
    const levelSnapshot = await getDocs(levelQuery);
    const shouldSeedLevels = levelSnapshot.empty;
    try {
        await runTransaction(db, async (transaction) => {
            // Seed full academic structure only if no levels exist
            if (shouldSeedLevels) {
                console.log("No levels found. Seeding initial academic structure.");
                seedData.forEach((item, index) => {
                    if (item.id !== telegramInbox.id) { // Don't seed inbox here
                       const docRef = doc(contentRef, item.id);
                       transaction.set(docRef, { ...item, order: index, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
                    }
                });
            } else {
                 console.log("Levels already exist. Skipping academic structure seed.");
            }
            // Always check for the Telegram Inbox folder and create if it doesn't exist
            const inboxRef = doc(contentRef, telegramInbox.id);
            const inboxDoc = await transaction.get(inboxRef);
            if (!inboxDoc.exists()) {
                console.log("Telegram Inbox not found. Creating it now.");
                transaction.set(inboxRef, { ...telegramInbox, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
            }
        });
        console.log('Data seeding check completed.');
    } catch (e: any) {
        if (e.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: '/content (batch write)',
                operation: 'write',
                requestResourceData: { note: "Seeding multiple documents" }
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
            console.error("Error during data seeding transaction:", e);
        }
        // Don't re-throw, as this shouldn't block the app load
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
  async createInteractiveFlashcard(parentId: string | null): Promise<Content> {
    if (!db) throw new Error("Firestore not initialized");
    const newId = uuidv4();
    const newRef = doc(db, 'content', newId);
    return runTransaction(db, async (transaction) => {
      const childrenQuery = query(collection(db, 'content'), where('parentId', '==', parentId));
      const childrenSnapshot = await getDocs(childrenQuery);
      const order = childrenSnapshot.size;
      const newContentData: Content = {
        id: newId,
        name: 'New Flashcards',
        type: 'INTERACTIVE_FLASHCARD',
        parentId: parentId,
        metadata: {
          quizData: JSON.stringify([{
            id: `l${Date.now()}`,
            name: 'New Lecture',
            flashcards: []
          }]),
          sourceFileId: '',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        order: order,
      };
      transaction.set(newRef, newContentData);
      return newContentData;
    });
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
      let contentName: string;
     
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
                      quizData: JSON.stringify([newLectureData], null, 2),
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
        const folder = 'content';
        const timestamp = Math.floor(Date.now() / 1000);
       
        const paramsToSign = {
            timestamp: timestamp,
            folder: folder
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
        const { signature, apiKey, cloudName } = await sigResponse.json();
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', apiKey);
        formData.append('timestamp', String(timestamp));
        formData.append('signature', signature);
        formData.append('folder', folder);
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
                 callbacks.onError(new Error(`Cloudinary upload failed: ${xhr.statusText}`));
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
    async uploadUserAvatar(user: UserProfile, file: File, onProgress: (progress: number) => void): Promise<{ publicId: string, url: string }> {
        const folder = `avatars/${user.id}`;
        const public_id = `${folder}/${uuidv4()}`;
        const timestamp = Math.floor(Date.now() / 1000);
        const paramsToSign = { public_id, folder, timestamp };
        const sigResponse = await fetch('/api/sign-cloudinary-params', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paramsToSign })
        });
        if (!sigResponse.ok) throw new Error('Failed to get signature.');
        const { signature, apiKey, cloudName } = await sigResponse.json();
        // Delete old avatar if it exists
        if (user.photoURL && user.metadata?.cloudinaryPublicId) {
            await this.deleteCloudinaryAsset(user.metadata.cloudinaryPublicId, 'image');
        }
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const formData = new FormData();
            formData.append('file', file);
            formData.append('api_key', apiKey);
            formData.append('timestamp', String(timestamp));
            formData.append('signature', signature);
            formData.append('public_id', public_id);
            formData.append('folder', folder);
            xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    onProgress((event.loaded / event.total) * 100);
                }
            };
           
            xhr.onload = async () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    const data = JSON.parse(xhr.responseText);
                    const finalUrl = createProxiedUrl(data.secure_url);
                    await updateDoc(doc(db, 'users', user.id), {
                        photoURL: finalUrl,
                        'metadata.cloudinaryPublicId': data.public_id,
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
    async deleteUserAvatar(user: UserProfile) {
        if (!user.metadata?.cloudinaryPublicId) return;
        await this.deleteCloudinaryAsset(user.metadata.cloudinaryPublicId, 'image');
        await updateDoc(doc(db, 'users', user.id), {
            photoURL: null,
            'metadata.cloudinaryPublicId': null
        });
    },
    async uploadUserCoverPhoto(user: UserProfile, file: File, onProgress: (progress: number) => void): Promise<{ publicId: string, url: string }> {
        const folder = `covers/${user.id}`;
        const public_id = `${folder}/${uuidv4()}`;
        const timestamp = Math.floor(Date.now() / 1000);
        const paramsToSign = { public_id, folder, timestamp };
        const sigResponse = await fetch('/api/sign-cloudinary-params', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paramsToSign })
        });
        if (!sigResponse.ok) throw new Error('Failed to get signature.');
        const { signature, apiKey, cloudName } = await sigResponse.json();
        if (user.metadata?.coverPhotoCloudinaryPublicId) {
            await this.deleteCloudinaryAsset(user.metadata.coverPhotoCloudinaryPublicId, 'image');
        }
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const formData = new FormData();
            formData.append('file', file);
            formData.append('api_key', apiKey);
            formData.append('timestamp', String(timestamp));
            formData.append('signature', signature);
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
        const existingItem = itemSnap.data() as Content;
        const oldPublicId = existingItem.metadata?.iconCloudinaryPublicId;
        if (oldPublicId) {
            await this.deleteCloudinaryAsset(oldPublicId, 'image');
        }
        const folder = 'icons';
        const public_id = `${folder}/${uuidv4()}`;
        const timestamp = Math.floor(Date.now() / 1000);
        const paramsToSign = { public_id, folder, timestamp };
        const sigResponse = await fetch('/api/sign-cloudinary-params', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paramsToSign })
        });
        if (!sigResponse.ok) throw new Error(`Failed to get Cloudinary signature: ${sigResponse.statusText}`);
       
        const { signature, apiKey, cloudName } = await sigResponse.json();
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
    try {
      const parentId = itemToUpdate.parentId;
     
      await this.delete(itemToUpdate.id);
     
      return await this.createFile(parentId, newFile, callbacks, { order: itemToUpdate.order });
    } catch (e: any) {
      console.error("Update (delete and replace) failed:", e);
      callbacks.onError(e);
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
                await cacheService.deleteFile(url);
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
  }
};
