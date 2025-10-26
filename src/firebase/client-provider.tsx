
'use client';

import { useEffect, useState, ReactNode } from 'react';
import type { FirebaseContextType } from './provider';
import { initializeFirebase } from '.';
import { FirebaseProvider, useFirebase } from './provider';
import { Logo } from '@/components/logo';
import { UserProvider, useUser } from './auth/use-user';
import { getAuth, getRedirectResult } from 'firebase/auth';


export function FirebaseClientProvider({
  children,
  config,
}: {
  children: ReactNode;
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
      } catch (e: any) {
        console.error('Firebase initialization error:', e);
        setError(e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [config]);

  if (loading || !firebase) {
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
          <h2 className="text-lg font-semibold">
            Firebase Initialization Failed
          </h2>
          <p className="text-sm mt-2 mb-4">
            {error?.message ||
              'An unknown error occurred. Firebase is not available.'}
          </p>
          <code className="text-xs bg-destructive/20 p-2 rounded-md block text-left whitespace-pre-wrap">
            {`Error details: ${error?.stack || 'No stack available.'}`}
          </code>
        </div>
      </div>
    );
  }

  return (
    <FirebaseProvider {...firebase}>
      <UserProvider>
        {children}
      </UserProvider>
    </FirebaseProvider>
  );
}
