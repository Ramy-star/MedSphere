'use client';

import React, { useEffect, useState, useCallback, useRef, useLayoutEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, ChevronDown, Plus, Minus, Maximize, Shrink, ArrowUp, Copy, Paperclip, X } from 'lucide-react';
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
import { Check } from 'lucide-react';
import { useCollection } from '@/firebase/firestore/use-collection';
import { Content, contentService } from '@/lib/contentService';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { FileText } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { create } from 'zustand';


if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

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
    referencedFiles?: Content[];
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

const ReferencedFilePill = ({ file, onRemove }: { file: Content, onRemove: () => void }) => (
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
            <TooltipContent side="top" className="rounded-lg bg-black text-white">
                <p>{file.name}</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);


export function AiStudyBuddy({ user, isFloating = false, onToggleExpand }: { user: UserProfile, isFloating?: boolean, onToggleExpand?: () => void }) {
    const { initialInsight, theme, setInitialData } = useAiBuddyStore();
    const [loading, setLoading] = useState(!initialInsight);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [isResponding, setIsResponding] = useState(false);
    const [customQuestion, setCustomQuestion] = useState('');
    const [view, setView] = useState<'intro' | 'chat'>('intro');
    const { toast } = useToast();
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [fontSize, setFontSize] = useState(14);
    const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
    const [showFileSearch, setShowFileSearch] = useState(false);
    const [fileSearchQuery, setFileSearchQuery] = useState('');
    const [referencedFiles, setReferencedFiles] = useState<Content[]>([]);

    const { data: allFiles } = useCollection<Content>('content');
    
    const isOpen = true; // Simplified for clarity, assuming it's always open when rendered

    const filteredFiles = useMemo(() => {
        if (!allFiles) return [];
        const pdfFiles = allFiles.filter(item => item.type === 'FILE' && item.metadata?.mime === 'application/pdf');
        if (!fileSearchQuery) return pdfFiles.slice(0, 10);
        return pdfFiles.filter(file => file.name.toLowerCase().includes(fileSearchQuery.toLowerCase())).slice(0, 10);
    }, [allFiles, fileSearchQuery]);


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
            const result = await getStudyBuddyInsight({greeting: currentTheme.greeting, ...userStats});
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

    const submitQuery = useCallback(async (prompt: string, filesToSubmit: Content[]) => {
        if (!prompt && filesToSubmit.length === 0) return;
        if (!theme) return;

        setView('chat');
        const newHistory: ChatMessage[] = [...chatHistory, { role: 'user', text: prompt, referencedFiles: filesToSubmit }];
        setChatHistory(newHistory);
        setIsResponding(true);
        
        let fileContent = '';
        try {
            if (filesToSubmit.length > 0) {
                const fileContents = await Promise.all(
                    filesToSubmit.map(async file => {
                        if (file.metadata?.storagePath) {
                            const fileBlob = await contentService.getFileContent(file.metadata.storagePath);
                            const pdf = await pdfjs.getDocument(await fileBlob.arrayBuffer()).promise;
                            const text = await contentService.extractTextFromPdf(pdf);
                            return `--- START OF FILE: ${file.name} ---\n\n${text}\n\n--- END OF FILE: ${file.name} ---`;
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
                chatHistory: newHistory.slice(0, -1),
                referencedFileContent: fileContent,
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
    }, [theme, user, toast, chatHistory]);

    const handleSuggestionClick = (suggestion: Suggestion) => {
        submitQuery(suggestion.prompt, []);
    };

    const handleCustomQuestionSubmit = () => {
        const questionToSend = customQuestion.trim();
        const filesToSend = [...referencedFiles];

        if (!questionToSend && filesToSend.length === 0) return;

        submitQuery(questionToSend, filesToSend);
        setCustomQuestion('');
        setReferencedFiles([]);
    };
    
    const handleFileSelect = (file: Content) => {
        setReferencedFiles(prev => {
            if(prev.some(f => f.id === file.id)) return prev; // Avoid duplicates
            return [...prev, file];
        });
        setShowFileSearch(false);
        setFileSearchQuery('');
        // Remove the `@` trigger from the textarea
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
    
    const handleBackToIntro = () => {
        setView('intro');
        setChatHistory([]);
    };

    const renderHeaderControls = () => (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-white"
          onClick={() => setFontSize((s) => Math.max(s - 1, 10))}
        >
          <Minus size={16} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-white"
          onClick={() => setFontSize((s) => Math.min(s + 1, 20))}
        >
          <Plus size={16} />
        </Button>
        {isFloating && onToggleExpand && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white"
            onClick={onToggleExpand}
          >
            <Maximize size={16} />
          </Button>
        )}
      </div>
    );

    const renderChatHeader = () => (
         <div className="flex items-center justify-between mb-2 sm:mb-3 flex-shrink-0 sticky top-0 z-10 bg-[rgba(30,41,59,0.5)] backdrop-blur-sm -mx-4 px-4 pt-3 pb-2">
             <Button onClick={handleBackToIntro} variant="ghost" size="icon" className="h-7 w-7 rounded-full text-white">
                <ArrowLeft className="w-4 h-4" />
            </Button>
            {renderHeaderControls()}
        </div>
    );
    
    const LoadingSkeleton = () => (
        <div className="flex flex-col h-full">
            <div className="p-4 space-y-2 flex-1">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/5" />
            </div>
            <div className="p-4 flex gap-2 flex-shrink-0">
                <Skeleton className="h-8 w-24 rounded-full" />
                <Skeleton className="h-8 w-28 rounded-full" />
            </div>
        </div>
    );

    const IntroView = () => (
        <>
            <div style={{color: theme!.textColor}}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} className="text-slate-400 text-xs mt-1 sm:mt-2 max-w-prose whitespace-pre-wrap">{initialInsight!.mainInsight}</ReactMarkdown>
            </div>
            <div className="mt-3 sm:mt-4 flex flex-wrap gap-2">
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
                  {message.referencedFiles && message.referencedFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                          {message.referencedFiles.map(file => (
                              <div key={file.id} className="flex items-center gap-1.5 bg-blue-900/70 text-blue-200 text-xs font-medium pl-2 pr-1 py-0.5 rounded-full shrink-0">
                                <Paperclip className="w-3 h-3" />
                                <span className="truncate max-w-[100px]">{file.name}</span>
                              </div>
                          ))}
                      </div>
                  )}
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
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: ({ node, ...props }) => (
                        <table
                          className="w-full my-4 border-collapse border border-slate-700 rounded-lg overflow-hidden"
                          {...props}
                        />
                      ),
                      thead: ({ node, ...props }) => (
                        <thead className="bg-slate-800/50" {...props} />
                      ),
                      tr: ({ node, ...props }) => (
                        <tr
                          className="border-b border-slate-700 last:border-b-0"
                          {...props}
                        />
                      ),
                      th: ({ node, ...props }) => (
                        <th
                          className="border-r border-slate-700 p-2 text-left text-white font-semibold last:border-r-0"
                          {...props}
                        />
                      ),
                      td: ({ node, ...props }) => (
                        <td
                          className="border-r border-slate-700 p-2 align-top"
                          {...props}
                        />
                      ),
                    }}
                  >
                    {message.text}
                  </ReactMarkdown>
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
    
    const ContentSwitch = () => {
        return (
            <div className="flex-1 min-h-0 pt-4 flex flex-col">
                 {view === 'intro' ? <IntroView /> : <ChatView />}
            </div>
        );
    };

    return (
        <div
            className={cn(
                "glass-card p-3 sm:p-4 rounded-2xl flex flex-col w-full",
                isFloating ? "h-full" : "flex-1"
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
                        className="flex flex-col h-full"
                    >
                        <motion.div
                            key={isFloating ? "floating-header" : "static-header"}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex items-center justify-between gap-3 sm:gap-4 flex-shrink-0"
                          >
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
                                     <h3 className="text-sm sm:text-base font-bold text-white">
                                        {theme.greeting}
                                    </h3>
                                    )}
                                </div>
                            </div>
                            {(!loading && theme) && view === 'intro' && renderHeaderControls()}
                        </motion.div>

                        <div className="flex-1 flex flex-col min-h-0">
                            {loading || !theme || !initialInsight ? (
                                <LoadingSkeleton />
                            ) : (
                                <>
                                    <ContentSwitch />
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
                                                className="w-full sm:w-[500px] p-2 bg-slate-900 border-slate-700"
                                                onOpenAutoFocus={(e) => e.preventDefault()}
                                            >
                                                <div className="text-xs text-slate-400 p-2">Mention a PDF file...</div>
                                                <div className="max-h-60 overflow-y-auto no-scrollbar">
                                                    {filteredFiles.map(file => (
                                                        <button
                                                            key={file.id}
                                                            onClick={() => handleFileSelect(file)}
                                                            className="w-full text-left flex items-center gap-2 p-2 rounded-md hover:bg-slate-800 text-sm text-slate-200"
                                                        >
                                                            <FileText className="w-4 h-4 text-red-400" />
                                                            <span className="truncate">{file.name}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                        
                                         <div className="flex items-end gap-2 bg-slate-800/60 border border-slate-700 rounded-xl p-1">
                                            <div className="flex flex-col flex-1">
                                                {referencedFiles.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 px-2 pt-2">
                                                        {referencedFiles.map(file => (
                                                            <ReferencedFilePill
                                                                key={file.id}
                                                                file={file}
                                                                onRemove={() => setReferencedFiles(prev => prev.filter(f => f.id !== file.id))}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                                <Textarea
                                                    ref={textareaRef}
                                                    placeholder={view === 'intro' ? "Ask something else..." : "Ask a follow-up, or type '@' to reference a file."}
                                                    className={cn("bg-transparent border-0 rounded-xl text-sm resize-none overflow-y-auto no-scrollbar min-h-[38px] focus-visible:ring-0 focus-visible:ring-offset-0", isRtl(customQuestion) ? 'font-plex-arabic' : 'font-inter')}
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
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
