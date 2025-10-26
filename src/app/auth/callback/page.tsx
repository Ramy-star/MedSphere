
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase/provider';
import { getRedirectResult, signOut, type User } from 'firebase/auth';
import { getClaimedStudentIdUser } from '@/lib/verificationService';
import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/firebase';

export default function AuthCallbackPage() {
    const { auth } = useFirebase();
    const router = useRouter();
    const [message, setMessage] = useState('Finalizing login...');
    const [error, setError] = useState('');

    useEffect(() => {
        const handleAuthRedirect = async () => {
            try {
                // This is the core of the callback page. It processes the redirect result.
                const result = await getRedirectResult(auth);
                const pendingUsername = localStorage.getItem('pendingUsername');
                const pendingStudentId = localStorage.getItem('pendingStudentId');

                if (!result || !result.user) {
                    // This can happen if the page is reloaded or visited directly without a login attempt.
                    const currentUser = auth.currentUser;
                    if(currentUser){
                        // User is already logged in, just go home.
                        router.replace('/');
                        return;
                    }
                    setError("Authentication session not found. Please try logging in again.");
                    return;
                }

                const user = result.user;
                setMessage('Verifying your details...');

                // Check if a profile already exists for this user
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    setMessage('Welcome back! Redirecting...');
                    router.replace('/');
                    return;
                }
                
                // If profile doesn't exist, this must be a new user registration.
                if (!pendingUsername || !pendingStudentId) {
                    await signOut(auth);
                    setError('Registration details are missing. Please start the process again.');
                    return;
                }
                
                setMessage('Creating your profile...');

                const existingUserId = await getClaimedStudentIdUser(pendingStudentId);
                if (existingUserId && existingUserId !== user.uid) {
                    await signOut(auth);
                    setError('This Student ID is already linked to a different Google account.');
                    return;
                }

                // Create profile and claim student ID in a single transaction (batch)
                const studentIdRef = doc(db, 'claimedStudentIds', pendingStudentId);
                const batch = writeBatch(db);

                const newProfileData = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    username: pendingUsername,
                    studentId: pendingStudentId,
                    createdAt: new Date().toISOString(),
                };

                batch.set(userDocRef, newProfileData);
                batch.set(studentIdRef, {
                    userId: user.uid,
                    claimedAt: new Date().toISOString(),
                });

                await batch.commit();

                setMessage('Profile created! Welcome to MedSphere.');
                
                // Redirect to home page after successful profile creation
                router.replace('/');

            } catch (err: any) {
                console.error("Auth callback error:", err);
                setError(`An error occurred: ${err.message}. Please try again.`);
                if (auth.currentUser) {
                  await signOut(auth).catch(e => console.error("Sign out after error failed:", e));
                }
            } finally {
                // Clean up localStorage regardless of outcome
                localStorage.removeItem('pendingUsername');
                localStorage.removeItem('pendingStudentId');
            }
        };
        
        if (auth) {
            handleAuthRedirect();
        }

    }, [auth, router]);

    return (
        <div>
            {error ? (
                <>
                    <p className="text-red-400 font-semibold text-lg mb-2">Login Failed</p>
                    <p className="text-slate-300 max-w-md">{error}</p>
                     <button onClick={() => router.replace('/')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">Go to Login</button>
                </>
            ) : (
                <p className="text-slate-300 text-lg">{message}</p>
            )}
        </div>
    );
}
