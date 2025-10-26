
'use client';

import { useEffect, useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useFirebase } from '../provider';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';

export type Roles = {
  isSuperAdmin?: boolean;
  isBlocked?: boolean;
  permissions?: {
    scope: 'level' | 'semester' | 'subject' | 'folder';
    scopeId: string;
    jobs: string[];
  }[];
};

export type UserProfile = {
    uid: string;
    username: string;
    email: string;
    displayName: string;
    photoURL: string;
    studentId: string;
    createdAt: string;
    roles?: Roles;
};

export type User = FirebaseUser & {
    profile: UserProfile | null;
};


export function useUser() {
  const { auth } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileExists, setProfileExists] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        setLoading(true);
        if (firebaseUser) {
          if (firebaseUser.isAnonymous) {
            await signOut(auth);
            setUser(null);
            setProfileExists(false);
            setLoading(false);
          } else {
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            // Use onSnapshot to listen for real-time profile updates
            const unsubProfile = onSnapshot(userDocRef, 
              (docSnap) => {
                if (docSnap.exists()) {
                    const profileData = docSnap.data() as UserProfile;
                    // Block user if their account is marked as blocked
                    if (profileData.roles?.isBlocked) {
                       signOut(auth);
                       setUser(null);
                       setProfileExists(false);
                    } else {
                      setUser({ ...firebaseUser, profile: profileData });
                      setProfileExists(true);
                    }
                } else {
                    // This case handles users who are authenticated with Firebase
                    // but don't have a profile document in Firestore yet (e.g., during registration).
                    setUser({ ...firebaseUser, profile: null });
                    setProfileExists(false);
                }
                setLoading(false);
              },
              (profileError) => {
                console.error("Error listening to user profile:", profileError);
                setError(profileError);
                setUser({ ...firebaseUser, profile: null });
                setProfileExists(false);
                setLoading(false);
              }
            );

            // Return the profile listener cleanup function
            return () => unsubProfile();
          }
        } else {
          setUser(null);
          setProfileExists(false);
          setLoading(false);
        }
      },
      (authError) => {
        console.error('onAuthStateChanged error:', authError);
        setError(authError);
        setLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [auth]);

  return { user, loading, error, profileExists };
}
