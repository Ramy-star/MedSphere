'use client';

import React, { useEffect, useState, useCallback, useRef, useLayoutEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, ChevronDown, Plus, Minus, Maximize, Shrink, ArrowUp } from 'lucide-react';
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
import { Textarea } from '../ui/textarea';


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
        opacity: 1,
        height: 'auto',
        transition: {
            type: 'spring',
            stiffness: 300,
            damping: 30,
            when: "beforeChildren",
            staggerChildren: 0.05,
        }
    },
    collapsed: {
        opacity: 0,
        height: 0,
        transition: {
            type: 'spring',
            stiffness: 400,
            damping: 40,
            when: "afterChildren",
            staggerChildren: 0.05,
            staggerDirection: -1
        }
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
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const messagesRef = useRef<ChatMessage[]>([]);
    const [theme, setTheme] = useState<TimeOfDayTheme | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [fontSize, setFontSize] = useState(12);

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
        // 5:00 AM - 11:59 AM
        if (hour >= 5 && hour < 12) {
            return { greeting: `Good morning, ${firstName}! 🌅`, bgColor: 'rgba(209, 171, 35, 0.6)', textColor: '#3A3A3A', iconColor: '#346bf1' };
        }
        // 12:00 PM - 4:59 PM
        if (hour >= 12 && hour < 17) {
            return { greeting: `Good afternoon, ${firstName}! 🌤️`, bgColor: 'rgba(165, 46, 17, 0.6)', textColor: '#3A3A3A', iconColor: '#346bf1' };
        }
        // 5:00 PM - 8:59 PM
        if (hour >= 17 && hour < 21) {
            return { greeting: `Good evening, ${firstName}! 🌇`, bgColor: 'rgba(118, 12, 44, 0.6)', textColor: '#FFFFFF', iconColor: '#FFFFFF' };
        }
        // 9:00 PM - 4:59 AM
        return { greeting: `Good night, ${firstName}! 🌙`, bgColor: 'rgba(11, 11, 86, 0.6)', textColor: '#FFFFFF', iconColor: '#FFFFFF' };
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
            const result = await getStudyBuddyInsight({greeting, ...userStats});
            setInitialInsight(result);
            //if(!isOpen) setIsOpen(true);
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

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto'; // Reset height to recalculate
            const scrollHeight = textarea.scrollHeight;
            const maxHeight = 120; // 120px max height
            textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
        }
    }, [customQuestion]);
    

    const handleCustomQuestionKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
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
             <div className="glass-card flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', backgroundImage: `radial-gradient(ellipse 180% 180% at 0% 0%, ${theme?.bgColor || 'transparent'}, transparent 90%)`}}>
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
             <div style={{color: theme.textColor}}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} className="text-slate-400 text-xs mt-1 sm:mt-2 max-w-prose whitespace-pre-wrap">{initialInsight.mainInsight}</ReactMarkdown>
            </div>
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
        <div className="flex flex-col h-full overflow-hidden">
             <div className="flex items-center justify-between mb-2 sm:mb-3 flex-shrink-0">
                 <Button onClick={handleBackToIntro} variant="ghost" size="icon" className="h-7 w-7 rounded-full text-white">
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div className="flex items-center gap-1">
                     <Button variant="ghost" size="icon" className="h-7 w-7 text-white" onClick={() => setFontSize(s => Math.max(s - 1, 10))}><Minus size={16}/></Button>
                     <Button variant="ghost" size="icon" className="h-7 w-7 text-white" onClick={() => setFontSize(s => Math.min(s + 1, 20))}><Plus size={16}/></Button>
                     <Button variant="ghost" size="icon" className="h-7 w-7 text-white" onClick={() => setIsExpanded(!isExpanded)}>
                        {isExpanded ? <Shrink size={16}/> : <Maximize size={16}/>}
                    </Button>
                </div>
            </div>
             <div ref={chatContainerRef} className="flex-1 space-y-3 overflow-y-auto no-scrollbar pr-2 -mr-2" style={{fontSize: `${fontSize}px`}}>
                {chatHistory.map((message, index) => (
                    <div key={message.text + index} className="flex flex-col gap-2">
                        {message.role === 'user' && (
                             <div dir="auto" className="self-end bg-blue-600 text-white rounded-lg sm:rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 max-w-[85%]" style={{fontSize: 'inherit'}}>
                                {message.text}
                            </div>
                        )}
                        {message.role === 'model' && (
                            <div dir="auto" className="self-start bg-slate-700/70 text-slate-300 rounded-lg sm:rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 max-w-[85%] prose prose-sm prose-invert" style={{fontSize: 'inherit'}}>
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
      <AnimatePresence>
        {isExpanded && (
           <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setIsExpanded(false)}
            />
        )}
        <Collapsible.Root 
            open={isOpen} 
            onOpenChange={setIsOpen} 
            className={cn(
                "w-full transition-all duration-500 ease-in-out",
                isExpanded && "fixed inset-0 sm:inset-5 z-50 m-auto max-w-3xl max-h-[80vh] flex"
            )}
        >
            <div 
                className={cn("glass-card p-3 sm:p-4 rounded-2xl flex flex-col w-full", isExpanded ? "h-full" : "")}
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', backgroundImage: `radial-gradient(ellipse 180% 170% at 0% 0%, ${theme.bgColor}, transparent 90%)`}}
            >
                <Collapsible.Trigger className="w-full">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="flex-shrink-0">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-2 border-blue-500/50 shadow-lg relative overflow-hidden" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)'}}>
                                <AiAssistantIcon className="w-6 h-6 sm:w-7 sm:h-7" />
                            </div>
                        </div>
                        <div className="flex-1 text-left">
                             <h3 className="text-sm sm:text-base font-bold text-white">
                                {theme.greeting}
                            </h3>
                        </div>
                        <ChevronDown className={cn("h-5 w-5 transition-transform text-slate-400", isOpen && "rotate-180")} />
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
                                className="overflow-hidden flex-1 flex flex-col"
                            >
                                <div className="pt-4 flex-1 flex flex-col w-full min-w-0 min-h-[120px] sm:min-h-[150px]">
                                    <div className="flex-1 min-h-0">
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key={view}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                transition={{ duration: 0.3 }}
                                                className="h-full flex flex-col"
                                            >
                                                {view === 'intro' ? <IntroView /> : <ChatView />}
                                            </motion.div>
                                        </AnimatePresence>
                                    </div>
                                    <motion.div 
                                        className="flex items-center gap-2 mt-2 flex-shrink-0"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0, transition: { delay: 0.5 } }}
                                    >
                                        <Textarea
                                            ref={textareaRef}
                                            placeholder="Ask something else..."
                                            className="flex-1 bg-slate-800/60 border-slate-700 rounded-2xl h-8 sm:h-9 px-3 sm:px-4 text-xs resize-none overflow-y-auto no-scrollbar"
                                            value={customQuestion}
                                            onChange={(e) => setCustomQuestion(e.target.value)}
                                            onKeyDown={handleCustomQuestionKeyDown}
                                            disabled={isResponding}
                                            rows={1}
                                            dir="auto"
                                        />

                                        <Button 
                                            size="icon" 
                                            className="rounded-full h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0"
                                            onClick={handleCustomQuestionSubmit}
                                            disabled={isResponding || !customQuestion.trim()}
                                        >
                                            <ArrowUp className="w-4 h-4" />
                                        </Button>
                                    </motion.div>
                                </div>
                            </motion.div>
                        </Collapsible.Content>
                    )}
                 </AnimatePresence>
            </div>
        </Collapsible.Root>
      </AnimatePresence>
    );
}
