
'use client';

import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

let db: any;

export async function initializeFirebase(config: FirebaseOptions) {
  const apps = getApps();
  const app = !apps.length ? initializeApp(config) : getApp();
  const auth = getAuth(app);
  db = getFirestore(app);

  if (process.env.NEXT_PUBLIC_USE_EMULATOR === 'true') {
    const host = process.env.NEXT_PUBLIC_EMULATOR_HOST || '127.0.0.1';
    // It's important to check if the emulators are already connected
    // to avoid re-connecting on every hot-reload in development.
    if (!(auth as any).emulatorConfig) {
        connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    }
    if (!(db as any)._settings.host) {
        connectFirestoreEmulator(db, host, 8080);
    }
  }

  // Ensure user is signed in anonymously
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
