
'use client';

import React, { useEffect, useState, useCallback, useRef, useLayoutEffect } from 'react';
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
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const messagesRef = useRef<ChatMessage[]>([]); // Use ref to prevent re-renders on input change

    useEffect(() => {
        messagesRef.current = chatHistory;
    }, [chatHistory]);

    useLayoutEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
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
        const newHistory: ChatMessage[] = [...messagesRef.current, { role: 'user', text: prompt }];
        setChatHistory(newHistory);
        setIsResponding(true);
        
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
                chatHistory: newHistory.slice(0, -1),
            });
            setChatHistory(prev => [...prev, { role: 'model', text: response }]);
        } catch (e) {
            console.error("Failed to get answer from study buddy", e);
             toast({
                variant: 'destructive',
                title: 'Error',
                description: "Sorry, I couldn't process that request. Please try again.",
            });
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
        setChatHistory([]);
    };

    if (loading) {
        return (
            <div className="glass-card flex items-center gap-4 p-6 rounded-2xl min-h-[150px]">
                <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center">
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
            <h3 className="text-base font-bold text-white">
                {initialInsight.greeting}
            </h3>
            <ReactMarkdown remarkPlugins={[remarkGfm]} className="text-slate-400 text-xs mt-2 max-w-prose whitespace-pre-wrap">{initialInsight.mainInsight}</ReactMarkdown>
            <div className="mt-4 flex flex-wrap gap-2">
                {initialInsight.suggestedActions.map((suggestion, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0, transition: { delay: 0.2 + index * 0.1 } }}
                    >
                        <Button
                            onClick={() => handleSuggestionClick(suggestion)}
                            variant="outline"
                            size="sm"
                            className="rounded-full bg-slate-800/60 border-slate-700 hover:bg-slate-700/80 hover:border-slate-600 text-slate-300 text-xs"
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
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-3">
                 <Button
                    onClick={handleBackToIntro}
                    variant="outline"
                    size="sm"
                    className="rounded-full bg-slate-800/60 border-slate-700 hover:bg-slate-700/80 hover:border-slate-600 text-slate-300"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                </Button>
            </div>
            <div ref={chatContainerRef} className="flex-1 space-y-3 max-h-64 overflow-y-auto no-scrollbar pr-2 -mr-2">
                {chatHistory.map((message, index) => (
                    <div key={index} className="flex flex-col gap-2">
                        {message.role === 'user' && (
                             <div className="text-xs self-end bg-blue-600 text-white rounded-xl px-3 py-2 max-w-[85%]">
                                {message.text}
                            </div>
                        )}
                        {message.role === 'model' && (
                            <div className="text-xs self-start bg-slate-700/70 text-slate-300 rounded-xl px-3 py-2 max-w-[85%] prose prose-sm prose-invert">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown>
                            </div>
                        )}
                    </div>
                ))}
                {isResponding && (
                     <div className="self-start flex items-center gap-2 text-slate-500 text-xs">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Thinking...</span>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card flex items-start gap-4 p-4 rounded-2xl"
        >
            <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center border-2 border-blue-500/50 shadow-lg">
                    <AiAssistantIcon className="w-7 h-7" />
                </div>
            </div>

            <div className="flex-1 flex flex-col w-full min-w-0 min-h-[120px]">
                <div className="flex-1">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={view}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="h-full"
                        >
                            {view === 'intro' ? <IntroView /> : <ChatView />}
                        </motion.div>
                    </AnimatePresence>
                </div>
                 <motion.div 
                    className="flex items-center gap-2 mt-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: 0.5 } }}
                >
                    <Input 
                        placeholder="Ask something else..."
                        className="flex-1 bg-slate-800/60 border-slate-700 rounded-full h-9 px-4 text-xs"
                        value={customQuestion}
                        onChange={(e) => setCustomQuestion(e.target.value)}
                        onKeyDown={handleCustomQuestionKeyDown}
                        disabled={isResponding}
                    />
                     <Button 
                        size="icon" 
                        className="rounded-full h-9 w-9 flex-shrink-0"
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
