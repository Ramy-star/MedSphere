
'use client';
import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { db } from '@/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export function useUsernameAvailability(username: string, originalUsername?: string) {
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [debouncedUsername] = useDebounce(username, 500);

    useEffect(() => {
        const trimmedUsername = debouncedUsername.trim();

        if (originalUsername && trimmedUsername.toLowerCase() === originalUsername.toLowerCase()) {
            setIsAvailable(true);
            setIsLoading(false);
            return;
        }
        
        if (!trimmedUsername || trimmedUsername.length < 3) {
            setIsAvailable(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const checkUsername = async () => {
            try {
                const usersRef = collection(db, 'users');
                const q = query(usersRef, where('username', '==', trimmedUsername));
                const querySnapshot = await getDocs(q);
                setIsAvailable(querySnapshot.empty);
            } catch (error) {
                console.error("Error checking username:", error);
                setIsAvailable(false); // Assume not available on error
            } finally {
                setIsLoading(false);
            }
        };

        checkUsername();
    }, [debouncedUsername, originalUsername]);

    return { isAvailable, isLoading, debouncedUsername };
}
