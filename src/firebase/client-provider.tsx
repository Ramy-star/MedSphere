'use client';

import { useEffect, useState, ReactNode, useCallback } from 'react';
import type { FirebaseContextType } from './provider';
import { initializeFirebase } from '.';
import { FirebaseProvider } from './provider';
import { Logo } from '@/components/logo';
import { UserProvider, useUser, type UserProfile } from './auth/use-user';
import { getRedirectResult } from 'firebase/auth';
import { useFirebase } from './provider';
import { doc, getDoc, writeBatch } from 'firebase/firestore';

const VERIFIED_STUDENT_ID_KEY = 'medsphere-verified-student-id';

/**
 * This component is responsible for processing the redirect result from Firebase Auth.
 * It runs only once after the Firebase services are available.
 */
function AuthRedirectProcessor({
  onProcessingDone,
  setGlobalError,
}: {
  onProcessingDone: () => void;
  setGlobalError: (error: Error) => void;
}) {
  const { auth, db } = useFirebase();
  const { setIsProcessingRedirect } = useUser();

  useEffect(() => {
    const processRedirect = async () => {
      try {
        setIsProcessingRedirect(true);
        const result = await getRedirectResult(auth);

        if (result && result.user) {
          const firebaseUser = result.user;
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (!userDoc.exists()) {
            const studentId = localStorage.getItem(VERIFIED_STUDENT_ID_KEY);
            const username = localStorage.getItem('pendingUsername');

            if (!studentId || !username) {
              throw new Error(
                'Could not find pending student ID or username after redirect.'
              );
            }

            const batch = writeBatch(db);
            const studentIdRef = doc(db, 'claimedStudentIds', studentId);
            const newProfileData: Omit<UserProfile, 'roles'> = {
              uid: firebaseUser.uid,
              email: firebaseUser.email!,
              displayName: firebaseUser.displayName!,
              photoURL: firebaseUser.photoURL!,
              username: username,
              studentId: studentId,
              createdAt: new Date().toISOString(),
            };
            batch.set(userDocRef, { ...newProfileData, roles: {} });
            batch.set(studentIdRef, {
              userId: firebaseUser.uid,
              claimedAt: new Date().toISOString(),
            });
            await batch.commit();
            localStorage.removeItem('pendingUsername');
          }
        }
      } catch (error: any) {
        if (error.code !== 'auth/no-redirect-operation') {
          console.error('Auth Redirect Error:', error);
          setGlobalError(error);
        }
      } finally {
        setIsProcessingRedirect(false);
        onProcessingDone();
      }
    };

    processRedirect();
  }, [auth, db, setIsProcessingRedirect, onProcessingDone, setGlobalError]);

  return null; // This component does not render anything.
}

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
  const [redirectProcessed, setRedirectProcessed] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const instances = await initializeFirebase(config);
        setFirebase(instances);
      } catch (e: any) {
        console.error('Firebase initialization error:', e);
        setError(e);
        setLoading(false);
      }
    };
    init();
  }, [config]);

  const onProcessingDone = useCallback(() => {
    setRedirectProcessed(true);
    setLoading(false);
  }, []);

  if (error || (!loading && !firebase)) {
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
    <UserProvider>
      {firebase ? (
        <FirebaseProvider {...firebase}>
          {!redirectProcessed ? (
            <AuthRedirectProcessor
              onProcessingDone={onProcessingDone}
              setGlobalError={setError}
            />
          ) : null}
          {loading ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
              <div className="flex flex-col items-center gap-4">
                <Logo className="h-16 w-16 animate-pulse" />
                <p className="text-slate-400">Authenticating...</p>
              </div>
            </div>
          ) : (
            children
          )}
        </FirebaseProvider>
      ) : (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
              <div className="flex flex-col items-center gap-4">
                <Logo className="h-16 w-16 animate-pulse" />
                <p className="text-slate-400">Connecting to MedSphere...</p>
              </div>
            </div>
      )}
    </UserProvider>
  );
}
