
"use client";

import { useEffect, useState, useRef } from 'react';
import type { FirebaseContextType } from './provider';
import { initializeFirebase } from '.';
import { FirebaseProvider } from './provider';
import { Logo } from '@/components/logo';
import { getRedirectResult } from 'firebase/auth';
import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { getClaimedStudentIdUser } from '@/lib/verificationService';

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
  
  // Ref to ensure redirect processing happens only once
  const processingRedirect = useRef(false);

  useEffect(() => {
    const init = async () => {
        try {
            if (process.env.NODE_ENV === 'production' && (!config || !config.apiKey)) {
              throw new Error("Firebase config is missing or incomplete for production environment. Ensure environment variables are set in your hosting provider.");
            }
            
            const instances = await initializeFirebase(config);
            const { auth, db } = instances;

            // --- Centralized Redirect Result Processing ---
            // This runs only once when the provider mounts.
            if (!processingRedirect.current) {
                processingRedirect.current = true;
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
                                roles: {}, // Start with empty roles
                            };
                            batch.set(userDocRef, newProfileData);
                            batch.set(studentIdRef, { userId: firebaseUser.uid, claimedAt: new Date().toISOString() });
                            await batch.commit();
                            
                            localStorage.removeItem('pendingUsername');
                            localStorage.removeItem('pendingStudentId');
                        }
                    }
                } catch (err: any) {
                     // We catch the error here, but let the onAuthStateChanged in useUser handle the final state.
                     // This prevents the app from crashing and allows for a graceful error display if needed.
                    console.error("Error processing auth redirect in client-provider:", err);
                    setError(err); // Optionally set an error state to show a global error message
                }
            }
            // --- End of Redirect Processing ---
            
            setFirebase(instances);
            setLoading(false);
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
