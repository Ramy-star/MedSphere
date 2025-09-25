
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

  const memoizedOptions = useMemo(() => options, [
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(options.where),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(options.orderBy),
    options.limit,
    options.disabled,
  ]);


  useEffect(() => {
    if (memoizedOptions.disabled) {
      setData(null);
      setLoading(false);
      return;
    }
    
    setLoading(true);

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
        setError(err);
        setLoading(false);
        if (err.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path,
                operation: 'list',
                // You can add more context if available from the query options
            });
            errorEmitter.emit('permission-error', permissionError);
        }
      }
    );

    return () => unsubscribe();
  }, [db, path, memoizedOptions]);

  return { data, loading, error };
}
