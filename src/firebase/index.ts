'use client';

import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { 
  getFirestore, 
  Firestore, 
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth, Auth } from 'firebase/auth';

// Re-export provider hooks
export { useFirebase } from './provider';
export { useCollection, useMemoFirebase } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';

// Initialize db as a variable that can be exported.
export let db: Firestore;
export let auth: Auth;

let firebaseInitialized = false;

export async function initializeFirebase(config: FirebaseOptions) {
  if (firebaseInitialized) {
    const app = getApp();
    return { app, auth, db, storage: getStorage(app) };
  }
  
  const apps = getApps();
  const app = !apps.length ? initializeApp(config) : getApp();
  
  // Use getFirestore() which is idempotent and handles initialization complexities.
  db = getFirestore(app);
  auth = getAuth(app);
  const storage = getStorage(app);

  firebaseInitialized = true;

  return { app, auth, db, storage };
}
