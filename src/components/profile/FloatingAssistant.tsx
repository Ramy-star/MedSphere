'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/auth-store';
import { AiAssistantIcon } from '../icons/AiAssistantIcon';
import { AiStudyBuddy } from './AiStudyBuddy';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const FloatingAssistant = ({ user }: { user: ReturnType<typeof useAuthStore.getState>['user'] }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    if (!user) {
        return null;
    }

    const toggleExpand = () => setIsExpanded(prev => !prev);
    
    const containerVariants = {
        closed: {
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            transition: { type: 'spring', stiffness: 400, damping: 30 }
        },
        open: {
            width: 'min(90vw, 420px)',
            height: 'min(75vh, 650px)',
            borderRadius: '1.5rem',
            transition: { type: 'spring', stiffness: 400, damping: 40 }
        },
        expanded: {
            width: '95vw',
            height: '90vh',
            borderRadius: '1.5rem',
            transition: { type: 'spring', stiffness: 400, damping: 40 }
        }
    };
    
    const currentVariant = isExpanded ? 'expanded' : isOpen ? 'open' : 'closed';

    return (
        <>
            <div className="fixed bottom-6 right-6 z-50">
                <motion.div
                    layout
                    variants={containerVariants}
                    initial="closed"
                    animate={currentVariant}
                    className="shadow-2xl glass-card flex flex-col overflow-hidden"
                    style={{
                        backgroundColor: 'rgba(30, 41, 59, 0.5)',
                    }}
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
                                <AiStudyBuddy user={user} isFloating={true} onToggleExpand={toggleExpand} />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
                
                 <motion.button
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        "w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg flex items-center justify-center absolute",
                         isOpen ? "bottom-[calc(100%_-_24px)] right-0" : "bottom-0 right-0"
                    )}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    aria-label={isOpen ? "Close Study Buddy" : "Open Study Buddy"}
                    animate={isOpen ? { width: 40, height: 40 } : { width: 56, height: 56 } }
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
        </>
    );
};
