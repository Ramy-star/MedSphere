
'use client';

import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'MedSphereFileCache';
const STORE_NAME = 'file-cache';
const DB_VERSION = 1;

class CacheService {
    private dbPromise: Promise<IDBPDatabase>;

    constructor() {
        this.dbPromise = openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            },
        });
    }

    async getFile(key: string): Promise<Blob | undefined> {
        try {
            const db = await this.dbPromise;
            return await db.get(STORE_NAME, key);
        } catch (error) {
            console.error('Failed to get file from IndexedDB:', error);
            return undefined;
        }
    }

    async saveFile(key: string, file: Blob): Promise<void> {
        try {
            const db = await this.dbPromise;
            await db.put(STORE_NAME, file, key);
        } catch (error) {
            console.error('Failed to save file to IndexedDB:', error);
            // Don't re-throw, as caching is a non-critical operation
        }
    }
    
    async deleteFile(key: string): Promise<void> {
        try {
            const db = await this.dbPromise;
            await db.delete(STORE_NAME, key);
        } catch (error) {
            console.error('Failed to delete file from IndexedDB:', error);
        }
    }

    async clearCache(): Promise<void> {
        try {
            const db = await this.dbPromise;
            await db.clear(STORE_NAME);
            console.log('File cache cleared.');
        } catch (error) {
            console.error('Failed to clear IndexedDB cache:', error);
        }
    }
}

export const cacheService = new CacheService();

// Expose a function to clear cache from browser console for debugging
if (typeof window !== 'undefined') {
    (window as any).clearFileCache = () => cacheService.clearCache();
}
