
'use client';

import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore }from 'firebase/firestore';

let db: any;

export async function initializeFirebase(config: FirebaseOptions) {
  const apps = getApps();
  const app = !apps.length ? initializeApp(config) : getApp();
  const auth = getAuth(app);
  db = getFirestore(app);

  if (process.env.NEXT_PUBLIC_USE_EMULATOR === 'true') {
    // This logic is commented out but kept for reference
    // const host = process.env.NEXT_PUBLIC_EMULATOR_HOST || '127.0.0.1';
    // if (!(auth as any).emulatorConfig) {
    //     connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    // }
    // if (!(db as any)._settings.host) {
    //     connectFirestoreEmulator(db, host, 8080);
    // }
  }

  // Ensure user is signed in anonymously
  // This requires Anonymous sign-in to be enabled in the Firebase console
  await signInAnonymously(auth);

  return { app, auth, db };
}

export { db };

// Export hooks and providers
export { FirebaseProvider, useFirebase } from './provider';
export { FirebaseClientProvider } from './client-provider';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
export { useUser } from './auth/use-user';
