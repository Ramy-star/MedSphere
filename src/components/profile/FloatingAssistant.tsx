
'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { AiAssistantIcon } from '../icons/AiAssistantIcon';
import { AiStudyBuddy } from './AiStudyBuddy';
import type { UserProfile } from '@/stores/auth-store';

export const FloatingAssistant = ({ user }: { user: UserProfile }) => {
    const [isOpen, setIsOpen] = useState(false);

    if (!user) return null;

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                        className="fixed bottom-24 right-6 w-[90vw] max-w-md h-[60vh] max-h-[500px] z-50 shadow-2xl rounded-3xl"
                    >
                         <AiStudyBuddy user={user} />
                    </motion.div>
                )}
            </AnimatePresence>
            <div className="fixed bottom-6 right-6 z-50">
                <Button
                    size="icon"
                    className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <AiAssistantIcon className="w-8 h-8" />
                </Button>
            </div>
        </>
    );
};
