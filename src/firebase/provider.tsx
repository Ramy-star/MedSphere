'use client';

import type { FirebaseApp } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';
import type { Auth } from 'firebase/auth';
import { createContext, useContext, useMemo } from 'react';
import { FirebaseErrorListener } from './FirebaseErrorListener';
import { UserProvider } from './auth/use-user';

export type FirebaseContextType = {
  app: FirebaseApp;
  db: Firestore;
  auth: Auth;
};

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export function FirebaseProvider({
  children,
  ...value
}: {
  children: React.ReactNode;
} & FirebaseContextType) {
  // useMemo is not strictly necessary here because the value object is
  // created once in FirebaseClientProvider and doesn't change.
  const memoizedValue = useMemo(() => value, [value]);
  return (
    <FirebaseContext.Provider value={memoizedValue}>
      <UserProvider>
        <FirebaseErrorListener />
        {children}
      </UserProvider>
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}
