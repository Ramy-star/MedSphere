'use client';

import React, { useEffect, useState, useCallback, useRef, useLayoutEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, ChevronDown, Plus, Minus, Maximize, Shrink, ArrowUp, Copy, Paperclip, X, History, Trash, StickyNote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getStudyBuddyInsight } from '@/ai/flows/study-buddy-flow';
import { answerStudyBuddyQuery } from '@/ai/flows/study-buddy-chat-flow';
import type { UserProfile } from '@/stores/auth-store';
import { AiAssistantIcon } from '../icons/AiAssistantIcon';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';
import { Textarea } from '../ui/textarea';
import { Check, Trash2 } from 'lucide-react';
import { useCollection } from '@/firebase/firestore/use-collection';
import { Content } from '@/lib/contentService';
import { fileService } from '@/lib/fileService';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { FileText } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { create } from 'zustand';
import { db } from '@/firebase';
import { doc, serverTimestamp, writeBatch, deleteDoc, addDoc, collection, updateDoc, getDoc, getDocs } from 'firebase/firestore';
import { AlertDialog, AlertDialogTrigger, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollArea } from '@/components/ui/scroll-area';


if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

type Suggestion = {
    label: string;
    prompt: string;
};

type InitialInsight = {
    mainInsight: string;
    suggestedActions: Suggestion[];
};

type ChatMessage = {
    role: 'user' | 'model';
    text: string;
    referencedFiles?: Content[];
};

export type AiBuddyChatSession = {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: { seconds: number, nanoseconds: number } | string;
  updatedAt: { seconds: number, nanoseconds: number } | string;
};

type TimeOfDayTheme = {
    greeting: string;
    bgColor: string;
    textColor: string;
    iconColor: string;
};

// Zustand store for caching
interface AiBuddyStore {
  initialInsight: InitialInsight | null;
  theme: TimeOfDayTheme | null;
  setInitialData: (insight: InitialInsight, theme: TimeOfDayTheme) => void;
  clearInitialData: () => void;
}

const useAiBuddyStore = create<AiBuddyStore>((set) => ({
    initialInsight: null,
    theme: null,
    setInitialData: (initialInsight, theme) => set({ initialInsight, theme }),
    clearInitialData: () => set({ initialInsight: null, theme: null }),
}));


const isRtl = (text: string) => {
  const rtlRegex = /[\u0591-\u07FF\uFB1D-\uFDFF\uFE70-\uFEFC]/;
  return rtlRegex.test(text);
};

const ReferencedFilePill = ({ file, onRemove }: { file: Content, onRemove: () => void }) => {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 bg-blue-900/70 text-blue-200 text-xs font-medium pl-2 pr-1 py-0.5 rounded-full shrink-0">
                        <Paperclip className="w-3 h-3" />
                        <span className="truncate max-w-[100px]">{file.name}</span>
                        <button onClick={onRemove} className="p-0.5 rounded-full hover:bg-white/20 shrink-0">
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{file.name}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};


