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
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.authDomain) {
        console.error("Firebase config is not fully set. Please check your .env.local file for all NEXT_PUBLIC_FIREBASE_* variables.");
        // Try to construct authDomain from projectId if it's missing
        if(firebaseConfig.projectId && !firebaseConfig.authDomain) {
            console.log(`Attempting to construct authDomain from projectId: ${firebaseConfig.projectId}.firebaseapp.com`);
            return {
                ...firebaseConfig,
                authDomain: `${firebaseConfig.projectId}.firebaseapp.com`
            }
        }
        return {};
    }
    return firebaseConfig;
}
