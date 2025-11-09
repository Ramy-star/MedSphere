'use client';

import { offlineStorage } from './offline';
import * as pdfjs from 'pdfjs-dist';

if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

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
            // Don't re-throw, as this is a cleanup operation and shouldn't block the main flow.
        }
    },

    async deleteFileFromCache(fileId: string): Promise<void> {
        await offlineStorage.deleteFile(fileId);
    },

    createProxiedUrl
}
