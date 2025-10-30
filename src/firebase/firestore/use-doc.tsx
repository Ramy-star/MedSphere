'use client';

import { useEffect, useState, useMemo } from 'react';
import { doc, onSnapshot, DocumentData, DocumentReference } from 'firebase/firestore';
import { useFirebase } from '../provider';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

type DocOptions = {
    disabled?: boolean;
};

export function useDoc<T extends { id: string }>(collectionPathOrRef: string | DocumentReference, docId?: string, options: DocOptions = {}) {
  const { db } = useFirebase();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const docRef = useMemo(() => {
    if (options.disabled) return null;
    if (typeof collectionPathOrRef === 'string') {
      if (!docId || !db) return null;
      return doc(db, collectionPathOrRef, docId);
    }
    return collectionPathOrRef;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, collectionPathOrRef, docId, options.disabled]);
  
  const path = typeof collectionPathOrRef === 'string' ? `${collectionPathOrRef}/${docId}` : collectionPathOrRef.path;

  useEffect(() => {
    if (!docRef || !db || options.disabled) {
      setData(null);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    let isMounted = true;

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
        console.error(`Error fetching document ${path}:`, err);
        setError(err);
        setLoading(false);
         if (err.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: path,
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
  }, [db, docRef, path, options.disabled]);

  return { data, loading, error };
}
