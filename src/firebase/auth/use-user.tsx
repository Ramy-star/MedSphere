
'use client';

import { useEffect, useState, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut, getAuth } from 'firebase/auth';
import { useFirebase } from '../provider';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';

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
      async (user) => {
        setLoading(true);
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
            setProfileExists(userDoc.exists());
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
  }, [auth]);

  return { user, loading, error, profileExists };
}

    