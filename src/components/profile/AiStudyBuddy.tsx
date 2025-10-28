'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getStudyBuddyInsight } from '@/ai/flows/study-buddy-flow';
import { answerStudyBuddyQuery } from '@/ai/flows/study-buddy-chat-flow';
import type { UserProfile } from '@/stores/auth-store';
import { AiAssistantIcon } from '../icons/AiAssistantIcon';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useToast } from '@/hooks/use-toast';

type Suggestion = {
    label: string;
    prompt: string; 
};

type InitialInsight = {
    greeting: string;
    mainInsight: string;
    suggestedActions: Suggestion[];
};

type ChatMessage = {
    role: 'user' | 'model';
    text: string;
};

export function AiStudyBuddy({ user }: { user: UserProfile }) {
    const [initialInsight, setInitialInsight] = useState<InitialInsight | null>(null);
    const [loading, setLoading] = useState(true);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [isResponding, setIsResponding] = useState(false);
    const [customQuestion, setCustomQuestion] = useState('');
    const [view, setView] = useState<'intro' | 'chat'>('intro');
    const { toast } = useToast();
    const messagesEndRef = useRef<HTMLDivElement>(null);


    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatHistory, isResponding]);
    

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
        } catch (e) {
            console.error("Failed to get study buddy insight", e);
            setInitialInsight(null);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchInitialInsight();
    }, [fetchInitialInsight]);

    const submitQuery = async (prompt: string) => {
        if (!prompt) return;

        setView('chat');
        setIsResponding(true);
        const newHistory: ChatMessage[] = [...chatHistory, { role: 'user', text: prompt }];
        setChatHistory(newHistory);

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
                chatHistory: newHistory.slice(0, -1), // Send history up to the latest question
            });
            setChatHistory(prev => [...prev, { role: 'model', text: response }]);
        } catch (e) {
            console.error("Failed to get answer from study buddy", e);
             toast({
                variant: 'destructive',
                title: 'Error',
                description: "Sorry, I couldn't process that request. Please try again.",
            });
            // Remove the user message if AI fails
            setChatHistory(prev => prev.slice(0, -1));
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
        setView('intro');
        setChatHistory([]); // Clear chat history when going back to intro
    };

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

    const IntroView = () => (
        <>
            <h3 className="text-xl font-bold text-white">
                {initialInsight.greeting}
            </h3>
            <p className="text-slate-300 mt-2 max-w-prose whitespace-pre-wrap">{initialInsight.mainInsight}</p>
            <div className="mt-6 flex flex-wrap gap-3">
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
        </>
    );

    const ChatView = () => (
        <>
            <div className="flex items-center justify-between mb-4">
                 <Button
                    onClick={handleBackToIntro}
                    variant="outline"
                    className="rounded-full bg-slate-800/60 border-slate-700 hover:bg-slate-700/80 hover:border-slate-600 text-slate-200"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>
            </div>
            <div className="space-y-4 max-h-80 overflow-y-auto no-scrollbar pr-2 -mr-2">
                {chatHistory.map((message, index) => (
                    <div key={index} className="flex flex-col gap-2">
                        {message.role === 'user' && (
                             <div className="text-sm self-end bg-blue-600 text-white rounded-2xl px-4 py-2 max-w-[80%]">
                                {message.text}
                            </div>
                        )}
                        {message.role === 'model' && (
                            <div className="text-sm self-start bg-slate-700/70 text-slate-200 rounded-2xl px-4 py-2 max-w-[80%] prose prose-sm prose-invert">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown>
                            </div>
                        )}
                    </div>
                ))}
                {isResponding && (
                     <div className="self-start flex items-center gap-2 text-slate-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Thinking...</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
        </>
    );

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

            <div className="flex-1 w-full">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={view}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                    >
                        {view === 'intro' ? <IntroView /> : <ChatView />}
                    </motion.div>
                </AnimatePresence>

                 <motion.div 
                    className="flex items-center gap-2 mt-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: 0.5 } }}
                >
                    <Input 
                        placeholder="Ask something else..."
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
            </div>
        </motion.div>
    );
}
