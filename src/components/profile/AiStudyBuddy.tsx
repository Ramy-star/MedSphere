
'use client';

import React, { useEffect, useState, useCallback, useRef, useLayoutEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, ArrowLeft, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getStudyBuddyInsight } from '@/ai/flows/study-buddy-flow';
import { answerStudyBuddyQuery } from '@/ai/flows/study-buddy-chat-flow';
import type { UserProfile } from '@/stores/auth-store';
import { AiAssistantIcon } from '../icons/AiAssistantIcon';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useToast } from '@/hooks/use-toast';
import * as Collapsible from '@radix-ui/react-collapsible';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';

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

type TimeOfDayTheme = {
    greeting: string;
    bgColor: string;
    textColor: string;
    iconColor: string;
};


const sectionVariants = {
    open: {
        clipPath: `inset(0% 0% 0% 0%)`,
        opacity: 1,
        height: 'auto',
        transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
    },
    collapsed: {
        clipPath: `inset(0% 0% 100% 0%)`,
        opacity: 0,
        height: 0,
        transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] }
    }
};


export function AiStudyBuddy({ user }: { user: UserProfile }) {
    const [initialInsight, setInitialInsight] = useState<InitialInsight | null>(null);
    const [loading, setLoading] = useState(true);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [isResponding, setIsResponding] = useState(false);
    const [customQuestion, setCustomQuestion] = useState('');
    const [view, setView] = useState<'intro' | 'chat'>('intro');
    const [isOpen, setIsOpen] = useState(false);
    const { toast } = useToast();
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const messagesRef = useRef<ChatMessage[]>([]);
    const [theme, setTheme] = useState<TimeOfDayTheme | null>(null);

    useEffect(() => {
        messagesRef.current = chatHistory;
    }, [chatHistory]);

    useLayoutEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory, isResponding]);
    
    const getThemeForTime = useCallback((): TimeOfDayTheme => {
        const hour = new Date().getHours();
        const firstName = user.displayName?.split(' ')[0] || user.username;
        if (hour >= 5 && hour < 12) return { greeting: `Good morning, ${firstName}! 🌅`, bgColor: '#FFE58A', textColor: '#3A3A3A', iconColor: '#3A3A3A' };
        if (hour >= 12 && hour < 17) return { greeting: `Good afternoon, ${firstName}! 🌤️`, bgColor: '#FFD580', textColor: '#3A3A3A', iconColor: '#3A3A3A' };
        if (hour >= 17 && hour < 21) return { greeting: `Good evening, ${firstName}! 🌇`, bgColor: '#9C7CFD', textColor: '#FFFFFF', iconColor: '#FFFFFF' };
        return { greeting: `Good night, ${firstName}! 🌙`, bgColor: '#1E3A8A', textColor: '#FFFFFF', iconColor: '#FFFFFF' };
    }, [user.displayName, user.username]);

    const fetchInitialInsight = useCallback(async (greeting: string) => {
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
        const currentTheme = getThemeForTime();
        setTheme(currentTheme);
        fetchInitialInsight(currentTheme.greeting);
    }, [fetchInitialInsight, getThemeForTime]);

    const submitQuery = async (prompt: string) => {
        if (!prompt || !theme) return;

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

    if (loading || !theme) {
        return (
             <div className={cn("glass-card flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl")} style={{ backgroundColor: theme?.bgColor }}>
                <div className="flex-shrink-0">
                    <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-full" />
                </div>
                <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                </div>
            </div>
        );
    }
    
    if (!initialInsight) return null;

    const IntroView = () => (
        <>
            <ReactMarkdown remarkPlugins={[remarkGfm]} className="text-slate-400 text-xs mt-1 sm:mt-2 max-w-prose whitespace-pre-wrap" style={{color: theme.textColor}}>{initialInsight.mainInsight}</ReactMarkdown>
            <div className="mt-3 sm:mt-4 flex flex-wrap gap-2">
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
                            className="rounded-full bg-slate-800/60 border-slate-700 hover:bg-slate-700/80 hover:border-slate-600 text-slate-300 text-xs h-7 sm:h-8"
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
            <div className="flex items-center justify-between mb-2 sm:mb-3">
                 <Button
                    onClick={handleBackToIntro}
                    variant="outline"
                    size="sm"
                    className="rounded-full bg-slate-800/60 border-slate-700 hover:bg-slate-700/80 hover:border-slate-600 text-slate-300 h-7"
                >
                    <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
                    Back
                </Button>
            </div>
            <div ref={chatContainerRef} className="flex-1 space-y-3 max-h-56 sm:max-h-64 overflow-y-auto no-scrollbar pr-2 -mr-2">
                {chatHistory.map((message, index) => (
                    <div key={index} className="flex flex-col gap-2">
                        {message.role === 'user' && (
                             <div className="text-xs self-end bg-blue-600 text-white rounded-lg sm:rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 max-w-[85%]">
                                {message.text}
                            </div>
                        )}
                        {message.role === 'model' && (
                            <div className="text-xs self-start bg-slate-700/70 text-slate-300 rounded-lg sm:rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 max-w-[85%] prose prose-sm prose-invert">
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
        <Collapsible.Root open={isOpen} onOpenChange={setIsOpen} className="w-full">
            <div className="glass-card p-3 sm:p-4 rounded-2xl" style={{ backgroundColor: theme.bgColor }}>
                <Collapsible.Trigger className="w-full">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="flex-shrink-0">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-2 border-blue-500/50 shadow-lg relative overflow-hidden" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)'}}>
                                <AiAssistantIcon className="w-6 h-6 sm:w-7 sm:h-7" style={{ color: theme.iconColor }} />
                            </div>
                        </div>
                        <div className="flex-1 text-left">
                             <h3 className="text-sm sm:text-base font-bold" style={{ color: theme.textColor }}>
                                {theme.greeting}
                            </h3>
                        </div>
                        <ChevronDown className={cn("h-5 w-5 transition-transform", isOpen && "rotate-180")} style={{ color: theme.textColor }} />
                    </div>
                </Collapsible.Trigger>

                 <AnimatePresence initial={false}>
                    {isOpen && (
                        <Collapsible.Content asChild forceMount>
                            <motion.div
                                initial="collapsed"
                                animate="open"
                                exit="collapsed"
                                variants={sectionVariants}
                                className="overflow-hidden"
                            >
                                <div className="mt-4 flex-1 flex flex-col w-full min-w-0 min-h-[100px] sm:min-h-[120px]">
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
                                            className="flex-1 bg-slate-800/60 border-slate-700 rounded-full h-8 sm:h-9 px-3 sm:px-4 text-xs"
                                            value={customQuestion}
                                            onChange={(e) => setCustomQuestion(e.target.value)}
                                            onKeyDown={handleCustomQuestionKeyDown}
                                            disabled={isResponding}
                                        />
                                        <Button 
                                            size="icon" 
                                            className="rounded-full h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0"
                                            onClick={handleCustomQuestionSubmit}
                                            disabled={isResponding || !customQuestion.trim()}
                                        >
                                            <Send className="w-4 h-4" />
                                        </Button>
                                    </motion.div>
                                </div>
                            </motion.div>
                        </Collapsible.Content>
                    )}
                 </AnimatePresence>
            </div>
        </Collapsible.Root>
    );
}
