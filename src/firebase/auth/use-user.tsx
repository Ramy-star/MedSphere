
'use client';

import { useEffect, useState, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut, getAuth, getRedirectResult } from 'firebase/auth';
import { useFirebase } from '../provider';
import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/firebase';
import { getClaimedStudentIdUser } from '@/lib/verificationService';
import { useToast } from '@/hooks/use-toast';

const VERIFIED_STUDENT_ID_KEY = 'medsphere-verified-student-id';

export function useUser() {
  const { auth } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileExists, setProfileExists] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const handleCreateProfile = useCallback(async (userToProcess: User) => {
    const pendingUsername = localStorage.getItem('pendingUsername');
    const studentId = localStorage.getItem(VERIFIED_STUDENT_ID_KEY);

    if (!pendingUsername || !studentId) {
        console.log("No pending username or student ID found. User might be logging in normally.");
        return; // Not a new profile setup flow
    }

    try {
        const claimingUserId = await getClaimedStudentIdUser(studentId);
        if (claimingUserId && claimingUserId !== userToProcess.uid) {
            toast({
                variant: 'destructive',
                title: 'Registration Error',
                description: 'This Student ID is already registered with a different Google account.',
            });
            await signOut(getAuth());
            localStorage.removeItem('pendingUsername');
            localStorage.removeItem(VERIFIED_STUDENT_ID_KEY);
            return;
        }

        const userRef = doc(db, 'users', userToProcess.uid);
        const studentIdRef = doc(db, 'claimedStudentIds', studentId);
        const batch = writeBatch(db);
        
        const newProfileData = {
            uid: userToProcess.uid,
            email: userToProcess.email,
            displayName: userToProcess.displayName,
            photoURL: userToProcess.photoURL,
            username: pendingUsername,
            studentId: studentId,
            createdAt: new Date().toISOString(),
        };

        batch.set(userRef, newProfileData);
        batch.set(studentIdRef, {
            userId: userToProcess.uid,
            claimedAt: new Date().toISOString(),
        });

        await batch.commit();
        setProfileExists(true);
    } catch (err: any) {
        console.error("Profile creation failed:", err);
        toast({
            variant: 'destructive',
            title: 'Profile Creation Failed',
            description: err.message || 'Could not create your profile.'
        });
        await signOut(getAuth());
    } finally {
        localStorage.removeItem('pendingUsername');
        // Do not remove VERIFIED_STUDENT_ID_KEY here, let it persist
    }
  }, [toast]);
  

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    
    // First, check for redirect result. This should only run once.
    getRedirectResult(auth)
      .then(async (result) => {
        if (result && result.user) {
          // This is a sign-in from a redirect.
          // The onAuthStateChanged listener below will handle the user object,
          // but we can trigger profile creation here if needed.
          await handleCreateProfile(result.user);
        }
      })
      .catch((error) => {
        console.error('getRedirectResult error:', error);
        setError(error);
      })
      .finally(() => {
        // After redirect is handled, set up the main state listener.
        const unsubscribe = onAuthStateChanged(
          auth,
          async (user) => {
            if (user) {
              if (user.isAnonymous) {
                await signOut(auth);
                setUser(null);
                setProfileExists(false);
              } else {
                setUser(user);
                // Check for profile
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                  setProfileExists(true);
                } else {
                  // Profile doesn't exist, might be a new redirect login
                  await handleCreateProfile(user);
                  const refreshedDoc = await getDoc(userDocRef);
                  setProfileExists(refreshedDoc.exists());
                }
              }
            } else {
              setUser(null);
              setProfileExists(false);
            }
            setLoading(false);
          },
          (error) => {
            console.error('onAuthStateChanged error:', error);
            setError(error);
            setLoading(false);
          }
        );
        return unsubscribe;
      });

  }, [auth, handleCreateProfile]);

  return { user, loading, error, profileExists };
}
