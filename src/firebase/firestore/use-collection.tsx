
'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  QueryConstraint,
} from 'firebase/firestore';
import { useFirebase } from '../provider';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

type CollectionOptions<T> = {
  where?: [string, any, any];
  orderBy?: [string, 'asc' | 'desc'];
  limit?: number;
  disabled?: boolean;
};

export function useCollection<T>(path: string, options: CollectionOptions<T> = {}) {
  const { db } = useFirebase();
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Memoize options to prevent re-running the effect on every render.
  // Using JSON.stringify is a simple way to deep-compare the options object.
  const memoizedOptions = useMemo(() => options, [
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(options)
  ]);


  useEffect(() => {
    if (memoizedOptions.disabled || !db) {
      setData(null);
      setLoading(false);
      return;
    }
    
    setLoading(true);

    try {
        const constraints: QueryConstraint[] = [];
        if (memoizedOptions.where) constraints.push(where(...memoizedOptions.where));
        if (memoizedOptions.orderBy) constraints.push(orderBy(...memoizedOptions.orderBy));
        if (memoizedOptions.limit) constraints.push(limit(memoizedOptions.limit));

        const q = query(collection(db, path), ...constraints);

        const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
            const result: T[] = [];
            snapshot.forEach((doc) => {
            result.push({ id: doc.id, ...doc.data() } as T);
            });
            setData(result);
            setLoading(false);
            setError(null);
        },
        (err) => {
            console.error(`Error fetching collection ${path}:`, err);
            
            if (err.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({
                    path: path,
                    operation: 'list',
                });
                 errorEmitter.emit('permission-error', permissionError);
                 setError(permissionError);
            } else {
                 setError(err);
            }

            setLoading(false);
        }
        );

        return () => unsubscribe();
    } catch (e: any) {
        console.error("Error setting up collection listener:", e);
        setError(e);
        setLoading(false);
    }
  }, [db, path, memoizedOptions]);

  return { data, loading, error };
}
