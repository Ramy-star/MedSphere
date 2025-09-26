
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
  Query,
  DocumentData,
} from 'firebase/firestore';
import { useFirebase } from '../provider';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

type CollectionOptions = {
  where?: [string, any, any] | [string, any, any][]; // Allow single or multiple where clauses
  orderBy?: [string, 'asc' | 'desc'];
  limit?: number;
  disabled?: boolean;
};


export function useCollection<T>(path: string, options: CollectionOptions = {}) {
  const { db } = useFirebase();
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Memoize options to prevent re-running the effect on every render.
  const memoizedOptions = useMemo(() => options, [
      // eslint-disable-next-line react-hooks/exhaustive-deps
      JSON.stringify(options)
  ]);

  useEffect(() => {
    if (memoizedOptions.disabled || !db) {
      setLoading(false);
      setData(null);
      return;
    }
    
    setLoading(true);

    try {
        let q: Query<DocumentData> = collection(db, path);
        
        if (memoizedOptions.where) {
            if (Array.isArray(memoizedOptions.where[0])) {
                // It's an array of where clauses
                (memoizedOptions.where as [string, any, any][]).forEach(w => {
                    q = query(q, where(...w));
                });
            } else {
                // It's a single where clause
                q = query(q, where(...(memoizedOptions.where as [string, any, any])));
            }
        }
        if (memoizedOptions.orderBy) {
            q = query(q, orderBy(...memoizedOptions.orderBy));
        }
        if (memoizedOptions.limit) {
            q = query(q, limit(memoizedOptions.limit));
        }

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
