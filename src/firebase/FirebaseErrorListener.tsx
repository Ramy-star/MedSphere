
'use client';

import { useEffect } from 'react';
import { errorEmitter } from './error-emitter';
import { FirestorePermissionError } from './errors';
import { useToast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: Error) => {
      console.error("Firebase Error Listener:", error);

      if (error instanceof FirestorePermissionError) {
        // For developers, throw it to make it visible in Next.js dev overlay
        if (process.env.NODE_ENV === 'development') {
          throw error;
        } else {
          // For users, show a friendly toast
          toast({
            variant: 'destructive',
            title: 'Permission Denied',
            description: 'You do not have permission to perform this action.',
          });
        }
      } else {
         toast({
            variant: 'destructive',
            title: 'An Error Occurred',
            description: error.message || 'Something went wrong.',
          });
      }
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast]);

  return null; // This component does not render anything
}

