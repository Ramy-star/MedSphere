
'use client';

import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Logo } from './logo';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

export function CreateSecretCodeScreen() {
    const [secretCode, setSecretCode] = useState('');
    const [confirmSecretCode, setConfirmSecretCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSecret, setShowSecret] = useState(false);

    const { studentId, createProfileAndLogin } = useAuthStore(state => ({
        studentId: state.studentId,
        createProfileAndLogin: state.createProfileAndLogin,
    }));

    const handleCreate = async () => {
        if (secretCode.length < 6) {
            setError("Secret code must be at least 6 characters.");
            return;
        }
        if (secretCode !== confirmSecretCode) {
            setError("Secret codes do not match.");
            return;
        }
        
        setError(null);
        setIsSubmitting(true);
        if (studentId) {
            try {
                await createProfileAndLogin(studentId, secretCode);
                // Success will be handled by the auth store, which will change the app state.
            } catch (e: any) {
                 setError(e.message || "An unexpected error occurred.");
                 setIsSubmitting(false);
            }
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
            <div className="absolute top-0 left-0 -translate-x-1/3 -translate-y-1/3 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl opacity-50"></div>
            <div className="absolute bottom-0 right-0 translate-x-1/3 translate-y-1/3 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl opacity-50"></div>

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
                    Create Your Secret Code
                </motion.h1>

                <motion.p
                    className="text-slate-300 text-sm md:text-base max-w-sm mb-8"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.9 }}
                >
                    This will be used to log in on other devices. Keep it safe!
                </motion.p>

                <motion.div
                    className="w-full max-w-xs"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 1.1 }}
                >
                    <div className="flex flex-col gap-4">
                        <div className="relative">
                            <Input
                                type={showSecret ? "text" : "password"}
                                placeholder="Create Secret Code (min. 6 characters)"
                                value={secretCode}
                                onChange={(e) => setSecretCode(e.target.value)}
                                className="bg-slate-800/60 border-slate-700 text-white h-12 text-center text-lg tracking-wider rounded-2xl pr-10"
                                disabled={isSubmitting}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-400"
                                onClick={() => setShowSecret(!showSecret)}
                            >
                                {showSecret ? <EyeOff size={20} /> : <Eye size={20} />}
                            </Button>
                        </div>
                        <Input
                            type={showSecret ? "text" : "password"}
                            placeholder="Confirm Secret Code"
                            value={confirmSecretCode}
                            onChange={(e) => setConfirmSecretCode(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                            className="bg-slate-800/60 border-slate-700 text-white h-12 text-center text-lg tracking-wider rounded-2xl"
                            disabled={isSubmitting}
                        />

                        {error && <p className="text-red-400 text-sm">{error}</p>}

                        <Button
                            size="lg"
                            onClick={handleCreate}
                            disabled={isSubmitting || !secretCode || !confirmSecretCode}
                            className="rounded-2xl bg-slate-700/50 hover:bg-slate-700/80 text-primary-foreground font-bold text-lg h-12 transition-transform active:scale-95"
                        >
                            {isSubmitting ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <>Create & Login <ArrowRight className="ml-2 h-5 w-5" /></>
                            )}
                        </Button>
                    </div>
                </motion.div>
            </motion.div>
        </motion.div>
    );
}