export function AiStudyBuddy({ user, isFloating = false, onToggleExpand, isExpanded }: { user: UserProfile, isFloating?: boolean, onToggleExpand?: () => void, isExpanded?: boolean }) {
    const { initialInsight, theme, setInitialData } = useAiBuddyStore();
    const [loading, setLoading] = useState(!initialInsight);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [isResponding, setIsResponding] = useState(false);
    const [customQuestion, setCustomQuestion] = useState('');
    const [view, setView] = useState<'intro' | 'chat' | 'history'>('intro');
    const [currentChatId, setCurrentChatId] = useState<string | null>(null);
    const { toast } = useToast();
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [fontSize, setFontSize] = useState(13); // Reduced default font size slightly
    const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
    const [showFileSearch, setShowFileSearch] = useState(false);
    const [fileSearchQuery, setFileSearchQuery] = useState('');
    const [referencedFiles, setReferencedFiles] = useState<Content[]>([]);
    const [itemToDelete, setItemToDelete] = useState<AiBuddyChatSession | null>(null);
    const [showClearHistoryDialog, setShowClearHistoryDialog] = useState(false);
    const isMobile = useIsMobile();


    const { data: allContent } = useCollection<Content>('content');
    const { data: savedSessions } = useCollection<AiBuddyChatSession>(`users/${user.id}/aiBuddySessions`, { orderBy: ['createdAt', 'desc'] });

    
    const isOpen = true;

    const filteredFiles = useMemo(() => {
        if (!allContent) return [];
        const items = allContent.filter(f => f.type === 'FILE' || f.type === 'LINK');
        if (!fileSearchQuery) return items.slice(0, 10);
        return items.filter(file => file.name.toLowerCase().includes(fileSearchQuery.toLowerCase())).slice(0, 10);
    }, [allContent, fileSearchQuery]);


    useLayoutEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatHistory, isResponding]);
    
    const getThemeForTime = useCallback((): TimeOfDayTheme => {
        const hour = new Date().getHours();
        const firstName = user.displayName?.split(' ')[0] || user.username;
        if (hour >= 5 && hour < 12) {
            return { greeting: `Good morning, ${firstName}! 🌅`, bgColor: 'rgba(209, 171, 35, 0.6)', textColor: '#3A3A3A', iconColor: '#346bf1' };
        }
        if (hour >= 12 && hour < 17) {
            return { greeting: `Good afternoon, ${firstName}! 🌤️`, bgColor: 'rgba(165, 46, 17, 0.6)', textColor: '#3A3A3A', iconColor: '#346bf1' };
        }
        if (hour >= 17 && hour < 21) {
            return { greeting: `Good evening, ${firstName}! 🌇`, bgColor: 'rgba(118, 12, 44, 0.6)', textColor: '#FFFFFF', iconColor: '#FFFFFF' };
        }
        return { greeting: `Good night, ${firstName}! 🌙`, bgColor: 'rgba(11, 11, 86, 0.6)', textColor: '#FFFFFF', iconColor: '#FFFFFF' };
    }, [user.displayName, user.username]);

    const fetchInitialInsight = useCallback(async () => {
        if (initialInsight) {
            setLoading(false);
            return;
        }
        setLoading(true);
        const currentTheme = getThemeForTime();
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
            const result = await getStudyBuddyInsight({greeting: `Hello! I'm MedSphere Assistant`, ...userStats});
            setInitialData(result, currentTheme);
        } catch (e) {
            console.error("Failed to get study buddy insight", e);
        } finally {
            setLoading(false);
        }
    }, [user, getThemeForTime, setInitialData, initialInsight]);

    useEffect(() => {
        fetchInitialInsight();
    }, [fetchInitialInsight]);

    const saveChatSession = useCallback(async (history: ChatMessage[], chatId: string | null): Promise<string> => {
        if (!user || history.length === 0) return chatId || '';

        const firstUserMessage = history.find(m => m.role === 'user')?.text || 'New Chat';
        const title = firstUserMessage.substring(0, 40) + (firstUserMessage.length > 40 ? '...' : '');

        // Make sure to serialize referencedFiles correctly, only keeping essential data
        const serializableHistory = history.map(message => {
            if (message.referencedFiles) {
                return {
                    ...message,
                    referencedFiles: message.referencedFiles.map(file => ({
                        id: file.id,
                        name: file.name,
                        type: file.type,
                    })),
                };
            }
            return message;
        });

        const sessionData = {
            userId: user.id,
            title,
            messages: serializableHistory,
            updatedAt: serverTimestamp(),
        };

        const collectionRef = collection(db, `users/${user.id}/aiBuddySessions`);
        
        if (chatId) {
            const docRef = doc(collectionRef, chatId);
            await updateDoc(docRef, sessionData);
            return chatId;
        } else {
            const newDocRef = await addDoc(collectionRef, {
                ...sessionData,
                createdAt: serverTimestamp(),
            });
            return newDocRef.id;
        }
    }, [user]);


    const submitQuery = useCallback(async (prompt: string, filesToSubmit: Content[], isNewChat: boolean) => {
        if (!prompt.trim() && filesToSubmit.length === 0) return;
        if (!theme) return;
    
        const currentHistory = isNewChat ? [] : chatHistory;
        
        setView('chat');
        const newUserMessage: ChatMessage = { role: 'user', text: prompt, referencedFiles: filesToSubmit };
        const newHistory: ChatMessage[] = [...currentHistory, newUserMessage];
        setChatHistory(newHistory);
        setIsResponding(true);
        setCustomQuestion('');
        setReferencedFiles([]); // Clear referenced files from the input area after submission
        
        let fileContent = '';
        try {
            if (filesToSubmit.length > 0) {
                const fileContents = await Promise.all(
                    filesToSubmit.map(async file => {
                        if (file.metadata?.storagePath) {
                            try {
                                const fileBlob = await fileService.getFileContent(file.metadata.storagePath);
                                if (file.metadata.mime === 'application/pdf') {
                                    const pdf = await pdfjs.getDocument(await fileBlob.arrayBuffer()).promise;
                                    const text = await fileService.extractTextFromPdf(pdf);
                                    return `--- START OF FILE: ${file.name} ---\n\n${text}\n\n--- END OF FILE: ${file.name} ---`;
                                } else {
                                    const text = await fileBlob.text();
                                    return `--- START OF FILE: ${file.name} ---\n\n${text}\n\n--- END OF FILE: ${file.name} ---`;
                                }
                            } catch (e) {
                                console.error(`Failed to process file ${file.name}:`, e);
                                return `[Error processing file: ${file.name}]`;
                            }
                        }
                        return '';
                    })
                );
                fileContent = fileContents.join('\n\n');
            }
            
            const userStats = {
                displayName: user.displayName || user.username,
                username: user.username,
                filesUploaded: user.stats?.filesUploaded || 0,
                foldersCreated: user.stats?.foldersCreated || 0,
                examsCompleted: user.stats?.examsCompleted || 0,
                aiQueries: user.stats?.aiQueries || 0,
                favoritesCount: user.favorites?.length || 0,
            };
            
            const fullPrompt = filesToSubmit.length > 0
                ? `Using the content of the attached file(s) (${filesToSubmit.map(f => `"${f.name}"`).join(', ')}) as context, answer the following: ${prompt}`
                : prompt;
    
            const response = await answerStudyBuddyQuery({
                userStats,
                question: fullPrompt,
                chatHistory: currentHistory,
                referencedFileContent: fileContent,
            });
            
            const finalHistory: ChatMessage[] = [...newHistory, { role: 'model', text: response } as ChatMessage];
            setChatHistory(finalHistory);
            
            const newChatId = await saveChatSession(finalHistory, isNewChat ? null : currentChatId);
            if(isNewChat) {
                setCurrentChatId(newChatId);
            }
    
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
    }, [theme, user, toast, chatHistory, currentChatId, saveChatSession]);

    const handleSuggestionClick = (suggestion: Suggestion) => {
        startNewChat();
        submitQuery(suggestion.prompt, [], true);
    };

    const handleCustomQuestionSubmit = () => {
        const questionToSend = customQuestion.trim();
        const filesToSend = [...referencedFiles];
    
        if (!questionToSend && filesToSend.length === 0) return;
        
        const isNewChat = view === 'intro' || !currentChatId;
        
        submitQuery(questionToSend, filesToSend, isNewChat);
    };
    
    const handleFileSelect = (file: Content) => {
        setReferencedFiles(prev => {
            if(prev.some(f => f.id === file.id)) return prev;
            if(prev.length >= 2) {
                toast({
                    title: 'Limit Reached',
                    description: 'You can reference a maximum of 2 files at a time.',
                    variant: 'destructive'
                });
                return prev;
            }
            return [...prev, file];
        });
        setShowFileSearch(false);
        setFileSearchQuery('');
        setCustomQuestion(prev => prev.substring(0, prev.lastIndexOf('@')));
        textareaRef.current?.focus();
    };


    const handleQuestionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        const atIndex = value.lastIndexOf('@');
        
        if (atIndex !== -1 && (atIndex === value.length - 1 || value.substring(atIndex + 1).trim() === '')) {
             setShowFileSearch(true);
             setFileSearchQuery('');
        } else if (atIndex !== -1 && showFileSearch) {
             setFileSearchQuery(value.substring(atIndex + 1));
        } else {
             setShowFileSearch(false);
        }
        setCustomQuestion(value);
    };


    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            const scrollHeight = textarea.scrollHeight;
            const maxHeight = 120;
            textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
        }
    }, [customQuestion]);
    
    const handleCopyMessage = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        toast({ title: "Copied to clipboard" });
        setCopiedMessageIndex(index);
        setTimeout(() => setCopiedMessageIndex(null), 2000);
    };

    const handleCustomQuestionKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleCustomQuestionSubmit();
        }
        if (e.key === 'Escape' && showFileSearch) {
            setShowFileSearch(false);
        }
    };
    
    const startNewChat = () => {
        setChatHistory([]);
        setReferencedFiles([]);
        setCustomQuestion('');
        setCurrentChatId(null);
        setView('intro');
    };
    
    const handleLoadChat = (session: AiBuddyChatSession) => {
        setChatHistory(session.messages);
        const lastUserMessage = [...session.messages].reverse().find(m => m.role === 'user');
        setReferencedFiles(lastUserMessage?.referencedFiles || []);
        setCurrentChatId(session.id);
        setView('chat');
    };
    
    const handleDeleteSession = async () => {
        if (!itemToDelete || !user) return;
        
        const noteId = itemToDelete.id;
        setItemToDelete(null); // Close dialog immediately
        
        const docRef = doc(db, `users/${user.id}/aiBuddySessions`, noteId);
        
        try {
            await deleteDoc(docRef);
            toast({ title: "Chat deleted" });
            
            if (currentChatId === noteId) {
                startNewChat();
            }
        } catch (error) {
            console.error("Error deleting chat:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not delete chat." });
        }
    };

    const handleClearAllHistory = async () => {
        if (!user || !savedSessions || savedSessions.length === 0) return;
        
        setShowClearHistoryDialog(false);

        const batch = writeBatch(db);
        savedSessions.forEach(session => {
            const docRef = doc(db, `users/${user.id}/aiBuddySessions`, session.id);
            batch.delete(docRef);
        });

        try {
            await batch.commit();
            toast({ title: 'All chats deleted' });
            if (savedSessions.some(s => s.id === currentChatId)) {
                startNewChat();
            }
        } catch (error) {
            console.error("Error clearing all chats:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete all chats.' });
        }
    };

    const formatDate = (date: { seconds: number, nanoseconds: number } | string) => {
        if (typeof date === 'string') return new Date(date).toLocaleDateString();
        if (date && typeof date.seconds === 'number') {
            return new Date(date.seconds * 1000).toLocaleDateString();
        }
        return 'Invalid Date';
    };

    const renderHeaderControls = () => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7 text-white" onClick={() => setView('history')}>
            <History size={16} />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-white" onClick={() => setFontSize((s) => Math.max(s - 1, 10))}>
            <Minus size={16} />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-white" onClick={() => setFontSize((s) => Math.min(s + 1, 20))}>
            <Plus size={16} />
        </Button>
        {isFloating && onToggleExpand && !isMobile && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-white" onClick={onToggleExpand}>
            {isExpanded ? <Shrink size={16} /> : <Maximize size={16} />}
          </Button>
        )}
      </div>
    );

    const renderChatHeader = () => (
        <div className="flex items-center justify-between mb-1 sm:mb-2 flex-shrink-0 px-4 py-1 bg-transparent">
             <Button onClick={() => setView('intro')} variant="ghost" size="icon" className="h-7 w-7 rounded-full text-white">
                <ArrowLeft className="w-4 h-4" />
            </Button>
            {renderHeaderControls()}
        </div>
    );
    
    const LoadingSkeleton = () => (
        <div className="flex flex-col h-full">
             <div className="flex items-center justify-between gap-3 sm:gap-4 flex-shrink-0">
                <div className="flex items-center gap-3 sm:gap-4 flex-1">
                    <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-40" />
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <Skeleton className="h-7 w-7 rounded-full" />
                    <Skeleton className="h-7 w-7 rounded-full" />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar pr-2 -mr-2 mt-3 sm:mt-4 space-y-2">
                <Skeleton className="w-4/5 h-4" />
                <Skeleton className="w-3/5 h-4" />
            </div>
            <div className="flex-shrink-0 flex flex-wrap gap-2 mt-8">
                <Skeleton className="w-24 h-8 rounded-full" />
                <Skeleton className="w-28 h-8 rounded-full" />
                <Skeleton className="w-20 h-8 rounded-full" />
            </div>
        </div>
    );

    const IntroView = () => (
        <>
            <div className="flex items-center justify-between gap-3 sm:gap-4 flex-shrink-0">
                <div className="flex items-center gap-3 sm:gap-4 flex-1">
                    <div className="flex-shrink-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-2 border-blue-500/50 shadow-lg relative overflow-hidden" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)'}}>
                            <AiAssistantIcon className="w-6 h-6 sm:w-7 sm:h-7" />
                        </div>
                    </div>
                    <div className="flex-1 text-left">
                        {loading || !theme ? (
                            <Skeleton className="h-5 w-40" />
                        ) : (
                         <h3 className={cn("font-bold text-white", isMobile ? "text-[14px]" : "text-base")}>
                            {theme.greeting}
                        </h3>
                        )}
                    </div>
                </div>
                {(!loading && theme) && renderHeaderControls()}
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar pr-2 -mr-2 mt-3 sm:mt-4">
                <ReactMarkdown remarkPlugins={[remarkGfm]} className="text-slate-400 text-xs sm:text-sm max-w-prose whitespace-pre-wrap">{initialInsight!.mainInsight}</ReactMarkdown>
            </div>
            <div className="mt-3 sm:mt-4 flex flex-wrap gap-2 flex-shrink-0">
                {initialInsight!.suggestedActions.map((suggestion, index) => (
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
        {renderChatHeader()}
        <div
          ref={chatContainerRef}
          className="flex-1 space-y-3 overflow-y-auto no-scrollbar pr-2 -mr-2"
          style={{ fontSize: `${fontSize}px` }}
        >
          {chatHistory.map((message, index) => (
            <div
              key={`${message.text.slice(0, 10)}-${index}`}
              className={cn(
                'flex flex-col gap-2 group',
                isRtl(message.text) ? 'font-plex-arabic' : 'font-inter'
              )}
            >
              {message.role === 'user' && (
                <div
                  dir="auto"
                  className="self-end bg-blue-600 text-white rounded-2xl px-3 py-2 max-w-[85%] whitespace-pre-wrap break-words"
                  style={{ fontSize: 'inherit' }}
                >
                  {/* DO NOT RENDER referencedFiles here to keep the UI clean */}
                  {message.text}
                </div>
              )}
              {message.role === 'model' && (
                <div
                  dir="auto"
                  className={cn(
                    'text-slate-300 max-w-[95%] prose prose-sm prose-invert',
                    isRtl(message.text)
                      ? 'self-end text-right'
                      : 'self-start text-left'
                  )}
                  style={{ fontSize: 'inherit' }}
                >
                  <div className="overflow-x-auto">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                          table: ({ node, ...props }) => <div className="overflow-x-auto"><table className="my-4 border-collapse border border-white/30 rounded-lg overflow-hidden" {...props} /></div>,
                          thead: ({ node, ...props }) => <thead className="bg-black/35 text-white" {...props} />,
                          tr: ({ node, ...props }) => <tr className="border-b border-white/30 last:border-b-0" {...props} />,
                          th: ({ node, ...props }) => <th className="border-r border-white/30 p-2 text-left font-semibold last:border-r-0" {...props} />,
                          td: ({ node, ...props }) => <td className="border-r border-white/30 p-2 align-top last:border-r-0 text-neutral-100 bg-white/10" {...props} />,
                      }}
                    >
                      {message.text}
                    </ReactMarkdown>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity mt-2"
                    onClick={() => handleCopyMessage(message.text, index)}
                  >
                    {copiedMessageIndex === index ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
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
    
    const HistoryView = () => {
        return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-1 sm:mb-2 flex-shrink-0 px-4 py-1 bg-transparent">
                <Button onClick={() => setView('intro')} variant="ghost" size="icon" className="h-7 w-7 rounded-full text-white">
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <h4 className="text-white font-semibold">Chat History</h4>
                 <AlertDialog open={showClearHistoryDialog} onOpenChange={setShowClearHistoryDialog}>
                    <AlertDialogTrigger asChild>
                         <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-white disabled:opacity-50" disabled={!savedSessions || savedSessions.length === 0}>
                            <Trash size={16} />
                        </Button>
                    </AlertDialogTrigger>
                     <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>This will permanently delete all chat history. This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleClearAllHistory} className="bg-red-600 hover:bg-red-700">Delete All</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto no-scrollbar pr-2 -mr-2">
                {!savedSessions || savedSessions.length === 0 ? (
                    <div className="text-center text-slate-400 pt-10">
                        <StickyNote className="mx-auto h-10 w-10 text-slate-500" />
                        <p className="mt-4 text-sm">No saved chats yet.</p>
                    </div>
                ) : (
                    savedSessions?.map(session => (
                        <div key={session.id} className="group flex items-center justify-between p-2 rounded-lg hover:bg-slate-800/60 cursor-pointer" onClick={() => handleLoadChat(session)}>
                            <div className="truncate">
                                <p className="text-sm text-white truncate">{session.title}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{formatDate(session.createdAt)}</p>
                            </div>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-red-500 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); setItemToDelete(session); }}>
                                        <Trash2 size={16} />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>This will permanently delete this chat history.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel onClick={(e)=>e.stopPropagation()}>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={(e)=>{e.stopPropagation(); handleDeleteSession(); }} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    ))
                )}
            </div>
        </div>
    )};

    const ContentSwitch = () => {
        if (loading || !theme || !initialInsight) return <LoadingSkeleton />;
        if (view === 'intro') return <IntroView />;
        if (view === 'chat') return <ChatView />;
        if (view === 'history') return <HistoryView />;
        return null;
    };

    return (
        <div
            className={cn(
                "glass-card p-3 sm:p-4 rounded-2xl flex flex-col w-full min-h-0",
                isFloating ? "h-full" : isMobile ? "h-full" : "h-[450px]"
            )}
            style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                backgroundImage: `radial-gradient(ellipse 180% 170% at 0% 0%, ${theme?.bgColor || 'transparent'}, transparent 90%)`
            }}
        >
            <AnimatePresence mode="wait">
                {isOpen && (
                     <motion.div
                        key="content-wrapper"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, transition: { delay: 0.1 } }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col flex-1 min-h-0"
                    >
                        <div className="flex-1 flex flex-col min-h-0">
                           <motion.div
                                key={view}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="flex flex-col h-full"
                            >
                                <ContentSwitch />
                            </motion.div>
                        </div>
                        {view !== 'history' && (
                            <motion.div 
                                className="flex flex-col gap-2 mt-2 flex-shrink-0"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0, transition: { delay: 0.1 } }}
                            >
                                <Popover open={showFileSearch} onOpenChange={setShowFileSearch}>
                                    <PopoverTrigger asChild>
                                        <div className="w-full"></div>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        side="top"
                                        align="start"
                                        className="w-full sm:w-[400px] p-2 bg-slate-900 border-slate-700"
                                        onOpenAutoFocus={(e) => e.preventDefault()}
                                    >
                                        <div className="text-xs text-slate-400 p-2">Mention a file...</div>
                                        <ScrollArea className="max-h-60">
                                            {filteredFiles.map(file => (
                                                <button
                                                    key={file.id}
                                                    onClick={() => handleFileSelect(file)}
                                                    className="w-full text-left flex items-center gap-2 p-2 rounded-md hover:bg-slate-800 text-sm text-slate-200"
                                                >
                                                    <FileText className="w-4 h-4 text-slate-400" />
                                                    <span className="truncate">{file.name}</span>
                                                </button>
                                            ))}
                                        </ScrollArea>
                                    </PopoverContent>
                                </Popover>
                                
                                 <div className="flex items-end gap-2 bg-slate-800/60 border border-slate-700 rounded-xl p-1">
                                    <div className="flex flex-col flex-1">
                                        {referencedFiles.length > 0 && (
                                            <div className="flex flex-wrap gap-2 px-2 pt-2">
                                                {referencedFiles.map((file, index) => (
                                                    <ReferencedFilePill
                                                        key={file.id}
                                                        file={file}
                                                        onRemove={() => {
                                                            setReferencedFiles(prev => prev.filter((_, i) => i !== index));
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                        <Textarea
                                            ref={textareaRef}
                                            placeholder="Ask a question, or type '@' to reference a file."
                                            className={cn("bg-transparent border-0 rounded-2xl text-sm resize-none overflow-y-auto no-scrollbar min-h-[38px] focus-visible:ring-0 focus-visible:ring-offset-0", isRtl(customQuestion) ? 'font-plex-arabic' : 'font-inter')}
                                            value={customQuestion}
                                            onChange={handleQuestionChange}
                                            onKeyDown={handleCustomQuestionKeyDown}
                                            disabled={isResponding}
                                            rows={1}
                                            dir="auto"
                                        />
                                    </div>

                                    <Button 
                                        size="icon" 
                                        className="rounded-full h-9 w-9 flex-shrink-0"
                                        onClick={handleCustomQuestionSubmit}
                                        disabled={isResponding || (!customQuestion.trim() && referencedFiles.length === 0)}
                                    >
                                        <ArrowUp className="w-4 h-4" />
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
