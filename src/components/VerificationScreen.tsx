'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Logo } from './logo';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2 } from 'lucide-react';
import { isStudentIdValid } from '@/lib/verificationService';

const VERIFIED_STUDENT_ID_KEY = 'medsphere-verified-student-id';

type VerificationScreenProps = {
  onVerified: () => void;
};

export function VerificationScreen({ onVerified }: VerificationScreenProps) {
  const [studentId, setStudentId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerification = async () => {
    if (!studentId.trim()) {
      setError('Please enter your Student ID.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const isValid = await isStudentIdValid(studentId);
      if (isValid) {
        // Store the verified ID in localStorage to be picked up by the AuthGuard
        localStorage.setItem(VERIFIED_STUDENT_ID_KEY, studentId.trim());
        onVerified();
      } else {
        setError('Invalid Student ID. Please check and try again.');
      }
    } catch (e) {
      console.error('Verification failed:', e);
      setError('An error occurred. Please try again later.');
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
             <Input
              type="text"
              placeholder="Enter your ID"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerification()}
              className="bg-slate-800/60 border-slate-700 text-white h-12 text-center text-lg tracking-wider rounded-2xl"
              disabled={isLoading}
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <Button 
              size="lg" 
              onClick={handleVerification} 
              disabled={isLoading}
              className="rounded-2xl bg-slate-700/50 hover:bg-slate-700/80 text-primary-foreground font-bold text-lg h-12 transition-transform active:scale-95"
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
