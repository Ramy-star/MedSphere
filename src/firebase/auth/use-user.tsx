
'use client';

import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut, getAuth } from 'firebase/auth';
import { useFirebase } from '../provider';

export function useUser() {
  const { auth } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    };
    
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (user?.isAnonymous) {
          signOut(auth);
          setUser(null);
        } else {
          setUser(user);
        }
        setLoading(false);
      },
      (error) => {
        setError(error);
        setLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [auth]);

  return { user, loading, error };
}
