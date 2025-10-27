'use client';

import type { FirebaseApp } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';
import { createContext, useContext, useMemo } from 'react';
import { FirebaseErrorListener } from './FirebaseErrorListener';

export type FirebaseContextType = {
  app: FirebaseApp;
  db: Firestore;
};

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export function FirebaseProvider({
  children,
  ...value
}: {
  children: React.ReactNode;
} & FirebaseContextType) {
  const memoizedValue = useMemo(() => value, [value]);
  return (
    <FirebaseContext.Provider value={memoizedValue}>
      <FirebaseErrorListener />
      {children}
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
