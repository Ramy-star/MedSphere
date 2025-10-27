
"use client";

import { useEffect, useState } from 'react';
import type { FirebaseContextType } from './provider';
import { initializeFirebase } from '.';
import { FirebaseProvider } from './provider';
import { Logo } from '@/components/logo';
import { useAuthStore } from '@/stores/auth-store';

export function FirebaseClientProvider({
  children,
  config,
}: {
  children: React.ReactNode;
  config: any;
}) {
  const [firebase, setFirebase] = useState<FirebaseContextType | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const isLoadingAuth = useAuthStore((state) => state.loading);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
        try {
            if (process.env.NODE_ENV === 'production' && (!config || !config.apiKey)) {
              throw new Error("Firebase config is missing or incomplete for production environment. Ensure environment variables are set in your hosting provider.");
            }

            const instances = await initializeFirebase(config);
            if (isMounted) {
              setFirebase(instances);
              // Once Firebase is initialized, check authentication.
              await checkAuth();
            }
        } catch (e: any) {
            console.error("Firebase initialization error:", e);
            if(isMounted) setError(e);
        }
    }
    
    init();

    return () => {
      isMounted = false;
    }
  // We only want this to run once on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  if (!firebase || isLoadingAuth) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
            <Logo className="h-16 w-16 animate-pulse" />
            <p className="text-slate-400">Connecting to MedSphere...</p>
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
