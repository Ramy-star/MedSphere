
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getStudyBuddyInsight } from '@/ai/flows/study-buddy-flow';
import { answerStudyBuddyQuery } from '@/ai/flows/study-buddy-chat-flow';
import type { UserProfile } from '@/stores/auth-store';
import { AiAssistantIcon } from '../icons/AiAssistantIcon';

type Suggestion = {
    label: string;
    prompt: string; 
};

type InitialInsight = {
    greeting: string;
    mainInsight: string;
    suggestedActions: Suggestion[];
};

export function AiStudyBuddy({ user }: { user: UserProfile }) {
    const [initialInsight, setInitialInsight] = useState<InitialInsight | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentResponse, setCurrentResponse] = useState<string | null>(null);
    const [isResponding, setIsResponding] = useState(false);
    const [customQuestion, setCustomQuestion] = useState('');

    const fetchInitialInsight = useCallback(async () => {
        setLoading(true);
        const userStats = {
            displayName: user.displayName || user.username,
            username: user.username,
            filesUploaded: user.stats?.filesUploaded || 0,
            foldersCreated: user.stats?.foldersCreated || 0,
            examsCompleted: user.stats?.examsCompleted || 0,
            aiQueries: user.stats?.aiQueries || 0,
            favoritesCount: user.favorites?.length || 0,
        };
        try {
            const result = await getStudyBuddyInsight(userStats);
            setInitialInsight(result);
            setCurrentResponse(result.mainInsight);
        } catch (e) {
            console.error("Failed to get study buddy insight", e);
            setInitialInsight(null);
            setCurrentResponse("I'm having a little trouble connecting right now. Please try again in a moment.");
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchInitialInsight();
    }, [fetchInitialInsight]);

    const submitQuery = async (prompt: string) => {
        setIsResponding(true);
        setCurrentResponse(null); // Clear previous response
        try {
            const userStats = {
                displayName: user.displayName || user.username,
                username: user.username,
                filesUploaded: user.stats?.filesUploaded || 0,
                foldersCreated: user.stats?.foldersCreated || 0,
                examsCompleted: user.stats?.examsCompleted || 0,
                aiQueries: user.stats?.aiQueries || 0,
                favoritesCount: user.favorites?.length || 0,
            };
            const response = await answerStudyBuddyQuery({
                userStats,
                question: prompt,
            });
            setCurrentResponse(response);
        } catch (e) {
            console.error("Failed to get answer from study buddy", e);
            setCurrentResponse("Sorry, I couldn't process that request. Please try again.");
        } finally {
            setIsResponding(false);
        }
    };

    const handleSuggestionClick = async (suggestion: Suggestion) => {
        await submitQuery(suggestion.prompt);
    };

    const handleCustomQuestionSubmit = async () => {
        if (!customQuestion.trim()) return;
        await submitQuery(customQuestion);
        setCustomQuestion('');
    };

    const handleCustomQuestionKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleCustomQuestionSubmit();
        }
    };
    
    const handleBackToIntro = () => {
        if(initialInsight) {
            setCurrentResponse(initialInsight.mainInsight);
        }
    };

    const isChatMode = initialInsight ? currentResponse !== initialInsight.mainInsight : false;

    if (loading) {
        return (
            <div className="glass-card flex items-center gap-4 p-6 rounded-2xl mb-12 min-h-[160px]">
                <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                    </div>
                </div>
                <div className="space-y-2 flex-1">
                    <div className="h-5 w-1/3 bg-slate-700/80 rounded-md animate-pulse"></div>
                    <div className="h-4 w-3/4 bg-slate-800 rounded-md animate-pulse"></div>
                    <div className="h-4 w-1/2 bg-slate-800 rounded-md animate-pulse"></div>
                </div>
            </div>
        );
    }
    
    if (!initialInsight) return null;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card flex flex-col sm:flex-row items-start gap-6 p-6 rounded-2xl"
        >
            <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center border-2 border-blue-500/50 shadow-lg">
                    <AiAssistantIcon className="w-9 h-9" />
                </div>
            </div>

            <div className="flex-1">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={isChatMode ? 'chat' : 'intro'}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                    >
                        <h3 className="text-xl font-bold text-white">
                            {isChatMode ? "Here's what I found..." : initialInsight.greeting}
                        </h3>
                        {isResponding ? (
                             <div className="flex items-center gap-3 mt-2 text-slate-400">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Thinking...</span>
                            </div>
                        ) : (
                            <p className="text-slate-300 mt-2 max-w-prose whitespace-pre-wrap">{currentResponse}</p>
                        )}
                    </motion.div>
                </AnimatePresence>

                <div className="mt-6 flex flex-col gap-3">
                   {isChatMode ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                             <Button
                                onClick={handleBackToIntro}
                                variant="outline"
                                className="rounded-full bg-slate-800/60 border-slate-700 hover:bg-slate-700/80 hover:border-slate-600 text-slate-200"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Suggestions
                            </Button>
                        </motion.div>
                   ) : (
                    <>
                        <div className="flex flex-wrap gap-3">
                            {initialInsight.suggestedActions.map((suggestion, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0, transition: { delay: 0.2 + index * 0.1 } }}
                                >
                                    <Button
                                        onClick={() => handleSuggestionClick(suggestion)}
                                        variant="outline"
                                        className="rounded-full bg-slate-800/60 border-slate-700 hover:bg-slate-700/80 hover:border-slate-600 text-slate-200"
                                        disabled={isResponding}
                                    >
                                        {suggestion.label}
                                    </Button>
                                </motion.div>
                            ))}
                        </div>
                        <motion.div 
                            className="flex items-center gap-2 mt-2"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0, transition: { delay: 0.5 } }}
                        >
                            <Input 
                                placeholder="Or ask something else..."
                                className="flex-1 bg-slate-800/60 border-slate-700 rounded-full h-10 px-4"
                                value={customQuestion}
                                onChange={(e) => setCustomQuestion(e.target.value)}
                                onKeyDown={handleCustomQuestionKeyDown}
                                disabled={isResponding}
                            />
                             <Button 
                                size="icon" 
                                className="rounded-full h-10 w-10 flex-shrink-0"
                                onClick={handleCustomQuestionSubmit}
                                disabled={isResponding || !customQuestion.trim()}
                            >
                                <Send className="w-4 h-4" />
                            </Button>
                        </motion.div>
                    </>
                   )}
                </div>
            </div>
        </motion.div>
    );
}

