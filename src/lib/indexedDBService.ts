
'use client';
// This file is kept for potential future use or for a hybrid storage approach,
// but the app now primarily relies on Firebase for data persistence.
import { openDB, DBSchema, IDBPDatabase } from 'idb';

const DB_NAME = 'MedicalStudyHubDB_DEPRECATED'; // Renamed to avoid conflicts
const DB_VERSION = 1;
const STORE_NAME = 'files';

interface MyDB extends DBSchema {
  [STORE_NAME]: {
    key: string;
    value: File;
  };
}

let dbPromise: Promise<IDBPDatabase<MyDB>> | null = null;

if (typeof window !== 'undefined') {
    dbPromise = openDB<MyDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        },
    });
}


export async function saveFile(id: string, file: File) {
    console.warn("IndexedDB is deprecated. Use Firebase Storage instead.");
    if (!dbPromise) return;
    const db = await dbPromise;
    await db.put(STORE_NAME, file, id);
}

export async function getFile(id: string): Promise<File | undefined> {
    console.warn("IndexedDB is deprecated. Use Firebase Storage instead.");
    if (!dbPromise) return undefined;
    const db = await dbPromise;
    return db.get(STORE_NAME, id);
}

export async function deleteFile(id: string) {
    console.warn("IndexedDB is deprecated. Use Firebase Storage instead.");
    if (!dbPromise) return;
    const db = await dbPromise;
    await db.delete(STORE_NAME, id);
}
