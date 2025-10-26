
'use client';

import { useUser } from '@/firebase/auth/use-user';
import { Logo } from './logo';
import { AuthButton } from './auth-button';
import { motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { db } from '@/firebase';
import { doc, getDoc, writeBatch, getDocs, collection, query, where } from 'firebase/firestore';
import { GoogleAuthProvider, setPersistence, browserLocalPersistence, signInWithPopup, signInWithRedirect, getAuth, signOut } from 'firebase/auth';
import { useFirebase } from '@/firebase/provider';
import { GoogleIcon } from './icons/GoogleIcon';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useUsernameAvailability } from '@/hooks/use-username-availability';
import { getClaimedStudentIdUser } from '@/lib/verificationService';


const VERIFIED_STUDENT_ID_KEY = 'medsphere-verified-student-id';


// --- Profile Setup Form ---
function ProfileSetupForm() {
    const { auth } = useFirebase();
    const [username, setUsername] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const { isAvailable, isLoading: isCheckingUsername, debouncedUsername } = useUsernameAvailability(username);

    const isUsernameValid = username.trim().length >= 3 && /^[a-zA-Z0-9_ ]+$/.test(username);
    const canSubmit = isUsernameValid && isAvailable === true && !isCheckingUsername;

    const handleGoogleSignIn = async () => {
        if (!canSubmit) return;
        
        const studentId = localStorage.getItem(VERIFIED_STUDENT_ID_KEY);
        if (!studentId) {
            toast({
                variant: 'destructive',
                title: 'Verification Error',
                description: 'Could not find your verified Student ID. Please start over.',
            });
            window.location.href = '/'; 
            return;
        }
        
        setIsSubmitting(true);
        try {
            // Check if student ID is already claimed before showing Google popup
            const claimingUser = await getClaimedStudentIdUser(studentId);
            if (claimingUser) {
                // This is a simplified check. In a real app, you'd want to be more specific
                // if the claimingUser is the current user re-authenticating, but for now,
                // if it's claimed at all by anyone, we show an error before popup.
                // A more advanced flow would let the user sign in to see if THEY are the owner.
                throw new Error("This Student ID is already registered with a different Google account.");
            }
            
            await setPersistence(auth, browserLocalPersistence);
            
            // Store username temporarily before redirect
            localStorage.setItem('pendingUsername', username.trim());

            const provider = new GoogleAuthProvider();

            try {
                const result = await signInWithPopup(auth, provider);
                const user = result.user;

                // Create user profile and claim student ID in a transaction
                const userRef = doc(db, 'users', user.uid);
                const studentIdRef = doc(db, 'claimedStudentIds', studentId);
                const batch = writeBatch(db);
                
                batch.set(userRef, {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    username: username.trim(),
                    studentId: studentId,
                    createdAt: new Date().toISOString(),
                });

                batch.set(studentIdRef, {
                    userId: user.uid,
                    claimedAt: new Date().toISOString(),
                });

                await batch.commit();
                
                localStorage.removeItem(VERIFIED_STUDENT_ID_KEY);
                localStorage.removeItem('pendingUsername');

            } catch (popupError: any) {
                if (['auth/popup-blocked', 'auth/popup-closed-by-user', 'auth/operation-not-allowed'].includes(popupError.code)) {
                    // Fallback to redirect if popup fails
                    await signInWithRedirect(auth, provider);
                } else {
                    throw popupError;
                }
            }
        } catch (err: any) {
            console.error('Login error', err);
            toast({
                variant: 'destructive',
                title: 'Login Failed',
                description: err?.message || 'An unknown error occurred.',
            });
            setIsSubmitting(false);
            localStorage.removeItem('pendingUsername');
        }
    };

    const getUsernameHint = () => {
        if (username.length > 0 && !isUsernameValid) {
            return <p className="text-xs text-red-400 mt-1.5">Use only letters, numbers, spaces, and underscores (_).</p>;
        }
        if (debouncedUsername.length >= 3 && isCheckingUsername) {
            return <p className="text-xs text-slate-400 mt-1.5">Checking availability...</p>;
        }
        if (debouncedUsername.length >= 3 && !isCheckingUsername) {
            if (isAvailable) {
                return <p className="text-xs text-green-400 mt-1.5 flex items-center gap-1"><CheckCircle2 size={14}/> Available!</p>;
            } else if (isAvailable === false) {
                 return <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1"><XCircle size={14} /> Not available.</p>;
            }
        }
        return <p className="text-xs text-slate-500 mt-1.5">Must be at least 3 characters in English only.</p>;
    }


    return (
        <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
            className="relative z-10 flex flex-col items-center text-center glass-card p-8 md:p-12 rounded-[1.75rem] max-w-md w-full"
        >
            <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.5 }}>
                <Logo className="h-20 w-20 md:h-24 md:w-24 mb-6" />
            </motion.div>
            <motion.h1 className="text-2xl md:text-3xl font-bold mb-2 bg-gradient-to-r from-white to-slate-300 text-transparent bg-clip-text" initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.7 }}>
                Create Your Profile
            </motion.h1>
            <motion.p className="text-slate-300 text-sm md:text-base max-w-sm mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.9 }}>
                Choose a unique username, then sign in with Google to create your account.
            </motion.p>
            <motion.div className="w-full max-w-sm flex flex-col gap-4" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 1.1 }}>
                <div className="relative w-full text-left">
                    <Input
                        type="text"
                        placeholder="Choose a username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="bg-slate-800/60 border-slate-700 text-white h-12 text-base rounded-2xl pl-4 pr-10"
                        disabled={isSubmitting}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {isCheckingUsername ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : null}
                    </div>
                     <div className="px-2 h-5">
                        {getUsernameHint()}
                     </div>
                </div>

                <Button onClick={handleGoogleSignIn} disabled={!canSubmit || isSubmitting} size="lg" className="rounded-2xl h-12 text-base font-semibold transition-transform active:scale-95 bg-slate-700/50 hover:bg-slate-700/80 text-white">
                    {isSubmitting ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                        <GoogleIcon className="mr-2 h-5 w-5" />
                    )}
                    Sign in with Google
                </Button>
            </motion.div>
        </motion.div>
    )
}

