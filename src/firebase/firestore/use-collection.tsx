
'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Query,
  DocumentData,
  QueryConstraint,
} from 'firebase/firestore';
import { useFirebase } from '../provider';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

type CollectionOptions = {
  where?: [string, any, any] | [string, any, any][];
  orderBy?: [string, 'asc' | 'desc'];
  limit?: number;
  disabled?: boolean;
};


export function useCollection<T extends { id: string }>(pathOrQuery: string | Query, options: CollectionOptions = {}) {
  const { db } = useFirebase();
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
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
    let isMounted = true;

    try {
        let q: Query<DocumentData>;

        if (typeof pathOrQuery === 'string') {
          let constraints: QueryConstraint[] = [];
          if (memoizedOptions.where) {
              if (Array.isArray(memoizedOptions.where[0])) {
                  (memoizedOptions.where as [string, any, any][]).forEach(w => {
                      constraints.push(where(...w));
                  });
              } else {
                  constraints.push(where(...(memoizedOptions.where as [string, any, any])));
              }
          }
          if (memoizedOptions.orderBy) {
              constraints.push(orderBy(...memoizedOptions.orderBy));
          }
          if (memoizedOptions.limit) {
              constraints.push(limit(memoizedOptions.limit));
          }
          q = query(collection(db, pathOrQuery), ...constraints);
        } else {
          q = pathOrQuery;
        }

        const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
            if (!isMounted) return;
            const result: T[] = [];
            snapshot.forEach((doc) => {
              result.push({ id: doc.id, ...doc.data() } as T);
            });
            setData(result);
            setLoading(false);
            setError(null);
        },
        (err) => {
            if (!isMounted) return;
            const path = typeof pathOrQuery === 'string' ? pathOrQuery : 'a query';
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

        return () => {
          isMounted = false;
          unsubscribe();
        };
    } catch (e: any) {
        if (!isMounted) return;
        console.error("Error setting up collection listener:", e);
        setError(e);
        setLoading(false);
    }
  }, [db, pathOrQuery, memoizedOptions]);

  return { data, loading, error };
}

// It is critical that we memoize the query object, otherwise it will be a new
// object instance on every render, causing an infinite loop.
export const useMemoFirebase = useMemo;
