
'use client';

// This function is used to ensure that the config is only accessed on the client-side.
export function getFirebaseConfig() {
    if (typeof window === "undefined") {
        // Return a dummy config for server-side rendering to avoid errors
        return { projectId: "server-side-dummy" };
    }
    
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
    
    // Simple validation
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        throw new Error("Firebase config is not set. Please check your .env file.");
    }
    return firebaseConfig;
}
