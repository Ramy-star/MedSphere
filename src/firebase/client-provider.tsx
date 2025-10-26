
"use client";

import { useEffect, useState } from 'react';
import type { FirebaseContextType } from './provider';
import { initializeFirebase } from '.';
import { FirebaseProvider } from './provider';
import { getAuth, onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import { Logo } from '@/components/logo';

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
            if (process.env.NODE_ENV === 'production' && (!config || !config.apiKey)) {
              throw new Error("Firebase config is missing or incomplete for production environment. Ensure environment variables are set in your hosting provider.");
            }

            const instances = await initializeFirebase(config);
            setFirebase(instances);
            
            // Handle redirect result immediately after initialization
            const auth = getAuth(instances.app);
            await getRedirectResult(auth).catch(err => {
              if (err.code !== 'auth/no-auth-event') {
                console.error("Firebase getRedirectResult error:", err);
              }
            });
            
            setLoading(false); // Set loading to false once initialized and redirect is handled
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


  if (loading) {
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
  
  if (!firebase) {
      return <div>Something went wrong. Firebase is not available.</div>;
  }

  return <FirebaseProvider {...firebase}>{children}</FirebaseProvider>;
}