// A simplified version of user profile for this component's state
type UserProfile = {
    username: string;
};


export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: userLoading } = useUser();
  const [profileState, setProfileState] = useState<'loading' | 'needs-setup' | 'complete'>('loading');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const checkUserProfile = async () => {
      // 1. If Firebase auth is still loading, wait.
      if (userLoading) {
        setProfileState('loading');
        return;
      }

      // 2. If no user is logged in, they need to sign up.
      if (!user) {
        setProfileState('needs-setup');
        setUserProfile(null);
        return;
      }
      
      // 3. User is logged in. Check for their profile document in Firestore.
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists() && userSnap.data().username) {
        // 3a. Profile exists and is complete.
        const profile = userSnap.data() as UserProfile;
        setUserProfile(profile);
        setProfileState('complete');
      } else {
        // 3b. Profile does not exist or is incomplete. This can happen after a redirect.
        const pendingUsername = localStorage.getItem('pendingUsername');
        const studentId = localStorage.getItem(VERIFIED_STUDENT_ID_KEY);
        
        if (pendingUsername && studentId) {
             // We have the pending data. Let's create the profile.
             const claimingUser = await getClaimedStudentIdUser(studentId);
             if (claimingUser && claimingUser !== user.uid) {
                // This ID is claimed by someone else. This is a problem.
                // Sign the user out and let them start again.
                signOut(getAuth());
                localStorage.removeItem('pendingUsername');
                localStorage.removeItem(VERIFIED_STUDENT_ID_KEY);
                setProfileState('needs-setup');
                return;
             }

             // Create the profile in a transaction
             const userRef = doc(db, 'users', user.uid);
             const studentIdRef = doc(db, 'claimedStudentIds', studentId);
             const batch = writeBatch(db);
             
             const newProfileData = {
                 uid: user.uid,
                 email: user.email,
                 displayName: user.displayName,
                 photoURL: user.photoURL,
                 username: pendingUsername,
                 studentId: studentId,
                 createdAt: new Date().toISOString(),
             };

             batch.set(userRef, newProfileData);
             batch.set(studentIdRef, {
                 userId: user.uid,
                 claimedAt: new Date().toISOString(),
             });

             await batch.commit();

             // Cleanup localStorage and IMPORTANTLY, update the state
             localStorage.removeItem('pendingUsername');
             localStorage.removeItem(VERIFIED_STUDENT_ID_KEY);
             setUserProfile({ username: newProfileData.username });
             setProfileState('complete');
        } else {
            // User is logged in, but no profile and no pending data.
            // This means they need to go through the setup process.
            setUserProfile(null);
            setProfileState('needs-setup');
        }
      }
    };

    checkUserProfile();
  }, [user, userLoading]);

  if (profileState === 'loading') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Logo className="h-16 w-16 animate-pulse" />
          <p className="text-slate-400">Authenticating...</p>
        </div>
      </div>
    );
  }

  // If user is not logged in OR is logged in but hasn't set a username yet
  if (profileState === 'needs-setup') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex h-screen w-screen items-center justify-center bg-background p-4"
      >
        <div className="absolute top-0 left-0 -translate-x-1/3 -translate-y-1/3 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute bottom-0 right-0 translate-x-1/3 translate-y-1/3 w-96 h-96 bg-green-500/20 rounded-full blur-3xl opacity-50"></div>

        <ProfileSetupForm />
        
      </motion.div>
    );
  }

  return <>{children}</>;
}
