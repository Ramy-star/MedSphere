'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Logo } from './logo';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { isStudentIdValid } from '@/lib/authService';
import { db } from '@/firebase';

function VerificationContent({ onVerified }: { onVerified: () => void }) {
  const [studentId, setStudentId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<'checking' | 'ready' | 'error'>('checking');
  const login = useAuthStore((state) => state.login);

  // Check Firebase initialization on mount
  useEffect(() => {
    console.log('[VERIFICATION] Checking Firebase initialization...');

    if (!db) {
      console.error('[VERIFICATION] ✗ Firebase not initialized!');
      setDbStatus('error');
      setError('Database connection failed. Please refresh the page.');
    } else {
      console.log('[VERIFICATION] ✓ Firebase initialized successfully');
      setDbStatus('ready');
    }
  }, []);

  const handleVerification = async () => {
    const trimmedId = studentId.trim();

    console.log('[VERIFICATION] Starting verification for ID:', trimmedId);

    if (!trimmedId) {
      setError('Please enter your Student ID.');
      return;
    }

    // Check Firebase status first
    if (!db) {
      console.error('[VERIFICATION] ✗ Cannot proceed: Firebase not initialized');
      setError('Database connection not available. Please refresh the page.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('[VERIFICATION] Step 1: Validating Student ID...');

      // Client-side quick check first to fail fast
      const isValid = await isStudentIdValid(trimmedId);

      if (!isValid) {
        console.log('[VERIFICATION] ✗ ID validation failed');
        setError('Invalid Student ID. Please check and try again.');
        setIsLoading(false);
        return;
      }

      console.log('[VERIFICATION] ✓ ID validated, proceeding to login...');

      // If valid locally, proceed with the full login/creation logic
      const success = await login(trimmedId);

      if (success) {
        console.log('[VERIFICATION] ✓ Login successful!');
        // onVerified is now implicitly handled by the auth store state change
      } else {
        console.error('[VERIFICATION] ✗ Login failed');
        setError('Could not complete verification. Please check console for details and try again.');
      }
    } catch (err: any) {
      console.error('[VERIFICATION] ✗ Unexpected error during verification:', err);
      console.error('[VERIFICATION] Error name:', err.name);
      console.error('[VERIFICATION] Error message:', err.message);
      console.error('[VERIFICATION] Error stack:', err.stack);

      // Provide more specific error messages
      if (err.code === 'permission-denied') {
        setError('Access denied. Please contact administrator.');
      } else if (err.code === 'unavailable') {
        setError('Service temporarily unavailable. Please try again.');
      } else if (err.message?.includes('network')) {
        setError('Network error. Please check your connection.');
      } else {
        setError(`Verification failed: ${err.message || 'Unknown error'}. Check console for details.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
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

        <motion.p
          className="text-slate-300 text-sm md:text-base max-w-sm mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.9 }}
        >
          Please enter your university student ID to access MedSphere.
        </motion.p>
        
        <motion.div
          className="w-full max-w-xs"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.1 }}
        >
          <div className="flex flex-col gap-4">
            {/* Database Status Indicator */}
            {dbStatus === 'checking' && (
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Connecting to database...</span>
              </div>
            )}
            {dbStatus === 'error' && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 p-2 rounded">
                <AlertCircle className="h-4 w-4" />
                <span>Database connection failed</span>
              </div>
            )}

             <Input
              type="text"
              placeholder="Enter your ID"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isLoading && dbStatus === 'ready' && handleVerification()}
              className="bg-slate-800/60 border-slate-700 text-white h-12 text-center text-lg tracking-wider rounded-2xl"
              disabled={isLoading || dbStatus !== 'ready'}
            />
            {error && (
              <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                {error}
              </div>
            )}
            <Button
              size="lg"
              onClick={handleVerification}
              disabled={isLoading || !studentId.trim() || dbStatus !== 'ready'}
              className="rounded-2xl bg-slate-700/50 hover:bg-slate-700/80 text-primary-foreground font-bold text-lg h-12 transition-transform active:scale-95 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>Verify <ArrowRight className="ml-2 h-5 w-5" /></>
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}


export function VerificationScreen({ onVerified }: { onVerified: () => void }) {
    return (
        <VerificationContent onVerified={onVerified} />
    )
}
