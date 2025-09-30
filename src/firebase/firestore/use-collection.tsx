
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
} from 'firebase/firestore';
import { useFirebase } from '../provider';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';
import { getFromCache, saveToCache } from './cache';

type CollectionOptions = {
  where?: [string, any, any] | [string, any, any][];
  orderBy?: [string, 'asc' | 'desc'];
  limit?: number;
  disabled?: boolean;
};


export function useCollection<T extends { id: string }>(path: string, options: CollectionOptions = {}) {
  const { db } = useFirebase();
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const memoizedOptions = useMemo(() => options, [
      // eslint-disable-next-line react-hooks/exhaustive-deps
      JSON.stringify(options)
  ]);
  
  const cacheKey = useMemo(() => `collection-${path}-${JSON.stringify(memoizedOptions)}`, [path, memoizedOptions]);

  useEffect(() => {
    if (memoizedOptions.disabled || !db) {
      setLoading(false);
      setData(null);
      return;
    }
    
    setLoading(true);
    let isMounted = true;

    // 1. Try to get data from cache first
    getFromCache<T[]>(cacheKey).then(cachedData => {
      if (isMounted && cachedData) {
        setData(cachedData);
        setLoading(false); // We have data, so stop initial loading indicator
      }
    });

    // 2. Set up the realtime listener
    try {
        let q: Query<DocumentData> = collection(db, path);
        
        if (memoizedOptions.where) {
            if (Array.isArray(memoizedOptions.where[0])) {
                (memoizedOptions.where as [string, any, any][]).forEach(w => {
                    q = query(q, where(...w));
                });
            } else {
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
            if (!isMounted) return;
            const result: T[] = [];
            snapshot.forEach((doc) => {
              result.push({ id: doc.id, ...doc.data() } as T);
            });
            setData(result);
            saveToCache(cacheKey, result); // Update cache
            setLoading(false); // Final loading state
            setError(null);
        },
        (err) => {
            if (!isMounted) return;
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
  }, [db, path, memoizedOptions, cacheKey]);

  return { data, loading, error };
}
