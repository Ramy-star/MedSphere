
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

  const isSuperAdmin = user?.profile?.roles?.isSuperAdmin === true;
  const isSubAdmin = !!user?.profile?.roles?.permissions && user.profile.roles.permissions.length > 0 && !isSuperAdmin;

  useEffect(() => {
    if (!auth) return;
    
    // onAuthStateChanged is the single source of truth for the user's auth state.
    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        if (firebaseUser) {
            // User is signed in. Now, we listen for their profile document.
            if (firebaseUser.isAnonymous) {
              // Anonymous users should be signed out.
              signOut(auth);
              setUser(null);
              setProfileExists(false);
              setLoading(false);
              return;
            }
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const unsubProfile = onSnapshot(userDocRef, 
              (docSnap) => {
                if (docSnap.exists()) {
                    const profileData = docSnap.data() as UserProfile;
                    if (profileData.roles?.isBlocked) {
                       // If user is blocked, sign them out and clear state.
                       signOut(auth);
                       setUser(null);
                       setProfileExists(false);
                    } else {
                      // User has a profile and is not blocked.
                      setUser({ ...firebaseUser, profile: profileData });
                      setProfileExists(true);
                    }
                } else {
                    // This can happen briefly during profile creation after redirect.
                    // AuthGuard will show the setup form in this case.
                    setUser({ ...firebaseUser, profile: null });
                    setProfileExists(false);
                }
                setLoading(false);
              },
              (profileError) => {
                // Error listening to the profile document.
                console.error("Error listening to user profile:", profileError);
                setError(profileError);
                setUser({ ...firebaseUser, profile: null });
                setProfileExists(false);
                setLoading(false);
              }
            );
            // Return the profile listener unsubscribe function.
            return () => unsubProfile();
        } else {
          // User is signed out.
          setUser(null);
          setProfileExists(false);
          setLoading(false);
        }
      },
      (authError) => {
        // An error occurred in the auth listener itself.
        console.error('onAuthStateChanged error:', authError);
        setError(authError);
        setLoading(false);
      }
    );
    
    // Return the auth listener unsubscribe function.
    return () => unsubscribe();
  }, [auth]);

  return { user, loading, error, profileExists, isSuperAdmin, isSubAdmin };
}
