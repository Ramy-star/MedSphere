'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Logo } from './logo';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { CreateSecretCodeScreen } from './CreateSecretCodeScreen';
import { getStudentDetails } from '@/lib/authService';

export function VerificationScreen() {
  const [studentId, setStudentId] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);
  
  const { error, loading, authState, login, createProfileAndLogin, set } = useAuthStore(state => ({
    error: state.error,
    loading: state.loading,
    authState: state.authState,
    login: state.login,
    createProfileAndLogin: state.createProfileAndLogin,
    set: useAuthStore.setState,
  }));
  
  useEffect(() => {
    const checkId = async () => {
      if (studentId.trim().length >= 8) { // Basic validation before checking
        const details = await getStudentDetails(studentId.trim());
        setIsNewUser(details.isValid && !details.isClaimed);
      } else {
        setIsNewUser(false);
      }
    };
    checkId();
  }, [studentId]);


  const handleAction = async () => {
    const trimmedId = studentId.trim();
    if (!trimmedId) return;
    await login(trimmedId, secretCode.trim() || undefined);
  };

  const handleSecretCreated = (newSecret: string) => {
    const state = useAuthStore.getState();
    if (state.authState === 'awaiting_secret_creation' && state.studentId) {
        createProfileAndLogin(state.studentId, newSecret);
    }
  }
  
  const handleOpenSecretCreation = () => {
      if (isNewUser) {
          set({ authState: 'awaiting_secret_creation', studentId: studentId.trim(), error: null });
      }
  }


  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="flex h-screen w-screen items-center justify-center bg-background p-4 overflow-hidden"
      >
        <div className="absolute top-0 left-0 -translate-x-1/3 -translate-y-1/3 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute bottom-0 right-0 translate-x-1/3 translate-y-1/3 w-96 h-96 bg-green-500/20 rounded-full blur-3xl opacity-50"></div>

        <motion.div
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
          className="relative z-10 flex flex-col items-center text-center glass-card p-8 md:p-12 rounded-[1.75rem] max-w-md w-full"
        >
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Logo className="h-20 w-20 md:h-24 md:w-24 mb-6" />
          </motion.div>

          <motion.h1
            className="text-2xl md:text-3xl font-bold mb-4 bg-gradient-to-r from-white to-slate-300 text-transparent bg-clip-text"
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            Student ID Verification
          </motion.h1>

           <motion.div
            className="text-slate-300 text-sm md:text-base max-w-sm mb-8 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.9 }}
          >
            <p className="mb-2">Enter your Student ID, then:</p>
            <ul className="list-none p-0 text-left inline-block space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1 font-bold">●</span>
                <span>
                  <strong>New user?</strong> Create your secret code first.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-1 font-bold">●</span>
                 <span>
                  <strong>Existing user?</strong> Enter your secret code to log in.
                </span>
              </li>
            </ul>
          </motion.div>
          
          <motion.div
            className="w-full max-w-xs"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.1 }}
          >
            <div className="flex flex-col gap-4">
               <Input
                type="text"
                placeholder="Enter your ID"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAction()}
                className="bg-slate-800/60 border-slate-700 text-white h-12 text-center text-lg tracking-wider rounded-2xl"
                disabled={loading}
              />
              <Input
                type="password"
                placeholder="Enter your Secret Code"
                value={secretCode}
                onChange={(e) => setSecretCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAction()}
                className="bg-slate-800/60 border-slate-700 text-white h-12 text-center text-lg tracking-wider rounded-2xl"
                disabled={loading || isNewUser}
              />

              <button 
                onClick={handleOpenSecretCreation}
                disabled={!isNewUser || loading}
                className="text-sm hover:underline text-center disabled:text-slate-500 disabled:no-underline disabled:cursor-not-allowed text-blue-400"
              >
                Don't have a secret code?
              </button>

              {error && <p className="text-red-400 text-sm">{error}</p>}
              
              <Button 
                size="lg" 
                onClick={handleAction} 
                disabled={loading || !studentId.trim()}
                className="rounded-2xl bg-slate-700/50 hover:bg-slate-700/80 text-primary-foreground font-bold text-lg h-12 transition-transform active:scale-95"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>Verify <ArrowRight className="ml-2 h-5 w-5" /></>
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
      
      <AnimatePresence>
        {authState === 'awaiting_secret_creation' && (
            <CreateSecretCodeScreen
                open={true}
                onOpenChange={(isOpen) => {
                  if (!isOpen) set({ authState: 'anonymous', studentId: null });
                }}
                onSecretCreated={handleSecretCreated}
            />
        )}
      </AnimatePresence>
    </>
  );
}
