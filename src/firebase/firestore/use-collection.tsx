'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  Query,
  DocumentData,
  QueryConstraint,
  FirestoreError,
  orderBy,
  limit,
} from 'firebase/firestore';
import { useFirebase } from '../provider';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

type CollectionOptions = {
  where?: QueryConstraint | QueryConstraint[];
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

    let q: Query<DocumentData>;
    let queryStringPath: string;

    try {
        if (typeof pathOrQuery === 'string') {
          queryStringPath = pathOrQuery;
          const constraints: QueryConstraint[] = [];
          
          if (memoizedOptions.where) {
              const whereClauses = Array.isArray(memoizedOptions.where) ? memoizedOptions.where : [memoizedOptions.where];
              if (whereClauses.every(clause => clause)) { // Ensure no clause is undefined
                  constraints.push(...whereClauses);
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
          // Attempt to derive path from query for error reporting
          // This is a simplified approach and might not cover all edge cases
          queryStringPath = (q as any)._query?.path?.segments?.join('/') || 'complex query';
        }

    } catch (e: any) {
        if (!isMounted) return;
        console.error("Error setting up collection listener:", e);
        setError(e);
        setLoading(false);
        return;
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
    (err: FirestoreError) => {
        if (!isMounted) return;
        
        console.error(`Error fetching collection ${queryStringPath}:`, err);
        
        if (err.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: queryStringPath,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
            setError(permissionError); // Set the specific error state
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
  }, [db, pathOrQuery, memoizedOptions]);

  return { data, loading, error };
}

// It is critical that we memoize the query object, otherwise it will be a new
// object instance on every render, causing an infinite loop.
export const useMemoFirebase = useMemo;