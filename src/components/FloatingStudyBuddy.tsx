'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Maximize, Shrink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/auth-store';
import { AiAssistantIcon } from './icons/AiAssistantIcon';
import { AiStudyBuddy } from './profile/AiStudyBuddy';

export function FloatingStudyBuddy() {
    const { user } = useAuthStore();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    if (!user) {
        return null;
    }

    const toggleExpansion = () => {
        setIsExpanded(prev => !prev);
    };

    const handleIconClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isExpanded) {
            setIsOpen(prev => !prev);
        } else {
            setIsOpen(true);
        }
    };
    
    const containerVariants = {
        collapsed: {
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            bottom: '2rem',
            right: '2rem',
            transition: { type: 'spring', stiffness: 300, damping: 30 }
        },
        expanded: {
            width: 'min(90vw, 500px)',
            height: 'min(80vh, 600px)',
            borderRadius: '1.5rem',
            bottom: '2rem',
            right: '2rem',
            transition: { type: 'spring', stiffness: 400, damping: 40 }
        }
    };

    return (
        <>
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                        onClick={() => { setIsExpanded(false); setIsOpen(false); }}
                    />
                )}
            </AnimatePresence>
            <motion.div
                layout
                variants={containerVariants}
                initial="collapsed"
                animate={isExpanded ? 'expanded' : 'collapsed'}
                className="fixed z-50 shadow-2xl glass-card flex flex-col overflow-hidden"
                style={{
                    backgroundColor: isExpanded ? 'rgba(30, 41, 59, 0.5)' : 'rgba(30, 41, 59, 0.8)',
                    backgroundImage: isExpanded ? 'none' : `radial-gradient(ellipse 180% 170% at 0% 0%, rgba(209, 171, 35, 0.6), transparent 90%)`
                }}
            >
                <div className="w-full h-full">
                    {isExpanded ? (
                        isOpen && <AiStudyBuddy user={user} isExpanded={true} onToggleExpand={toggleExpansion} />
                    ) : (
                        <div
                            className="w-full h-full flex items-center justify-center cursor-pointer"
                            onClick={() => { setIsExpanded(true); setTimeout(() => setIsOpen(true), 100); }}
                            title="Open AI Study Buddy"
                        >
                            <AiAssistantIcon className="w-8 h-8" />
                        </div>
                    )}
                </div>
            </motion.div>
        </>
    );
}
