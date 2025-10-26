
"use client";

import { useEffect, useState } from 'react';
import type { FirebaseContextType } from './provider';
import { initializeFirebase } from '.';
import { FirebaseProvider } from './provider';
import { Logo } from '@/components/logo';
import { getRedirectResult } from 'firebase/auth';
import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { getClaimedStudentIdUser } from '@/lib/verificationService';
import { UserProvider, useUser } from './auth/use-user';

function AuthRedirectProcessor({
  children,
  setGlobalError
}: {
  children: React.ReactNode;
  setGlobalError: (error: Error) => void;
}) {
  const { auth, db } = useFirebase();
  const { setIsProcessingRedirect } = useUser();

  useEffect(() => {
    let isMounted = true;
    
    const processRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          const firebaseUser = result.user;
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (!userDoc.exists()) {
            const pendingUsername = localStorage.getItem('pendingUsername');
            const pendingStudentId = localStorage.getItem('pendingStudentId');

            if (!pendingUsername || !pendingStudentId) {
              throw new Error('Registration details are missing after redirect.');
            }

            const existingUserId = await getClaimedStudentIdUser(pendingStudentId);
            if (existingUserId && existingUserId !== firebaseUser.uid) {
              throw new Error('This Student ID is already linked to a different Google account.');
            }

            const batch = writeBatch(db);
            const studentIdRef = doc(db, 'claimedStudentIds', pendingStudentId);
            const newProfileData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email!,
              displayName: firebaseUser.displayName!,
              photoURL: firebaseUser.photoURL!,
              username: pendingUsername,
              studentId: pendingStudentId,
              createdAt: new Date().toISOString(),
              roles: {},
            };
            batch.set(userDocRef, newProfileData);
            batch.set(studentIdRef, { userId: firebaseUser.uid, claimedAt: new Date().toISOString() });
            await batch.commit();

            localStorage.removeItem('pendingUsername');
            localStorage.removeItem('pendingStudentId');
          }
        }
      } catch (err: any) {
        console.error("Error processing auth redirect:", err);
        if(isMounted) setGlobalError(err);
      } finally {
        if(isMounted) setIsProcessingRedirect(false);
      }
    };
    
    processRedirect();

    return () => {
      isMounted = false;
    }
  }, [auth, db, setIsProcessingRedirect, setGlobalError]);

  return <>{children}</>;
}


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
      } catch (e: any) {
        console.error("Firebase initialization error:", e);
        setError(e);
      } finally {
        setLoading(false);
      }
    }
    
    init();
  }, [config]);

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

  if (error || !firebase) {
    return (
      <div className="flex h-screen w-screen items-center justify-center p-4">
        <div className="rounded-lg border border-destructive bg-card p-6 text-center text-destructive-foreground max-w-lg">
          <h2 className="text-lg font-semibold">Firebase Initialization Failed</h2>
          <p className="text-sm mt-2 mb-4">{error?.message || "An unknown error occurred. Firebase is not available."}</p>
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
        <AuthRedirectProcessor setGlobalError={setError}>
          {children}
        </AuthRedirectProcessor>
      </UserProvider>
    </FirebaseProvider>
  );
}
