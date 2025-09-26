"use client";

import { useEffect, useState } from 'react';
import type { FirebaseContextType } from './provider';
import { initializeFirebase } from '.';
import { FirebaseProvider } from './provider';
import { Skeleton } from '@/components/ui/skeleton';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

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
            const instances = await initializeFirebase(config);
            setFirebase(instances);

            // Check auth state before declaring initialization "finished"
            const auth = getAuth(instances.app);
            const unsubscribe = onAuthStateChanged(auth, (user) => {
              setLoading(false); // Auth state is resolved, stop loading
              unsubscribe(); // We only need this for the initial load
            }, (error) => {
              setError(error);
              setLoading(false);
              unsubscribe();
            });

        } catch (e: any) {
            console.error("Firebase initialization error:", e);
            setError(e);
            setLoading(false);
        }
    }
    if (!firebase) {
      init();
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
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="rounded-lg border border-destructive bg-card p-6 text-center text-destructive">
          <h2 className="text-lg font-semibold">Firebase Initialization Failed</h2>
          <p className="text-sm">{error?.message || "An unknown error occurred."}</p>
        </div>
      </div>
    );
  }

  return <FirebaseProvider {...firebase}>{children}</FirebaseProvider>;
}
