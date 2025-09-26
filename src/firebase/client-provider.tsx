
"use client";

import { useEffect, useState } from 'react';
import type { FirebaseContextType } from './provider';
import { initializeFirebase } from '.';
import { FirebaseProvider } from './provider';
import { Skeleton } from '@/components/ui/skeleton';
import { getAuth, onAuthStateChanged, getRedirectResult } from 'firebase/auth';

export function FirebaseClientProvider({
  children,
  config,
}: {
  children: React.ReactNode;
  config: any;
}) {
  const [firebase, setFirebase] = useState<FirebaseContextType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const init = async () => {
        try {
            // Basic validation for production config
            if (process.env.NODE_ENV === 'production' && (!config || !config.apiKey)) {
              throw new Error("Firebase config is missing or incomplete for production environment. Ensure environment variables are set in your hosting provider.");
            }

            const instances = await initializeFirebase(config);
            setFirebase(instances);
            
            const auth = getAuth(instances.app);

            // Handle redirect result first
            getRedirectResult(auth).catch(err => {
              // This can throw if there is no redirect result, which is fine.
              // We log other errors as they might indicate a configuration issue.
              if (err.code !== 'auth/no-auth-event') {
                console.error("Firebase getRedirectResult error:", err);
                setError(new Error(`Authentication redirect failed: ${err.message}`));
              }
            });

            // Then, set up the state listener
            const unsubscribe = onAuthStateChanged(auth, (user) => {
              setLoading(false); // Auth state is resolved, stop loading
            }, (error) => {
              console.error("Firebase onAuthStateChanged error:", error);
              setError(error);
              setLoading(false);
            });

            return unsubscribe;
        } catch (e: any) {
            console.error("Firebase initialization error:", e);
            setError(e);
            setLoading(false);
        }
    }
    
    let unsubscribe: (() => void) | undefined;
    if (!firebase) {
      init().then(unsub => {
        if (unsub) unsubscribe = unsub;
      });
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    }
  }, [config, firebase]);

  if (loading || !firebase) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="w-full max-w-md p-8 space-y-4">
            <h1 className='text-center text-2xl font-bold text-white'>Connecting to MedSphere...</h1>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center p-4">
        <div className="rounded-lg border border-destructive bg-card p-6 text-center text-destructive-foreground max-w-lg">
          <h2 className="text-lg font-semibold">Firebase Initialization Failed</h2>
          <p className="text-sm mt-2 mb-4">{error?.message || "An unknown error occurred."}</p>
          <code className="text-xs bg-destructive/20 p-2 rounded-md block text-left whitespace-pre-wrap">
            {`Error details: ${error?.stack || 'No stack available.'}`}
          </code>
        </div>
      </div>
    );
  }

  return <FirebaseProvider {...firebase}>{children}</FirebaseProvider>;
}
