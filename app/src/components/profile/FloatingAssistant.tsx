
'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UserProfile } from '@/stores/auth-store';
import { AiAssistantIcon } from '../icons/AiAssistantIcon';
import { AiStudyBuddy } from './AiStudyBuddy';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFloatingAssistantStore } from '@/stores/floating-assistant-store';

export const FloatingAssistant = ({ user }: { user: UserProfile | null }) => {
    const { isOpen, isExpanded, toggle, toggleExpand } = useFloatingAssistantStore();

    if (!user) {
        return null;
    }

    const handleToggleOpen = (e: React.MouseEvent) => {
        e.stopPropagation();
        toggle();
    };

    const containerVariants = {
        closed: {
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            transition: { duration: 0.3, ease: 'easeInOut' }
        },
        open: {
            width: 'min(90vw, 440px)',
            height: 'min(70vh, 650px)',
            borderRadius: '1.5rem',
            transition: { type: 'spring', stiffness: 220, damping: 28, mass: 0.9 }
        },
        expanded: {
            width: '75vw',
            height: '80vh',
            borderRadius: '1.5rem',
            transition: { type: 'spring', stiffness: 250, damping: 30, mass: 0.9 }
        }
    };
    
    const currentVariant = isExpanded ? 'expanded' : isOpen ? 'open' : 'closed';

    return (
        <div className="fixed bottom-6 right-6 z-50">
            <motion.div
                layout
                variants={containerVariants}
                initial="closed"
                animate={currentVariant}
                className="shadow-2xl glass-card flex flex-col overflow-hidden"
                style={{
                    backgroundColor: 'rgba(30, 41, 59, 0.8)',
                }}
                onClick={(e) => e.stopPropagation()} 
            >
                <AnimatePresence>
                    {isOpen && (
                        <motion.div 
                            key="buddy-content"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1, transition: { delay: 0.1 } }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="w-full h-full"
                        >
                            <AiStudyBuddy 
                                user={user} 
                                isFloating={true} 
                                onToggleExpand={toggleExpand} 
                                isExpanded={isExpanded} 
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
            
             <motion.button
                onClick={handleToggleOpen}
                className={cn(
                    "w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg flex items-center justify-center absolute",
                     isOpen ? "bottom-[calc(100%_-_28px)] right-0" : "bottom-0 right-0"
                )}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label={isOpen ? "Close Study Buddy" : "Open Study Buddy"}
                animate={isOpen ? { width: 48, height: 48 } : { width: 56, height: 56 } }
            >
                <AnimatePresence mode="wait">
                    <motion.div
                        key={isOpen ? 'close' : 'open'}
                        initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                        animate={{ rotate: 0, opacity: 1, scale: 1 }}
                        exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                        transition={{ duration: 0.2 }}
                        className="absolute"
                    >
                        {isOpen ? (
                            <X className="w-5 h-5 text-white" />
                        ) : (
                            <AiAssistantIcon className="w-7 h-7" />
                        )}
                    </motion.div>
                </AnimatePresence>
            </motion.button>
        </div>
    );
};
