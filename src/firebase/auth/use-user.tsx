
'use client';

import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut, getAuth, getRedirectResult } from 'firebase/auth';
import { useFirebase } from '../provider';

export function useUser() {
  const { auth } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const authInstance = getAuth();
    
    // First, try to get the redirect result. This should only run once on page load.
    getRedirectResult(authInstance)
      .then((result) => {
        // The user object will be handled by onAuthStateChanged
      })
      .catch((error) => {
        // Handle Errors here.
        if (error.code !== 'auth/no-auth-event') {
          console.error("Error from getRedirectResult:", error);
          setError(error);
        }
      })
      .finally(() => {
        // Now, set up the real-time listener.
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
      });

  }, [auth]);

  return { user, loading, error };
}
