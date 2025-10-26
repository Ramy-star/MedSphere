'use client';

import { useUser } from '@/firebase/auth/use-user';
import { Logo } from './logo';
import { Button } from './ui/button';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Input } from './ui/input';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { GoogleAuthProvider, setPersistence, browserLocalPersistence, signInWithRedirect } from 'firebase/auth';
import { useFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';
import { useUsernameAvailability } from '@/hooks/use-username-availability';
import { GoogleIcon } from './icons/GoogleIcon';


const VERIFIED_STUDENT_ID_KEY = 'medsphere-verified-student-id';

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
            // Save info to localStorage. The `useUser` hook will read it on redirect.
            localStorage.setItem('pendingUsername', username.trim());
            localStorage.setItem('pendingStudentId', studentId);

            await setPersistence(auth, browserLocalPersistence);
            const provider = new GoogleAuthProvider();
            await signInWithRedirect(auth, provider);

        } catch (err: any) {
            console.error('Login initiation error', err);
            toast({
                variant: 'destructive',
                title: 'Login Failed',
                description: err?.message || 'An unknown error occurred while trying to sign in.',
            });
            setIsSubmitting(false);
            localStorage.removeItem('pendingUsername');
            localStorage.removeItem('pendingStudentId');
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

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, profileExists, isProcessingRedirect } = useUser();
  
  // Show a loading screen while the initial auth state is being determined OR
  // while the redirect result is being processed.
  if (loading || isProcessingRedirect) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Logo className="h-16 w-16 animate-pulse" />
          <p className="text-slate-400">Authenticating...</p>
        </div>
      </div>
    );
  }

  // If user is logged in and has a profile, show the app.
  if (user && profileExists) {
    if (user.profile?.roles?.isBlocked) {
        // This case should be handled by useUser hook which signs out the user,
        // but as a fallback, we show a blocked message.
         return (
            <div className="flex h-screen w-screen items-center justify-center bg-background p-4">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-500">Account Blocked</h1>
                    <p className="text-slate-400 mt-2">Your account has been blocked. Please contact an administrator.</p>
                </div>
            </div>
        );
    }
    return <>{children}</>;
  }
  
  // If no user OR user is logged in but doesn't have a profile, show the setup form.
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex h-screen w-screen items-center justify-center bg-background p-4 overflow-hidden"
    >
      <div className="absolute top-0 left-0 -translate-x-1/3 -translate-y-1/3 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl opacity-50"></div>
      <div className="absolute bottom-0 right-0 translate-x-1/3 translate-y-1/3 w-96 h-96 bg-green-500/20 rounded-full blur-3xl opacity-50"></div>
      <ProfileSetupForm />
    </motion.div>
  );
}
