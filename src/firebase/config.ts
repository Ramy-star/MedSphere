// This function is used to ensure that the config is only accessed on the client-side.
export function getFirebaseConfig() {
    if (typeof window === "undefined") {
        // Return a dummy config for server-side rendering to avoid errors
        return { projectId: "server-side-dummy" };
    }

    console.log('[FIREBASE CONFIG] Loading Firebase configuration...');

    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    // Log which variables are present (without exposing values)
    console.log('[FIREBASE CONFIG] Environment variables status:', {
      apiKey: firebaseConfig.apiKey ? '✓ Set' : '✗ Missing',
      authDomain: firebaseConfig.authDomain ? '✓ Set' : '✗ Missing',
      projectId: firebaseConfig.projectId ? '✓ Set' : '✗ Missing',
      storageBucket: firebaseConfig.storageBucket ? '✓ Set' : '✗ Missing',
      messagingSenderId: firebaseConfig.messagingSenderId ? '✓ Set' : '✗ Missing',
      appId: firebaseConfig.appId ? '✓ Set' : '✗ Missing',
    });

    // Critical validation
    const missingVars = [];
    if (!firebaseConfig.apiKey) missingVars.push('NEXT_PUBLIC_FIREBASE_API_KEY');
    if (!firebaseConfig.projectId) missingVars.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
    if (!firebaseConfig.authDomain) missingVars.push('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');

    if (missingVars.length > 0) {
        console.error('[FIREBASE CONFIG] ✗ Missing critical environment variables:', missingVars);
        console.error('[FIREBASE CONFIG] Please set these variables in Vercel Environment Variables:');
        missingVars.forEach(varName => {
          console.error(`  - ${varName}`);
        });

        // Try to construct authDomain from projectId if it's the only missing one
        if (missingVars.length === 1 && missingVars[0] === 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN' && firebaseConfig.projectId) {
            console.log(`[FIREBASE CONFIG] Attempting to construct authDomain from projectId...`);
            const constructedAuthDomain = `${firebaseConfig.projectId}.firebaseapp.com`;
            console.log(`[FIREBASE CONFIG] Using constructed authDomain: ${constructedAuthDomain}`);
            return {
                ...firebaseConfig,
                authDomain: constructedAuthDomain
            };
        }

        // If critical vars are missing, throw error instead of returning empty object
        throw new Error(
          `Firebase configuration is incomplete. Missing: ${missingVars.join(', ')}. ` +
          `Please add these environment variables in Vercel project settings.`
        );
    }

    console.log('[FIREBASE CONFIG] ✓ All required variables present');
    console.log('[FIREBASE CONFIG] Project ID:', firebaseConfig.projectId);

    return firebaseConfig;
}
