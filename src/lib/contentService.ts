
'use client';
import { db } from '@/firebase';
import { collection, writeBatch, query, where, getDocs, orderBy, doc, setDoc, getDoc, updateDoc, runTransaction, serverTimestamp, increment, deleteDoc as deleteFirestoreDoc } from 'firebase/firestore';
import { allContent as seedData } from './file-data';
import { v4 as uuidv4 } from 'uuid';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


export type Content = {
  id: string;
  name: string;
  type: 'LEVEL' | 'SEMESTER' | 'SUBJECT' | 'FOLDER' | 'FILE' | 'LINK';
  parentId: string | null;
  metadata?: {
    size?: number;
    mime?: string;
    storagePath?: string; // secure_url from cloudinary
    cloudinaryPublicId?: string; // public_id from cloudinary
    cloudinaryResourceType?: 'image' | 'video' | 'raw'; // resource_type from cloudinary
    url?: string; // For LINK type
  };
  createdAt?: string;
  updatedAt?: string;
  order?: number;
  iconName?: string;
  color?: string;
};

export type UploadCallbacks = {
  onStart: (id: string) => void;
  onProgress: (id: string, progress: number) => void;
  onSuccess: (id: string, content: Content) => void;
  onError: (id: string, error: Error) => void;
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
            requestResourceData: { name, parentId, type: 'FOLDER' },
        }));
      } else {
        console.error("Transaction failed: ", e);
      }
      throw e;
    }
  },

  async createLink(parentId: string | null, name: string, url: string): Promise<Content> {
    if (!db) throw new Error("Firestore not initialized");

    const newLinkId = `link_${uuidv4()}`;
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
  
  async createFile(parentId: string | null, file: File, callbacks: UploadCallbacks): Promise<void> {
    const tempId = `upload_${uuidv4()}`;
    callbacks.onStart(tempId);
    
    try {
        const sigResponse = await fetch('/api/sign-cloudinary-params', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                folder: `content/${parentId || 'root'}`
            })
        });

        if (!sigResponse.ok) {
            throw new Error(`Failed to get Cloudinary signature: ${sigResponse.statusText}`);
        }

        const { signature, timestamp, apiKey, cloudName } = await sigResponse.json();
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', apiKey);
        formData.append('timestamp', timestamp);
        formData.append('signature', signature);
        formData.append('folder', `content/${parentId || 'root'}`);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`);

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const progress = (event.loaded / event.total) * 100;
                callbacks.onProgress(tempId, progress);
            }
        };

        xhr.onload = async () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                const data = JSON.parse(xhr.responseText);
                
                const id = `file_${uuidv4()}`;
                const children = await this.getChildren(parentId);
                const order = children.length;

                const newFileContent: Content = {
                    id,
                    name: file.name,
                    type: 'FILE',
                    parentId: parentId,
                    metadata: {
                        size: data.bytes,
                        mime: file.type || 'application/octet-stream',
                        storagePath: data.secure_url,
                        cloudinaryPublicId: data.public_id,
                        cloudinaryResourceType: data.resource_type,
                    },
                    createdAt: new Date(data.created_at).toISOString(),
                    updatedAt: new Date(data.created_at).toISOString(),
                    order: order
                };
                
                await setDoc(doc(db, 'content', id), newFileContent);
                callbacks.onSuccess(tempId, newFileContent);

            } else {
                 callbacks.onError(tempId, new Error(`Cloudinary upload failed: ${xhr.statusText}`));
            }
        };

        xhr.onerror = () => {
            callbacks.onError(tempId, new Error('Network error during upload.'));
        };
        
        xhr.send(formData);
    } catch(e: any) {
        callbacks.onError(tempId, e);
    }
  },

  async updateFile(id: string, newFile: File, callbacks: UploadCallbacks): Promise<void> {
    const tempId = `upload_${uuidv4()}`;
    callbacks.onStart(tempId);

    const docRef = doc(db, 'content', id);

    try {
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
            throw new Error("File to update does not exist.");
        }
        const existingContent = docSnap.data() as Content;

        const publicId = existingContent.metadata?.cloudinaryPublicId;
        if (!publicId) {
             throw new Error("Cannot update file without a Cloudinary public_id.");
        }

        const sigResponse = await fetch('/api/sign-cloudinary-params', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_id: publicId, overwrite: true })
        });
        
        if (!sigResponse.ok) {
            throw new Error(`Failed to get Cloudinary signature for update: ${sigResponse.statusText}`);
        }
        const { signature, timestamp, apiKey, cloudName } = await sigResponse.json();

        const formData = new FormData();
        formData.append('file', newFile);
        formData.append('api_key', apiKey);
        formData.append('timestamp', timestamp);
        formData.append('signature', signature);
        formData.append('public_id', publicId);
        formData.append('overwrite', 'true');

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`);
        
        xhr.upload.onprogress = (event) => {
             if (event.lengthComputable) {
                const progress = (event.loaded / event.total) * 100;
                callbacks.onProgress(tempId, progress);
            }
        };

        xhr.onload = async () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                const data = JSON.parse(xhr.responseText);
                const updatedData = {
                    name: newFile.name,
                    updatedAt: new Date().toISOString(),
                    metadata: {
                        ...existingContent.metadata,
                        size: data.bytes,
                        mime: newFile.type || 'application/octet-stream',
                        storagePath: data.secure_url,
                        cloudinaryPublicId: data.public_id,
                        cloudinaryResourceType: data.resource_type,
                    },
                };
                await updateDoc(docRef, updatedData);
                callbacks.onSuccess(tempId, { ...existingContent, ...updatedData });
            } else {
                 callbacks.onError(tempId, new Error(`Cloudinary update failed: ${xhr.statusText}`));
            }
        };

         xhr.onerror = () => {
            callbacks.onError(tempId, new Error('Network error during file update.'));
        };

        xhr.send(formData);

    } catch (e: any) {
        callbacks.onError(tempId, e);
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

  async delete(id: string): Promise<void> {
    if (!db) throw new Error("Firestore not initialized");

    type FileToDelete = {
        publicId: string;
        resourceType: 'image' | 'video' | 'raw';
    };

    try {
        await runTransaction(db, async (transaction) => {
            const allContentSnapshot = await getDocs(collection(db, 'content'));
            const allContent = allContentSnapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Content);

            const itemsToDelete: Content[] = [];
            const visited = new Set<string>();
            const filesToDeleteFromCloudinary: FileToDelete[] = [];

            function findRecursively(idToDelete: string) {
                if(visited.has(idToDelete)) return;
                visited.add(idToDelete);
                
                const item = allContent.find(x => x.id === idToDelete);
                if (item) {
                    itemsToDelete.push(item);
                    if (item.type === 'FILE' && item.metadata?.cloudinaryPublicId) {
                        filesToDeleteFromCloudinary.push({
                            publicId: item.metadata.cloudinaryPublicId,
                            resourceType: item.metadata.cloudinaryResourceType || 'raw'
                        });
                    }
                    const children = allContent.filter(x => x.parentId === idToDelete);
                    children.forEach(child => findRecursively(child.id));
                }
            }
            findRecursively(id);

            // Step 1: Delete files from Cloudinary via our API route
            for (const file of filesToDeleteFromCloudinary) {
                 const res = await fetch('/api/delete-cloudinary', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(file),
                });
                if (!res.ok) {
                    // Log the error but continue transaction to delete from Firestore anyway
                    console.error(`Failed to delete ${file.publicId} from Cloudinary. Status: ${res.status}`);
                }
            }

            // Step 2: Delete documents from Firestore
            for (const item of itemsToDelete) {
                const docRef = doc(db, 'content', item.id);
                transaction.delete(docRef);
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

    