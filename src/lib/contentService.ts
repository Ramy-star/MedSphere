
'use client';
import { db } from '@/firebase';
import { collection, writeBatch, query, where, getDocs, orderBy, doc, setDoc, getDoc, updateDoc, runTransaction, serverTimestamp, increment, deleteDoc as deleteFirestoreDoc, collectionGroup } from 'firebase/firestore';
import { allContent as seedData } from './file-data';
import { v4 as uuidv4 } from 'uuid';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { sha256file } from './hashFile';
import { nanoid } from 'nanoid';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { cacheService } from './cacheService';


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

    async extractTextFromPdf(pdf: PDFDocumentProxy): Promise<string> {
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
      const snapshot = await getDocs(query(contentRef, where('type', '==', 'LEVEL')));
  
      if (!snapshot.empty) {
          console.log("Content collection already has levels. Skipping seed.");
          return;
      }
  
      try {
          await runTransaction(db, async (transaction) => {
              seedData.forEach((item, index) => {
                  const docRef = doc(contentRef, item.id);
                  transaction.set(docRef, { ...item, order: index, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
              });
          });
          console.log('Initial data seeded successfully.');
      } catch (e: any) {
          if (e.code === 'permission-denied') {
              const permissionError = new FirestorePermissionError({
                  path: '/content (batch write)',
                  operation: 'write',
                  requestResourceData: { note: "Seeding multiple documents" }
              });
              errorEmitter.emit('permission-error', permissionError);
          } else {
              console.error("Error seeding data:", e);
          }
          throw e;
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

  async createInteractiveQuiz(parentId: string, name: string, quizData: string, sourceFileId: string): Promise<Content> {
    if (!db) throw new Error("Firestore not initialized");

    const newQuizId = uuidv4();
    const newQuizRef = doc(db, 'content', newQuizId);
    let newQuizData: Content | null = null;
    const originalFileName = name.replace(/\.[^/.]+$/, "");

    try {
        await runTransaction(db, async (transaction) => {
            const childrenQuery = query(collection(db, 'content'), where('parentId', '==', parentId));
            const childrenSnapshot = await getDocs(childrenQuery);
            const order = childrenSnapshot.size;

            newQuizData = {
                id: newQuizId,
                name: `${originalFileName} - Quiz`,
                type: 'INTERACTIVE_QUIZ',
                parentId: parentId,
                metadata: {
                    quizData,
                    sourceFileId,
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                order: order,
            };

            transaction.set(newQuizRef, newQuizData);
        });

        if (!newQuizData) throw new Error("Quiz creation failed within transaction.");
        return newQuizData;

    } catch (e: any) {
        if (e && e.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: `/content/${newQuizId}`,
                operation: 'create',
                requestResourceData: { name: `${originalFileName} - Quiz`, parentId, type: 'INTERACTIVE_QUIZ' },
            }));
        } else {
            console.error("Transaction failed: ", e);
        }
        throw e;
    }
  },

  async createInteractiveExam(parentId: string, name: string, examData: string, sourceFileId: string): Promise<Content> {
    if (!db) throw new Error("Firestore not initialized");

    const newExamId = uuidv4();
    const newExamRef = doc(db, 'content', newExamId);
    let newExamData: Content | null = null;
    const originalFileName = name.replace(/\.[^/.]+$/, "");

    try {
        await runTransaction(db, async (transaction) => {
            const childrenQuery = query(collection(db, 'content'), where('parentId', '==', parentId));
            const childrenSnapshot = await getDocs(childrenQuery);
            const order = childrenSnapshot.size;

            newExamData = {
                id: newExamId,
                name: `${originalFileName} - Exam`,
                type: 'INTERACTIVE_EXAM',
                parentId: parentId,
                metadata: {
                    quizData: examData,
                    sourceFileId,
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                order: order,
            };

            transaction.set(newExamRef, newExamData);
        });

        if (!newExamData) throw new Error("Exam creation failed within transaction.");
        return newExamData;

    } catch (e: any) {
        if (e && e.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: `/content/${newExamId}`,
                operation: 'create',
                requestResourceData: { name: `${originalFileName} - Exam`, parentId, type: 'INTERACTIVE_EXAM' },
            }));
        } else {
            console.error("Transaction failed: ", e);
        }
        throw e;
    }
  },

  async createInteractiveFlashcard(parentId: string | null, name: string, flashcardData: string, sourceFileId: string): Promise<Content> {
    if (!db) throw new Error("Firestore not initialized");

    const newFlashcardId = uuidv4();
    const newFlashcardRef = doc(db, 'content', newFlashcardId);
    let newFlashcardData: Content | null = null;
    const originalFileName = name.replace(/\.[^/.]+$/, "");

    try {
        await runTransaction(db, async (transaction) => {
            const childrenQuery = parentId ? query(collection(db, 'content'), where('parentId', '==', parentId)) : query(collection(db, 'content'), where('parentId', '==', null));
            const childrenSnapshot = await getDocs(childrenQuery);
            const order = childrenSnapshot.size;

            newFlashcardData = {
                id: newFlashcardId,
                name: name === "New Flashcards" ? name : `${originalFileName} - Flashcards`,
                type: 'INTERACTIVE_FLASHCARD',
                parentId: parentId,
                metadata: {
                    quizData: flashcardData,
                    sourceFileId,
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                order: order,
            };

            transaction.set(newFlashcardRef, newFlashcardData);
        });

        if (!newFlashcardData) throw new Error("Flashcard creation failed within transaction.");
        return newFlashcardData;

    } catch (e: any) {
        if (e && e.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: `/content/${newFlashcardId}`,
                operation: 'create',
                requestResourceData: { name: `${originalFileName} - Flashcards`, parentId, type: 'INTERACTIVE_FLASHCARD' },
            }));
        } else {
            console.error("Transaction failed: ", e);
        }
        throw e;
    }
  },
  
  async createFile(parentId: string | null, file: File, callbacks: UploadCallbacks, extraMetadata: { [key: string]: any } = {}): Promise<XMLHttpRequest> {
    const xhr = new XMLHttpRequest();
    
    try {
        const folder = 'content';
        const timestamp = Math.floor(Date.now() / 1000);
        
        // Only timestamp and folder are needed for a basic signed upload from browser
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
                        ...extraMetadata // Add extra metadata here
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

  async uploadAndSetIcon(itemId: string, iconFile: File, callbacks: Omit<UploadCallbacks, 'onSuccess'> & { onSuccess: (url: string) => void }): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");

    try {
        const itemRef = doc(db, 'content', itemId);
        const itemSnap = await getDoc(itemRef);
        if (!itemSnap.exists()) throw new Error("Item not found");

        const existingItem = itemSnap.data() as Content;
        const oldPublicId = existingItem.metadata?.iconCloudinaryPublicId;

        // If there's an old icon, delete it from Cloudinary first
        if (oldPublicId) {
            console.log(`Deleting old icon: ${oldPublicId}`);
            await fetch('/api/delete-cloudinary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ publicId: oldPublicId, resourceType: 'image' }),
            }).catch(err => console.error("Failed to delete old icon, proceeding with upload anyway:", err)); // Don't block upload if deletion fails
        }

        const hash = await sha256file(iconFile);
        const folder = 'icons';
        const public_id = `${folder}/${hash}`;
        
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
      
      // Step 1: Delete the old file completely
      await this.delete(itemToUpdate.id);
      
      // Step 2: Create the new file, preserving the original order
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

            // Check for cyclical move
            let parentCheckId: string | null = newParentId;
            while (parentCheckId) {
                if (parentCheckId === itemId) {
                    throw new Error("Cannot move a folder into one of its own subfolders.");
                }
                const parentDoc = await transaction.get(doc(db, 'content', parentCheckId));
                parentCheckId = parentDoc.data()?.parentId ?? null;
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

    // This function will be called recursively for folders
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
        
        // We don't copy Cloudinary IDs, as we are not duplicating the actual file in the cloud.
        // The new item will point to the same cloud resource.
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


  async delete(id: string): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");

    const deleteQueue: string[] = [id];
    const visited = new Set<string>([id]);
    const filesToDeleteFromCloudinary: { publicId: string; resourceType: 'image' | 'video' | 'raw'; }[] = [];
    const filesToDeleteFromCache: string[] = [];
    const batch = writeBatch(db);

    try {
        // Step 1: Recursively find all children and collect their IDs
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
        
        // Step 2: For all items to be deleted, collect Cloudinary public IDs, cache keys, and add to delete batch
        const allDocsToDeleteQuery = query(collection(db, "content"), where("id", "in", Array.from(visited)));
        const allDocsSnapshot = await getDocs(allDocsToDeleteQuery);
        
        allDocsSnapshot.forEach(docSnap => {
            const item = docSnap.data() as Content;
            // Collect Cloudinary public IDs for files
            if (item.type === 'FILE' && item.metadata?.cloudinaryPublicId) {
                filesToDeleteFromCloudinary.push({
                    publicId: item.metadata.cloudinaryPublicId,
                    resourceType: item.metadata.cloudinaryResourceType || 'raw'
                });
                if (item.metadata.storagePath) {
                    filesToDeleteFromCache.push(item.metadata.storagePath);
                }
            }
            // Collect Cloudinary public IDs for folder icons
            if ((item.type === 'FOLDER' || item.type === 'SUBJECT') && item.metadata?.iconCloudinaryPublicId) {
                filesToDeleteFromCloudinary.push({
                    publicId: item.metadata.iconCloudinaryPublicId,
                    resourceType: 'image'
                });
                 if (item.metadata.iconURL) {
                    filesToDeleteFromCache.push(item.metadata.iconURL);
                }
            }
            // Add the document to the Firestore delete batch
            batch.delete(docSnap.ref);
        });

        // Step 3: Delete files from Cloudinary via our API route
        if (filesToDeleteFromCloudinary.length > 0) {
            for (const file of filesToDeleteFromCloudinary) {
                const res = await fetch('/api/delete-cloudinary', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(file),
                });
                if (!res.ok) {
                    console.error(`Failed to delete ${file.publicId} from Cloudinary. Status: ${res.status}`);
                }
            }
        }
        
        // Step 4: Delete files from IndexedDB cache
        if (filesToDeleteFromCache.length > 0) {
            for (const url of filesToDeleteFromCache) {
                await cacheService.deleteFile(url);
            }
        }

        // Step 5: Commit the Firestore batch deletion
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
