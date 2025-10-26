
'use client';

import { useEffect, useState, createContext, useContext } from 'react';
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

interface UserContextType {
  user: User | null;
  loading: boolean;
  profileExists: boolean;
  isProcessingRedirect: boolean;
  setIsProcessingRedirect: (isProcessing: boolean) => void;
  error: Error | null;
  isSuperAdmin: boolean;
  isSubAdmin: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { auth } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileExists, setProfileExists] = useState(false);
  const [isProcessingRedirect, setIsProcessingRedirect] = useState(true); // Start as true
  const [error, setError] = useState<Error | null>(null);

  const isSuperAdmin = user?.profile?.roles?.isSuperAdmin === true;
  const isSubAdmin = !!user?.profile?.roles?.permissions && user.profile.roles.permissions.length > 0 && !isSuperAdmin;

  useEffect(() => {
    if (!auth) {
        setIsProcessingRedirect(false);
        setLoading(false);
        return;
    };
    
    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        if (firebaseUser) {
            if (firebaseUser.isAnonymous) {
              signOut(auth);
              setUser(null);
              setProfileExists(false);
              setLoading(false);
              setIsProcessingRedirect(false);
              return;
            }
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const unsubProfile = onSnapshot(userDocRef, 
              (docSnap) => {
                if (docSnap.exists()) {
                    const profileData = docSnap.data() as UserProfile;
                    if (profileData.roles?.isBlocked) {
                       signOut(auth);
                       setUser(null);
                       setProfileExists(false);
                    } else {
                      setUser({ ...firebaseUser, profile: profileData });
                      setProfileExists(true);
                    }
                } else {
                    setUser({ ...firebaseUser, profile: null });
                    setProfileExists(false);
                }
                setLoading(false);
                // The redirect processing might still be happening, so we don't set it to false here.
                // It will be set to false by the FirebaseClientProvider.
              },
              (profileError) => {
                console.error("Error listening to user profile:", profileError);
                setError(profileError);
                setUser({ ...firebaseUser, profile: null });
                setProfileExists(false);
                setLoading(false);
                setIsProcessingRedirect(false);
              }
            );
            return () => unsubProfile();
        } else {
          setUser(null);
          setProfileExists(false);
          setLoading(false);
          setIsProcessingRedirect(false);
        }
      },
      (authError) => {
        console.error('onAuthStateChanged error:', authError);
        setError(authError);
        setLoading(false);
        setIsProcessingRedirect(false);
      }
    );
    
    return () => unsubscribe();
  }, [auth]);
  
  const value = {
      user,
      loading,
      profileExists,
      isProcessingRedirect,
      setIsProcessingRedirect,
      error,
      isSuperAdmin,
      isSubAdmin
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextType {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
