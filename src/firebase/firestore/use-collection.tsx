'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  collection,
  query,
  onSnapshot,
  Query,
  DocumentData,
  QueryConstraint,
  FirestoreError,
} from 'firebase/firestore';
import { useFirebase } from '../provider';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

type CollectionOptions = {
  where?: QueryConstraint | QueryConstraint[]; // Kept for API consistency but logic simplified
  orderBy?: [string, 'asc' | 'desc'];
  limit?: number;
  disabled?: boolean;
};


export function useCollection<T extends { id: string }>(pathOrQuery: string | Query | null, options: CollectionOptions = {}) {
  const { db } = useFirebase();
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // A simplified memoization key. This is less precise but avoids stringifying complex objects.
  // The primary dependency causing re-renders should be the pathOrQuery itself.
  const memoizedOptionsKey = JSON.stringify({
    orderBy: options.orderBy,
    limit: options.limit,
    disabled: options.disabled,
  });

  useEffect(() => {
    if (options.disabled || !db || !pathOrQuery) {
      setLoading(false);
      setData(null);
      return;
    }
    
    setLoading(true);
    let isMounted = true;

    let q: Query<DocumentData>;
    let queryStringPath: string;

    try {
        // The logic is simplified. We expect either a string path or a pre-built Query object.
        // We no longer try to construct the query from options within the hook.
        // This is now the responsibility of the calling component, which promotes better
        // memoization practices (using useMemoFirebase) at the call site.
        if (typeof pathOrQuery === 'string') {
          q = query(collection(db, pathOrQuery));
          queryStringPath = pathOrQuery;
        } else {
          q = pathOrQuery as Query<DocumentData>;
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
  }, [db, pathOrQuery, memoizedOptionsKey, options.disabled]); // pathOrQuery is the main dependency

  return { data, loading, error };
}

// It is critical that we memoize the query object, otherwise it will be a new
// object instance on every render, causing an infinite loop.
export const useMemoFirebase = useMemo;
