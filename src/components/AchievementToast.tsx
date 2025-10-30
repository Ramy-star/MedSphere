'use client';
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { allAchievements, Achievement } from '@/lib/achievements';
import { Button } from './ui/button';
import { X, Check } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

const tierColors = {
  bronze: { bg: 'bg-gradient-to-br from-orange-300 to-orange-600', text: 'text-white' },
  silver: { bg: 'bg-gradient-to-br from-slate-300 to-slate-500', text: 'text-white' },
  gold: { bg: 'bg-gradient-to-br from-yellow-300 to-yellow-500', text: 'text-gray-900' },
  special: { bg: 'bg-gradient-to-br from-purple-400 to-indigo-600', text: 'text-white' },
};

const ConfettiPiece = ({ id, color, left, delay, duration }: { id: number, color: string, left: string, delay: string, duration: string }) => (
    <div
        className="confetti"
        style={{
            backgroundColor: color,
            left: left,
            animationDelay: delay,
            animationDuration: duration,
        }}
    />
);


export const AchievementToast = ({ achievement }: { achievement: Achievement }) => {
    const [show, setShow] = useState(false);
    const clearNewlyEarnedAchievement = useAuthStore(state => state.clearNewlyEarnedAchievement);

    useEffect(() => {
        const timer = setTimeout(() => setShow(true), 500); // Small delay to allow page transition
        return () => clearTimeout(timer);
    }, [achievement]);

    const handleClose = () => {
        setShow(false);
        setTimeout(clearNewlyEarnedAchievement, 300); // Allow for exit animation
    };
    
    const colors = tierColors[achievement.tier] || tierColors.bronze;
    const { icon: Icon } = achievement;
    
    const confettiPieces = Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      color: ['#fde68a', '#fca5a5', '#86efac', '#93c5fd'][Math.floor(Math.random() * 4)],
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 2}s`,
      duration: `${2 + Math.random() * 2}s`
    }));

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, y: 100, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 50, scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4"
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

                    {/* Confetti Container */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        {confettiPieces.map(p => <ConfettiPiece key={p.id} {...p} />)}
                    </div>

                    {/* Toast Content */}
                    <div className="relative w-full max-w-sm rounded-3xl border border-white/20 bg-slate-800/50 p-6 text-center shadow-2xl">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-3 right-3 h-8 w-8 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
                            onClick={handleClose}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                        <motion.div
                            initial={{ scale: 0.5, rotate: -15 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 }}
                            className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/50 ${colors.bg}`}
                        >
                            <Icon className={`h-10 w-10 ${colors.text}`} />
                        </motion.div>
                        <p className="text-sm font-semibold uppercase tracking-wider text-yellow-400">
                            Achievement Unlocked!
                        </p>
                        <h3 className="mt-2 text-2xl font-bold text-white">
                            {achievement.name}
                        </h3>
                        <p className="mt-2 text-sm text-slate-300">
                            {achievement.description}
                        </p>
                        <Button onClick={handleClose} className="mt-6 rounded-full bg-white/20 text-white hover:bg-white/30">
                            <Check className="mr-2 h-4 w-4"/>
                            Got it!
                        </Button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
