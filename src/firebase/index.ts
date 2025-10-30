'use client';

import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { 
  getFirestore, 
  Firestore, 
  initializeFirestore, 
  persistentLocalCache,
  memoryLocalCache
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth, Auth } from 'firebase/auth';

// Re-export provider hooks
export { useFirebase } from './provider';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';

// Initialize db as a variable that can be exported.
export let db: Firestore;
export let auth: Auth;

let dbInitialized = false;

export async function initializeFirebase(config: FirebaseOptions) {
  const apps = getApps();
  const app = !apps.length ? initializeApp(config) : getApp();
  
  if (!dbInitialized) { // Check if db is already initialized
    if (typeof window !== 'undefined') {
      try {
        db = initializeFirestore(app, {
            localCache: persistentLocalCache()
        });
        console.log("Firestore initialized with persistent cache.");
      } catch (err: any) {
        console.error("Firestore persistence initialization failed, falling back to in-memory.", err);
        // Fallback to in-memory persistence if it fails
        try {
            db = initializeFirestore(app, { localCache: memoryLocalCache() });
        } catch (e) {
            db = getFirestore(app);
        }
      }
    } else {
      // For server-side rendering, just get the instance without persistence.
      db = getFirestore(app);
    }
    dbInitialized = true;
  }
  
  auth = getAuth(app);
  const storage = getStorage(app);

  return { app, auth, db, storage };
}
