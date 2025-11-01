'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/auth-store';
import { AiAssistantIcon } from '../icons/AiAssistantIcon';
import { AiStudyBuddy } from './AiStudyBuddy';
import { X } from 'lucide-react';

export const FloatingAssistant = ({ user }: { user: typeof useAuthStore.arguments.user }) => {
    const [isOpen, setIsOpen] = useState(false);

    if (!user) {
        return null;
    }

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                        className="fixed bottom-24 right-6 w-[90vw] max-w-md h-[70vh] max-h-[600px] z-50 shadow-2xl rounded-3xl"
                    >
                         <AiStudyBuddy user={user} isFloating={true} />
                    </motion.div>
                )}
            </AnimatePresence>
            <div className="fixed bottom-6 right-6 z-50">
                 <motion.button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg flex items-center justify-center"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
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
                                <X className="w-7 h-7 text-white" />
                            ) : (
                                <AiAssistantIcon className="w-8 h-8" />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </motion.button>
            </div>
        </>
    );
};
