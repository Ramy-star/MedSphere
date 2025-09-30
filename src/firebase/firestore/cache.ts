
'use client';
import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'medsphere-cache-db';
const STORE_NAME = 'firestore-cache';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'key' });
                }
            },
        });
    }
    return dbPromise;
}

export async function saveToCache<T>(key: string, data: T): Promise<void> {
    try {
        const db = await getDb();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        await store.put({ key, data, timestamp: Date.now() });
        await tx.done;
    } catch (error) {
        console.error('Failed to save to IndexedDB cache:', error);
    }
}

export async function getFromCache<T>(key: string): Promise<T | null> {
    try {
        const db = await getDb();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const result = await store.get(key);
        await tx.done;
        return result ? result.data : null;
    } catch (error) {
        console.error('Failed to get from IndexedDB cache:', error);
        return null;
    }
}

export async function clearCache(): Promise<void> {
    try {
        const db = await getDb();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        await store.clear();
        await tx.done;
    } catch (error) {
        console.error('Failed to clear IndexedDB cache:', error);
    }
}
