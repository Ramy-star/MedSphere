
'use client';
import { db } from '@/firebase';
import { collection, writeBatch, query, where, getDocs, orderBy, doc, setDoc, getDoc, updateDoc, runTransaction, serverTimestamp, increment, deleteDoc } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { allContent as seedData } from './file-data';
import { v4 as uuidv4 } from 'uuid';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


export type Content = {
  id: string;
  name: string;
  type: 'LEVEL' | 'SEMESTER' | 'SUBJECT' | 'FOLDER' | 'FILE';
  parentId: string | null;
  metadata?: {
    size?: number;
    mime?: string;
    storagePath?: string;
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


export async function seedInitialData() {
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
}


export const contentService = {
  async getChildren(parentId: string | null): Promise<Content[]> {
    if (!db) return [];
    const q = query(collection(db, 'content'), where('parentId', '==', parentId), orderBy('order'));
    const snapshot = await getDocs(q);
    const children = snapshot.docs.map(doc => doc.data() as Content);
    return children;
  },

  async createFolder(parentId: string | null, name: string): Promise<Content> {
    if (!db) throw new Error("Firestore not initialized");

    const newFolderId = `folder_${uuidv4()}`;
    const newFolderRef = doc(db, 'content', newFolderId);
    let newFolderData: Content | null = null;

    try {
      await runTransaction(db, async (transaction) => {
        const childrenQuery = query(collection(db, 'content'), where('parentId', '==', parentId));
        const childrenSnapshot = await transaction.get(childrenQuery);
        const order = childrenSnapshot.size;

        newFolderData = {
          id: newFolderId,
          name: name,
          type: 'FOLDER',
          parentId: parentId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          order: order,
        };

        transaction.set(newFolderRef, newFolderData);
      });
      
      if (!newFolderData) throw new Error("Folder creation failed within transaction.");
      return newFolderData;

    } catch (e: any) {
      if (e.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `/content/${newFolderId}`,
            operation: 'create',
            requestResourceData: { name, parentId },
        }));
      }
      console.error("Transaction failed: ", e);
      throw e;
    }
  },

  uploadFile(parentId: string | null, file: File, callbacks: UploadCallbacks) {
    if (!db) {
        const err = new Error("Firestore not initialized");
        callbacks.onError(err);
        return;
    }

    const storage = getStorage();
    const id = `file_${uuidv4()}`;
    const filePath = `files/${parentId || 'root'}/${id}_${file.name}`;
    const fileStorageRef = storageRef(storage, filePath);

    const uploadTask = uploadBytesResumable(fileStorageRef, file);

    uploadTask.on('state_changed',
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            callbacks.onProgress(progress);
        },
        (error) => {
            console.error("Upload failed:", error);
            callbacks.onError(error);
        },
        async () => {
            try {
                const children = await this.getChildren(parentId);
                const order = children.length;

                const newFileContent: Content = {
                    id,
                    name: file.name,
                    type: 'FILE',
                    parentId: parentId,
                    metadata: {
                        size: file.size,
                        mime: file.type,
                        storagePath: filePath,
                    },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    order: order
                };
                
                await setDoc(doc(db, 'content', id), newFileContent);
                callbacks.onSuccess(newFileContent);

            } catch(e: any) {
                if (e.code === 'permission-denied') {
                    errorEmitter.emit('permission-error', new FirestorePermissionError({
                        path: `/content/${id}`,
                        operation: 'create',
                        requestResourceData: { name: file.name },
                    }));
                }
                callbacks.onError(e);
            }
        }
    );
  },

  async updateFile(id: string, file: File): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");
    const docRef = doc(db, 'content', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists() || docSnap.data().type !== 'FILE') {
        throw new Error("File not found or invalid type");
    }

    const content = docSnap.data() as Content;
    const storage = getStorage();
    const filePath = content.metadata?.storagePath || `files/${content.parentId || 'root'}/${id}_${file.name}`;
    const fileStorageRef = storageRef(storage, filePath);

    const uploadTask = uploadBytesResumable(fileStorageRef, file);
    
    return new Promise((resolve, reject) => {
        uploadTask.on('state_changed', 
            () => {}, // progress can be handled here if needed
            (error) => {
                console.error("File update upload failed:", error);
                reject(error);
            },
            async () => {
                try {
                    const updatedMetadata = {
                        size: file.size,
                        mime: file.type,
                        storagePath: filePath,
                    };
                    await updateDoc(docRef, {
                        metadata: updatedMetadata,
                        updatedAt: new Date().toISOString()
                    });
                    resolve();
                } catch(e: any) {
                     if (e.code === 'permission-denied') {
                        errorEmitter.emit('permission-error', new FirestorePermissionError({
                            path: `/content/${id}`,
                            operation: 'update',
                            requestResourceData: { metadata: updatedMetadata },
                        }));
                    }
                    reject(e);
                }
            }
        );
    });
  },
  
  async getById(id: string): Promise<Content | null> {
    if (!db) return null;
    if (id === 'root') {
      return { id: 'root', name: 'Home', type: 'FOLDER', parentId: null };
    }
    const docRef = doc(db, 'content', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() as Content : null;
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

  async delete(id: string): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");

    try {
        await runTransaction(db, async (transaction) => {
            const allContentSnapshot = await getDocs(collection(db, 'content'));
            const allContent = allContentSnapshot.docs.map(d => d.data() as Content);
            const storage = getStorage();

            const itemsToDelete: Content[] = [];
            const visited = new Set<string>();

            function findRecursively(idToDelete: string) {
                if(visited.has(idToDelete)) return;
                visited.add(idToDelete);
                
                const item = allContent.find(x => x.id === idToDelete);
                if (item) {
                    itemsToDelete.push(item);
                    const children = allContent.filter(x => x.parentId === idToDelete);
                    children.forEach(child => findRecursively(child.id));
                }
            }
            findRecursively(id);

            for (const item of itemsToDelete) {
                const docRef = doc(db, 'content', item.id);
                transaction.delete(docRef);

                if (item.type === 'FILE' && item.metadata?.storagePath) {
                    const fileRef = storageRef(storage, item.metadata.storagePath);
                    // Non-transactional, but best effort.
                    // If this fails, the file becomes an orphan.
                    await deleteObject(fileRef).catch(err => {
                        // Ignore 'object-not-found' error
                        if (err.code !== 'storage/object-not-found') {
                           console.error(`Failed to delete file ${item.metadata?.storagePath}:`, err);
                        }
                    });
                }
            }
        });
    } catch (e: any) {
        if (e.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: `/content (transactional delete starting from ${id})`,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
            console.error(`Transaction failed: ${e.message}`);
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

    
    