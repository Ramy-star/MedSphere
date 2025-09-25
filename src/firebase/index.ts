'use client';

import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Re-export hooks
export { useFirebase } from './provider';

// Initialize db as a variable that can be exported.
export let db: Firestore;

export async function initializeFirebase(config: FirebaseOptions) {
  const apps = getApps();
  const app = !apps.length ? initializeApp(config) : getApp();
  const auth = getAuth(app);
  db = getFirestore(app);
  
  // Try to sign in anonymously, but don't let it block initialization.
  // This helps debug if the issue is with auth setup in the Firebase console.
  try {
    await signInAnonymously(auth);
    console.log("Signed in anonymously");
  } catch (error) {
    console.error("Anonymous sign-in failed. Please ensure it's enabled in the Firebase console.", error);
    // We don't re-throw the error, allowing the app to initialize.
    // Data-related operations will likely fail due to security rules.
  }

  return { app, auth, db };
}
