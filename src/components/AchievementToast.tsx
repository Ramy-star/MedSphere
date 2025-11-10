'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { allAchievementsData, Achievement } from '@/lib/achievements';
import { Button } from '@/components/ui/button';
import { X, Check, UploadCloud, FolderPlus, FolderKanban, Library, FileCheck2, GraduationCap, MessageSquareQuote, BrainCircuit, Sunrise, CalendarDays, HeartHandshake, Moon, Compass } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

const iconMap: { [key: string]: React.ElementType } = {
    UploadCloud, FolderPlus, FolderKanban, Library, FileCheck2, GraduationCap,
    MessageSquareQuote, BrainCircuit, Sunrise, CalendarDays, HeartHandshake, Moon, Compass
};

export const allAchievementsWithIcons: Achievement[] = allAchievementsData.map(ach => {
    let icon = UploadCloud; // Default
    if (ach.id === 'FIRST_LOGIN') icon = Sunrise;
    else if (ach.id.startsWith('LOGIN_STREAK')) icon = CalendarDays;
    else if (ach.id === 'ONE_YEAR_MEMBER') icon = HeartHandshake;
    else if (ach.id === 'NIGHT_OWL') icon = Moon;
    else if (ach.id === 'EXPLORER') icon = Compass;
    else if (ach.group === 'filesUploaded') icon = UploadCloud;
    else if (ach.group === 'foldersCreated') {
      if (ach.id.includes('100')) icon = Library;
      else if (ach.id.includes('50')) icon = FolderKanban;
      else icon = FolderPlus;
    }
    else if (ach.group === 'examsCompleted') {
       if (ach.id.includes('100')) icon = GraduationCap;
       else icon = FileCheck2;
    }
    else if (ach.group === 'aiQueries') {
      if (ach.id.includes('500')) icon = BrainCircuit;
      else icon = MessageSquareQuote;
    }
    return {
        ...ach,
        icon,
    };
});

const tierColors = {
  bronze: { bg: 'bg-gradient-to-br from-orange-300 to-orange-600', text: 'text-white', icon: 'text-white' },
  silver: { bg: 'bg-gradient-to-br from-slate-300 to-slate-500', text: 'text-white', icon: 'text-white' },
  gold: { bg: 'bg-gradient-to-br from-yellow-300 to-yellow-500', text: 'text-gray-900', icon: 'text-yellow-800' },
  special: { bg: 'bg-gradient-to-br from-purple-400 to-indigo-600', text: 'text-white', icon: 'text-white' },
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


export const AchievementToast = ({ achievement: rawAchievement }: { achievement: Omit<Achievement, 'icon'> }) => {
    const [show, setShow] = useState(false);
    const clearNewlyEarnedAchievement = useAuthStore(state => state.clearNewlyEarnedAchievement);

    const achievement = useMemo(() => {
        const fullAchievement = allAchievementsWithIcons.find(a => a.id === rawAchievement.id);
        return fullAchievement ? { ...rawAchievement, icon: fullAchievement.icon } : null;
    }, [rawAchievement]);

    useEffect(() => {
        const timer = setTimeout(() => setShow(true), 500); // Small delay to allow page transition
        return () => clearTimeout(timer);
    }, [achievement]);

    const handleClose = () => {
        setShow(false);
        setTimeout(clearNewlyEarnedAchievement, 300); // Allow for exit animation
    };
    
    if (!achievement) return null;

    const isGoodStart = achievement.id === 'FIRST_LOGIN';
    const specialSilverStyle = {
        bg: 'bg-gradient-to-br from-slate-400 to-slate-600',
        icon: 'text-white'
    };

    const colors = tierColors[achievement.tier] || tierColors.bronze;
    const { icon: Icon } = achievement;
    
    const confettiPieces = Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      color: ['#a7f3d0', '#fecaca', '#bfdbfe', '#fef08a'][Math.floor(Math.random() * 4)],
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 3}s`,
      duration: `${3 + Math.random() * 3}s`
    }));

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4"
                >
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} 
                    />

                    {/* Confetti Container */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        {confettiPieces.map(p => (
                             <div
                                key={p.id}
                                className="confetti"
                                style={{
                                    backgroundColor: p.color,
                                    left: p.left,
                                    animationDelay: p.delay,
                                    animationDuration: p.duration,
                                    width: '12px',
                                    height: '12px'
                                }}
                            />
                        ))}
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
                            className={cn(
                                "mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/50",
                                isGoodStart ? specialSilverStyle.bg : colors.bg
                            )}
                        >
                            <Icon className={cn("h-10 w-10", isGoodStart ? specialSilverStyle.icon : colors.icon)} />
                        </motion.div>
                        <p className="text-sm font-semibold uppercase tracking-wider text-green-400">
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
