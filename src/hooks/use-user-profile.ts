'use client';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { useEffect, useState } from 'react';
import type { UserProfile } from '@/firebase/auth/use-user';


export function useUserProfile(uid: string | undefined) {
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!uid) {
            setLoading(false);
            setUserProfile(null);
            return;
        }

        setLoading(true);
        const userDocRef = doc(db, 'users', uid);
        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                setUserProfile(docSnap.data() as UserProfile);
            } else {
                setUserProfile(null);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching user profile:", error);
            setUserProfile(null);
            setLoading(false);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
        
    }, [uid]);

    return { userProfile, loading };
}
