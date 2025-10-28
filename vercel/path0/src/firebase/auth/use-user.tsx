'use client';

import {
  useEffect,
  useState,
  createContext,
  useContext,
  useMemo,
  useCallback,
} from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useFirebase } from '@/firebase/provider';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import type { UserProfile as BaseUserProfile } from '@/stores/auth-store';


export type UserProfile = BaseUserProfile;

export interface User extends FirebaseUser {
  profile: UserProfile | null;
}

interface UserContextType {
  user: User | null;
  loading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { auth } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        // This is a dummy onAuthStateChanged. The real one is in auth-store.
        // This provider is being deprecated but kept to avoid breaking imports.
        setLoading(false);
      },
      (authError) => {
        console.error('onAuthStateChanged error:', authError);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [auth]);

  const value = {
    user,
    loading
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
