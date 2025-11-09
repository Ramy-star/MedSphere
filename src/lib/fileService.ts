'use client';

import { db } from '@/firebase';
import { collection, writeBatch, query, where, getDocs, orderBy, doc, setDoc, getDoc, updateDoc, runTransaction, increment, deleteDoc as deleteFirestoreDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { nanoid } from 'nanoid';
import { offlineStorage } from './offline';
import * as pdfjs from 'pdfjs-dist';
import { contentService as serverContentService, type Content } from './contentService';
import type { UserProfile } from '@/stores/auth-store';

if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

export type UploadCallbacks = {
  onProgress: (progress: number) => void;
  onSuccess: (content: Content) => void;
  onError: (error: Error) => void;
};


function createProxiedUrl(secureUrl: string): string {
    const workerBase = process.env.NEXT_PUBLIC_FILES_BASE_URL;
    if (!workerBase) {
        return secureUrl;
    }
    try {
        const urlObject = new URL(secureUrl);
        const pathParts = urlObject.pathname.split('/');
        const pathAfterCloudName = pathParts.slice(2).join('/');
       
        const cleanWorkerBase = workerBase.endsWith('/') ? workerBase.slice(0, -1) : workerBase;
        return `${cleanWorkerBase}/${pathAfterCloudName}`;
    } catch (error) {
        console.error("Error creating proxied URL, falling back to direct URL:", error);
        return secureUrl;
    }
}

export const fileService = {
    async getFileContent(url: string, fileId?: string): Promise<Blob> {
        const isOnline = true; 
    
        if (!isOnline) {
            throw new Error("You are offline and the file is not available in the cache.");
        }
    
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch file from network: ${response.statusText}`);
            }
            const blob = await response.blob();
            return blob;
        } catch (error) {
            throw error;
        }
    },
    
    async extractTextFromPdf(pdfOrBlob: pdfjs.PDFDocumentProxy | Blob): Promise<string> {
        let pdf: pdfjs.PDFDocumentProxy;
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
        }
    },

    async deleteFileFromCache(fileId: string): Promise<void> {
    },

    createProxiedUrl: createProxiedUrl,

  createFile: async (parentId: string | null, file: File, callbacks: UploadCallbacks, extraMetadata: { [key: string]: any } = {}): Promise<XMLHttpRequest> => {
    const xhr = new XMLHttpRequest();
    try {
        const folder = 'content';
        const public_id = `${folder}/${nanoid()}`;
        const paramsToSign = { folder, public_id };

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
        formData.append('folder', paramsToSign.folder);
        formData.append('public_id', paramsToSign.public_id);
        formData.append('timestamp', String(timestamp));

        xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`);
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) callbacks.onProgress((event.loaded / event.total) * 100);
        };
        xhr.onload = async () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                const data = JSON.parse(xhr.responseText);
                const q = query(collection(db, 'content'), where('metadata.cloudinaryPublicId', '==', data.public_id), where('parentId', '==', parentId));
                const existingDocs = await getDocs(q);
                if (!existingDocs.empty) {
                    callbacks.onSuccess(existingDocs.docs[0].data() as Content);
                    return;
                }
                const id = uuidv4();
                const children = await serverContentService.getChildren(parentId);
                const finalFileUrl = createProxiedUrl(data.secure_url);
                const mimeType = file.type || (file.name.endsWith('.md') ? 'text/markdown' : 'application/octet-stream');
                const fileNameWithoutExt = file.name.endsWith('.md') ? file.name.slice(0, -3) : file.name;
                const newFileContent: Content = {
                    id, name: fileNameWithoutExt, type: 'FILE', parentId: parentId,
                    metadata: {
                        size: data.bytes, mime: mimeType, storagePath: finalFileUrl,
                        cloudinaryPublicId: data.public_id, cloudinaryResourceType: 'raw', ...extraMetadata
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
        xhr.onerror = () => callbacks.onError(new Error('Network error during upload.'));
        xhr.onabort = () => console.log("Upload aborted by user.");
        xhr.send(formData);
    } catch(e: any) {
        callbacks.onError(e);
    }
    return xhr;
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
        batch.delete(doc(db, 'content', itemToUpdate.id));
        await batch.commit();
        if (oldFilePublicId) {
            await fileService.deleteCloudinaryAsset(oldFilePublicId, oldFileResourceType);
        }
        return await fileService.createFile(parentId, newFile, callbacks, { order: itemToUpdate.order });
    } catch (e: any) {
        console.error("Update (delete and replace) failed:", e);
        callbacks.onError(e);
    }
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
            try {
                await fileService.deleteCloudinaryAsset(oldPublicId, 'image');
            } catch(e) {
                console.warn("Failed to delete old icon, proceeding with upload:", e);
            }
        }
        const folder = 'icons';
        const public_id = `${folder}/${uuidv4()}`;
        const paramsToSign = { public_id, folder };
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
       console.error("Icon update failed:", e);
       callbacks.onError(e);
       throw e;
    }
  },

  async uploadUserAvatar(user: UserProfile, file: File, onProgress: (progress: number) => void, folderName: string = 'avatars'): Promise<{ publicId: string, url: string }> {
      if (folderName === 'avatars' && user.metadata?.cloudinaryPublicId) {
          try {
              await fileService.deleteCloudinaryAsset(user.metadata.cloudinaryPublicId, 'image');
          } catch (e) {
              console.warn("Failed to delete old avatar, proceeding with upload:", e);
          }
      }
      const folder = `${folderName}/${user.id}`;
      const public_id = `${folder}/${nanoid()}`;
      const paramsToSign = { public_id, folder };
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
              if (event.lengthComputable) onProgress((event.loaded / event.total) * 100);
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
      if (user.metadata?.coverPhotoCloudinaryPublicId) {
          try {
              await this.deleteCloudinaryAsset(user.metadata.coverPhotoCloudinaryPublicId, 'image');
          } catch (e) {
              console.warn("Failed to delete old cover photo, proceeding with upload:", e);
          }
      }
      const folder = `covers/${user.id}`;
      const public_id = `${folder}/${uuidv4()}`;
      const paramsToSign = { public_id, folder };
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

  async uploadNoteImage(file: File): Promise<string> {
    const folder = `notes_images`;
    const public_id = `${folder}/${nanoid()}`;
    const paramsToSign = { public_id, folder };
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
    if (!uploadResponse.ok) throw new Error('Cloudinary image upload failed.');
    const data = await uploadResponse.json();
    return createProxiedUrl(data.secure_url);
  },
};
