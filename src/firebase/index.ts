
'use client';

import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  Firestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Re-export provider hooks
export { useFirebase } from './provider';
export { useUser } from './auth/use-user';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';

// Initialize db as a variable that can be exported.
export let db: Firestore;

export async function initializeFirebase(config: FirebaseOptions) {
  const apps = getApps();
  const app = !apps.length ? initializeApp(config) : getApp();
  const auth = getAuth(app);
  
  if (!db) { // Check if db is already initialized
    if (typeof window !== 'undefined') {
      try {
        db = initializeFirestore(app, {
            localCache: persistentLocalCache({
                tabManager: persistentMultipleTabManager()
            })
        });
        console.log("Firestore initialized with multi-tab persistence.");
      } catch (err: any) {
        console.error("Firestore multi-tab initialization failed, falling back.", err);
        // Fallback to in-memory persistence if multi-tab fails
        db = getFirestore(app);
      }
    } else {
      // For server-side rendering, just get the instance without persistence.
      db = getFirestore(app);
    }
  }
  
  const storage = getStorage(app);

  return { app, auth, db, storage };
}
