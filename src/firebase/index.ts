
'use client';

import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { 
  getFirestore, 
  Firestore, 
  initializeFirestore, 
  persistentLocalCache,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Re-export provider hooks
export { useFirebase } from './provider';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';

// Initialize db as a variable that can be exported.
export let db: Firestore;

export async function initializeFirebase(config: FirebaseOptions) {
  const apps = getApps();
  const app = !apps.length ? initializeApp(config) : getApp();
  
  if (!db) { // Check if db is already initialized
    if (typeof window !== 'undefined') {
      try {
        db = initializeFirestore(app, {
            localCache: persistentLocalCache()
        });
        console.log("Firestore initialized with persistent cache.");
      } catch (err: any) {
        console.error("Firestore persistence initialization failed, falling back.", err);
        // Fallback to in-memory persistence if it fails
        db = getFirestore(app);
      }
    } else {
      // For server-side rendering, just get the instance without persistence.
      db = getFirestore(app);
    }
  }
  
  const storage = getStorage(app);

  // Return a dummy auth object to prevent breaking the app structure
  const auth = { onAuthStateChanged: () => () => {} };

  return { app, auth, db, storage };
}
