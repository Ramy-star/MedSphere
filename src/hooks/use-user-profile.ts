
'use client';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { useEffect, useState } from 'react';

// A simplified version of user profile for this hook
type UserProfile = {
    uid: string;
    username: string;
    email: string;
    displayName: string;
    photoURL: string;
    studentId: string;
    createdAt: string;
};

export function useUserProfile(uid: string | undefined) {
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!uid) {
            setLoading(false);
            setUserProfile(null);
            return;
        }

        const fetchProfile = async () => {
            setLoading(true);
            const userDocRef = doc(db, 'users', uid);
            const docSnap = await getDoc(userDocRef);

            if (docSnap.exists()) {
                setUserProfile(docSnap.data() as UserProfile);
            } else {
                setUserProfile(null);
            }
            setLoading(false);
        };

        fetchProfile();
    }, [uid]);

    return { userProfile, loading };
}
