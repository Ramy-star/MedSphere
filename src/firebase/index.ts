
'use client';

import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

// Re-export provider hooks
export { useFirebase } from './provider';

// Initialize db as a variable that can be exported.
export let db: Firestore;

const EMULATORS_STARTED = 'EMULATORS_STARTED';
function startEmulators(auth: any, db: any, storage: any) {
    // @ts-ignore
    if (global[EMULATORS_STARTED]) {
        return;
    }
    // @ts-ignore
    global[EMULATORS_STARTED] = true;
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectStorageEmulator(storage, "127.0.0.1", 9199);
}


export async function initializeFirebase(config: FirebaseOptions) {
  const apps = getApps();
  const app = !apps.length ? initializeApp(config) : getApp();
  const auth = getAuth(app);
  db = getFirestore(app);
  
  // Enable offline persistence
  if (typeof window !== 'undefined') {
    try {
        await enableIndexedDbPersistence(db);
        console.log("Firestore offline persistence enabled.");
    } catch (err: any) {
        if (err.code === 'failed-precondition') {
            console.warn('Firestore persistence failed: Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code === 'unimplemented') {
            console.warn('Firestore persistence is not available in this browser.');
        }
    }
  }
  
  const storage = getStorage(app);

  if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_USE_EMULATORS === "true") {
      startEmulators(auth, db, storage);
  }

  return { app, auth, db, storage };
}
