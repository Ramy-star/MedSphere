
'use client';

import { useEffect, useState, useMemo } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useFirebase } from '../provider';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';
import { getFromCache, saveToCache } from './cache';

export function useDoc<T extends { id: string }>(collectionPath: string, docId?: string) {
  const { db } = useFirebase();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const cacheKey = useMemo(() => docId ? `${collectionPath}-${docId}` : null, [collectionPath, docId]);

  useEffect(() => {
    if (!docId || !db || !cacheKey) {
      setData(null);
      setLoading(false);
      return;
    }
    
    setLoading(true);

    // 1. Try to get data from cache first
    let isMounted = true;
    getFromCache<T>(cacheKey).then(cachedData => {
        if (isMounted && cachedData) {
            setData(cachedData);
            setLoading(false); // We have data, so stop initial loading indicator
        }
    });

    // 2. Set up the realtime listener
    const docRef = doc(db, collectionPath, docId);
    const unsubscribe = onSnapshot(
      docRef,
      (doc) => {
        if (!isMounted) return;
        
        if (doc.exists()) {
          const fetchedData = { id: doc.id, ...doc.data() } as T;
          setData(fetchedData);
          saveToCache(cacheKey, fetchedData); // Update cache
        } else {
          setData(null);
          saveToCache(cacheKey, null); // Clear cache if doc is deleted
        }
        setLoading(false); // Final loading state
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
  }, [db, collectionPath, docId, cacheKey]);

  return { data, loading, error };
}
