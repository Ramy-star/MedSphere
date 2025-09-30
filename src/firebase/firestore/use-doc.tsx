
'use client';

import { useEffect, useState, useMemo } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useFirebase } from '../provider';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

export function useDoc<T extends { id: string }>(collectionPath: string, docId?: string) {
  const { db } = useFirebase();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!docId || !db) {
      setData(null);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    let isMounted = true;

    const docRef = doc(db, collectionPath, docId);
    const unsubscribe = onSnapshot(
      docRef,
      (doc) => {
        if (!isMounted) return;
        
        if (doc.exists()) {
          const fetchedData = { id: doc.id, ...doc.data() } as T;
          setData(fetchedData);
        } else {
          setData(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        if (!isMounted) return;
        console.error(`Error fetching document ${collectionPath}/${docId}:`, err);
        setError(err);
        setLoading(false);
         if (err.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: `${collectionPath}/${docId}`,
                operation: 'get',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
      }
    );

    return () => {
        isMounted = false;
        unsubscribe();
    };
  }, [db, collectionPath, docId]);

  return { data, loading, error };
}
