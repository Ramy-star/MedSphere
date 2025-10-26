'use client';

import { useEffect, useState, createContext, useContext, useMemo } from 'react';
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

export interface User extends FirebaseUser {
    profile: UserProfile | null;
};

interface UserContextType {
  user: User | null;
  loading: boolean;
  profileExists: boolean | undefined;
  isSuperAdmin: boolean;
  isSubAdmin: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { auth } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileExists, setProfileExists] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (!auth) {
        setLoading(false);
        return;
    };
    
    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        if (firebaseUser) {
            if (firebaseUser.isAnonymous) {
              signOut(auth);
              return;
            }
            
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            
            const unsubProfile = onSnapshot(userDocRef, 
              (docSnap) => {
                setLoading(true);
                if (docSnap.exists()) {
                    const profileData = docSnap.data() as UserProfile;
                    if (profileData.roles?.isBlocked) {
                       signOut(auth);
                    } else {
                      setUser({ ...firebaseUser, profile: profileData });
                      setProfileExists(true);
                    }
                } else {
                    setUser({ ...firebaseUser, profile: null });
                    setProfileExists(false);
                }
                setLoading(false);
              },
              (profileError) => {
                console.error("Error listening to user profile:", profileError);
                setUser({ ...firebaseUser, profile: null });
                setProfileExists(false);
                setLoading(false);
              }
            );
            return () => unsubProfile();
        } else {
          setUser(null);
          setProfileExists(undefined);
          setLoading(false);
        }
      },
      (authError) => {
        console.error('onAuthStateChanged error:', authError);
        setLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [auth]);
  
   const isSuperAdmin = useMemo(() => user?.profile?.roles?.isSuperAdmin === true, [user]);
   const isSubAdmin = useMemo(() => !!user?.profile?.roles?.permissions && user.profile.roles.permissions.length > 0 && !isSuperAdmin, [user, isSuperAdmin]);

  const value = {
      user,
      loading,
      profileExists,
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
