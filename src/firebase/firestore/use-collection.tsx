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
  where,
  orderBy,
  limit
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


export function useCollection<T extends { id: string }>(path: string, options: CollectionOptions = {}) {
  const { db } = useFirebase();
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const memoizedOptionsKey = JSON.stringify(options);

  useEffect(() => {
    if (options.disabled || !db || !path) {
      setLoading(false);
      setData(null);
      return;
    }
    
    setLoading(true);
    let isMounted = true;

    try {
        const constraints: QueryConstraint[] = [];
        if (options.where) {
            if (Array.isArray(options.where)) {
                constraints.push(...options.where);
            } else {
                constraints.push(options.where);
            }
        }
        if (options.orderBy) {
            constraints.push(orderBy(...options.orderBy));
        }
        if (options.limit) {
            constraints.push(limit(options.limit));
        }

        const q = query(collection(db, path), ...constraints);
        
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
            
            console.error(`Error fetching collection ${path}:`, err);
            
            if (err.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({
                    path: path,
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

    } catch (e: any) {
        if (!isMounted) return;
        console.error("Error setting up collection listener:", e);
        setError(e);
        setLoading(false);
        return;
    }

  }, [db, path, memoizedOptionsKey, options.disabled]);

  return { data, loading, error };
}

// It is critical that we memoize the query object, otherwise it will be a new
// object instance on every render, causing an infinite loop.
export const useMemoFirebase = useMemo;
