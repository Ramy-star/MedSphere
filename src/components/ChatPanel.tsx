
'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { X, RefreshCw, Check, Minus, Plus, MessageCirclePlus, CornerDownLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { chatAboutDocument } from '@/ai/flows/chat-flow';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription as AlertDialogDesc,
  AlertDialogFooter,
  AlertDialogHeader as AlertDialogHeader2,
  AlertDialogTitle as AlertDialogTitle2,
} from "@/components/ui/alert-dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Textarea } from './ui/textarea';
import { Skeleton } from './ui/skeleton';
import { AiAssistantIcon } from './icons/AiAssistantIcon';
import { cn } from '@/lib/utils';
import SendStopButton from './SendStopButton';
import { Progress } from './ui/progress';
import { CopyIcon } from './icons/CopyIcon';

type ChatPanelProps = {
  isMobile: boolean;
  documentText: string | null;
  isExtracting: boolean;
  onClose: () => void;
};

type ChatMessage = {
    role: 'user' | 'model';
    text: string;
};

type ChatMessageProps = {
    msg: ChatMessage;
    onCopy: (text: string, id: string) => void;
    onRegenerate: () => void;
    isLastMessage: boolean;
    isAiThinking: boolean;
    copiedMessageId: string | null;
    messageId: string;
    fontSizeClass: string;
};

const ChatMessage = React.memo(function ChatMessage({ msg, onCopy, onRegenerate, isLastMessage, isAiThinking, copiedMessageId, messageId, fontSizeClass }: ChatMessageProps) {
    if (msg.role === 'user') {
        return (
            <div className="flex justify-end">
                <div className={cn("rounded-3xl px-4 py-2.5 max-w-[90%]", fontSizeClass)} style={{backgroundColor: '#003f7a'}}>
                    <p className="text-white whitespace-pre-wrap break-words font-inter">{msg.text}</p>
                </div>
            </div>
        );
    }
    
    const showActions = !isAiThinking && isLastMessage;

    return (
        <div className="group/message">
            <div className="relative font-inter">
                 <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    className={cn("prose prose-sm max-w-full", fontSizeClass)}
                    components={{
                        h2: ({node, ...props}) => <h2 className="text-white mt-6 mb-3 text-lg" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-white mt-4 mb-2 text-base" {...props} />,
                        h4: ({node, ...props}) => <h4 className="text-white mt-3 mb-1 text-base" {...props} />,
                        p: ({node, ...props}) => <p className="text-white my-4" {...props} />,
                        strong: ({node, ...props}) => <strong className="text-white" {...props} />,
                        ul: ({node, ...props}) => <ul className="text-white my-4 ml-4 list-disc" {...props} />,
                        ol: ({node, ...props}) => <ol className="text-white my-4 ml-4 list-decimal" {...props} />,
                        li: ({node, ...props}) => <li className="text-white mb-2" {...props} />,
                        code: ({node, ...props}) => <code className="text-inherit bg-transparent p-0 font-ubuntu whitespace-pre-wrap" {...props} />,
                        pre: ({node, ...props}) => <pre className="bg-transparent p-0" {...props} />,
                        table: ({node, ...props}) => <table className="w-full my-4 border-collapse border border-slate-700 rounded-lg overflow-hidden" {...props} />,
                        thead: ({node, ...props}) => <thead className="bg-slate-800/50" {...props} />,
                        tbody: ({node, ...props}) => <tbody {...props} />,
                        tr: ({node, ...props}) => <tr className="border-b border-slate-700 last:border-b-0" {...props} />,
                        th: ({node, ...props}) => <th className="border-r border-slate-700 p-2 text-left text-white font-semibold last:border-r-0" {...props} />,
                        td: ({node, ...props}) => <td className="border-r border-slate-700 p-2 align-top last:border-r-0 text-white" {...props} />,
                    }}
                  >
                      {msg.text}
                  </ReactMarkdown>
            </div>

            <div className={cn("flex items-center gap-2 mt-4 transition-opacity", "opacity-0 group-hover/message:opacity-100")}>
                <TooltipProvider delayDuration={100}>
                    <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onCopy(msg.text, messageId)}
                            className="h-8 w-8 rounded-full text-white hover:bg-white/10"
                            aria-label="Copy AI response to clipboard"
                        >
                            {copiedMessageId === messageId ? <Check className="w-6 h-6 transition-all" /> : <CopyIcon className="w-6 h-6" />}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={8} className="rounded-lg bg-black text-white">
                        <p>Copy</p>
                    </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                {showActions && (
                    <TooltipProvider delayDuration={100}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onRegenerate}
                            className="h-8 w-8 rounded-full text-white hover:bg-white/10"
                            aria-label="Regenerate response"
                        >
                            <RefreshCw className="w-6 h-6 transition-all" />
                        </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" sideOffset={8} className="rounded-lg bg-black text-white">
                        <p>Regenerate</p>
                        </TooltipContent>
                    </Tooltip>
                    </TooltipProvider>
                )}
            </div>
        </div>
    );
});


export default function ChatPanel({ isMobile, documentText, isExtracting, onClose }: ChatPanelProps) {
    const { toast } = useToast();
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
    const [showConfirmNewChat, setShowConfirmNewChat] = useState(false);
    const fontSizes = ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl'];
    const [fontSizeIndex, setFontSizeIndex] = useState(1);
    
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const inputContainerRef = useRef<HTMLDivElement>(null);

    // Mobile keyboard handling effect
    useEffect(() => {
        if (!isMobile || typeof window === 'undefined' || !window.visualViewport) {
            return;
        }

        const vv = window.visualViewport;
        const inputContainer = inputContainerRef.current;
        const messagesContainer = messagesContainerRef.current;

        if (!inputContainer || !messagesContainer) return;

        const handleResize = () => {
             // Amount the keyboard covers the layout viewport
            const keyboardOffset = window.innerHeight - vv.height;
            const inputContainerHeight = inputContainer.clientHeight;
            
            // Move the input container up instantly with the keyboard
            inputContainer.style.transform = `translateY(-${keyboardOffset}px)`;
            
            // Add padding to the bottom of the chat messages container
            // so the last message is always visible above the keyboard.
            messagesContainer.style.paddingBottom = `${inputContainerHeight + keyboardOffset}px`;

            // Scroll to the bottom to keep the last message in view
            if (messagesContainer) {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        };

        vv.addEventListener('resize', handleResize);
        
        // Initial call to set padding correctly
        handleResize();

        return () => {
            vv.removeEventListener('resize', handleResize);
             // Reset styles on cleanup
            if (inputContainer) inputContainer.style.transform = 'translateY(0px)';
            if (messagesContainer) messagesContainer.style.paddingBottom = `${inputContainer.clientHeight}px`;
        };
    }, [isMobile]);


    const startNewChat = useCallback(() => {
        setChatHistory([]);
        setIsAiThinking(false);
        setShowConfirmNewChat(false);
      }, []);

    const handleNewChat = useCallback(() => {
    if (chatHistory.length > 0) {
        setShowConfirmNewChat(true);
    } else {
        startNewChat();
    }
    }, [chatHistory.length, startNewChat]);

    const submitChat = useCallback(async (question: string, historyToUse: ChatMessage[]) => {
        if (!question.trim()) return;

        if (!documentText) {
           toast({ variant: 'destructive', title: 'Document Content Unavailable', description: 'Cannot chat without document content. The content might still be loading or failed to load.' });
           return;
        }
        
        setIsAiThinking(true);
        abortControllerRef.current = new AbortController();
        
        try {
            const response = await chatAboutDocument({
                question: question,
                documentContent: documentText,
                chatHistory: historyToUse,
            }, { signal: abortControllerRef.current.signal });
            
            setChatHistory(prev => [...historyToUse, { role: 'user' as const, text: question }, { role: 'model' as const, text: response }]);

        } catch (error: any) {
            if (error.name === 'AbortError') {
              console.log("Chat request aborted.");
              setChatHistory(prev => [...historyToUse, { role: 'user' as const, text: question }]);
            } else {
                console.error("Error calling AI flow:", error);
                toast({
                    variant: "destructive",
                    title: "AI Assistant Error",
                    description: "The AI assistant could not be reached. Please try again later."
                });
                 setChatHistory(prev => [...historyToUse, { role: 'user' as const, text: question }]);
            }
        } finally {
            setIsAiThinking(false);
            abortControllerRef.current = null;
        }
      }, [documentText, toast]);

    const handleChatSubmit = useCallback(async (e?: React.FormEvent<HTMLFormElement> | React.MouseEvent<Element, MouseEvent>) => {
      e?.preventDefault();
      if(isAiThinking || !chatInput.trim()) return;
      const question = chatInput;
      setChatHistory(prev => [...prev, { role: 'user' as const, text: question }]);
      setChatInput('');
      await submitChat(question, chatHistory);
  }, [chatInput, submitChat, isAiThinking, chatHistory]);

    const handleRegenerate = useCallback(async () => {
        if (isAiThinking || chatHistory.length === 0) return;

        const lastUserMessageIndex = chatHistory.findLastIndex(m => m.role === 'user');
        if (lastUserMessageIndex === -1) return;
        
        const lastUserMessage = chatHistory[lastUserMessageIndex];
        const historyBeforeLastInteraction = chatHistory.slice(0, lastUserMessageIndex);

        setChatHistory(historyBeforeLastInteraction.concat(lastUserMessage));

        await submitChat(lastUserMessage.text, historyBeforeLastInteraction);
    }, [isAiThinking, chatHistory, submitChat]);

    const handleStopAi = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    }

    const handleCopyToClipboard = (text: string, messageId: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedMessageId(messageId);
            setTimeout(() => setCopiedMessageId(null), 2000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
            toast({
                variant: "destructive",
                title: "Failed to Copy",
                description: "Could not copy the message."
            })
        });
      }

    const increaseFontSize = () => {
        setFontSizeIndex(prev => Math.min(prev + 1, fontSizes.length - 1));
      };
      const decreaseFontSize = () => {
        setFontSizeIndex(prev => Math.max(prev - 1, 0));
      };

    const handleInsertNewline = (e: React.MouseEvent) => {
        e.preventDefault();
        if (textareaRef.current) {
            const { selectionStart, selectionEnd, value } = textareaRef.current;
            const newValue = value.substring(0, selectionStart) + '\n' + value.substring(selectionEnd);
            setChatInput(newValue);
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.selectionStart = selectionStart + 1;
                    textareaRef.current.selectionEnd = selectionStart + 1;
                    textareaRef.current.focus();
                }
            }, 0);
        }
      };

    useEffect(() => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, [chatHistory, isAiThinking]);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            const scrollHeight = textarea.scrollHeight;
            const maxHeight = 150; 
            textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;

            if (inputContainerRef.current) {
                 const messagesContainer = messagesContainerRef.current;
                 if (messagesContainer) {
                    messagesContainer.style.paddingBottom = `${inputContainerRef.current.clientHeight}px`;
                 }
            }
        }
    }, [chatInput]);

    const chatViewContent = (
        <>
            <header className={cn("flex items-center justify-between whitespace-nowrap px-4 py-3 shrink-0 h-14 sticky top-0 z-20", isMobile ? "bg-[#212121]" : "bg-transparent")}>
                <div className="flex items-center gap-2">
                    <AiAssistantIcon className="h-6 w-6" />
                    <h2 className="text-lg font-semibold text-white">AI Assistant</h2>
                </div>
                <TooltipProvider delayDuration={100}>
                <div className="flex items-center">
                     <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={decreaseFontSize} disabled={fontSizeIndex === 0} className="text-slate-300 hover:bg-white/10 rounded-full w-9 h-9">
                            <Minus className="w-6 h-6" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" sideOffset={8} className="rounded-lg bg-black text-white"><p>Decrease font size</p></TooltipContent>
                     </Tooltip>
                     <Tooltip>
                       <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={increaseFontSize} disabled={fontSizeIndex === fontSizes.length - 1} className="text-slate-300 hover:bg-white/10 rounded-full w-9 h-9">
                            <Plus className="w-6 h-6" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" sideOffset={8} className="rounded-lg bg-black text-white"><p>Increase font size</p></TooltipContent>
                     </Tooltip>
                     <Tooltip>
                       <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={handleNewChat} className="text-slate-300 hover:bg-white/10 rounded-full w-9 h-9" aria-label="Start a new chat session">
                            <MessageCirclePlus className="w-6 h-6" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" sideOffset={8} className="rounded-lg bg-black text-white"><p>Start New Chat</p></TooltipContent>
                     </Tooltip>
                     <Tooltip>
                       <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-300 hover:bg-white/10 rounded-full w-9 h-9" aria-label="Close chat panel">
                            <X className="w-6 h-6" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" sideOffset={8} className="rounded-lg bg-black text-white"><p>Close Chat</p></TooltipContent>
                     </Tooltip>
                </div>
                </TooltipProvider>
            </header>
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto">
                 <div className="space-y-6 p-4 sm:p-6">
                    {chatHistory.length === 0 && !isAiThinking && (
                        <div className={cn("prose prose-sm max-w-full font-inter", fontSizes[fontSizeIndex])}>
                            {isExtracting ? (
                                <div className="flex flex-col gap-4">
                                  <div className="flex items-center gap-2 text-white">
                                    <Skeleton className="h-5 w-5 rounded-full" />
                                    <p>Analyzing document...</p>
                                  </div>
                                  <Progress value={50} className="w-full h-1" />
                                </div>
                            ) : documentText ? (
                                <p className="text-white">Hello! I am your AI assistant. Ask me anything about this document, or ask me to create a quiz!</p>
                            ) : (
                                <p className="text-yellow-400">Document content is not available or could not be extracted. Chat is disabled.</p>
                            )}
                        </div>
                    )}

                    {chatHistory.map((msg, index) => {
                        const isLastModelMessage = index === chatHistory.length - 1 && msg.role === 'model';
                        return (
                            <ChatMessage
                                key={`msg-${index}`}
                                messageId={`msg-${index}`}
                                msg={msg}
                                onCopy={handleCopyToClipboard}
                                onRegenerate={handleRegenerate}
                                isLastMessage={isLastModelMessage}
                                isAiThinking={isAiThinking}
                                copiedMessageId={copiedMessageId}
                                fontSizeClass={fontSizes[fontSizeIndex]}
                            />
                        )
                    })}

                     {isAiThinking && (
                        <div className="flex items-start space-x-3 group/message">
                            <AiAssistantIcon className="h-6 w-6 flex-shrink-0" />
                            <div className="flex-1 space-y-3 pt-1">
                                <Skeleton className="h-4 w-12 rounded-lg" />
                                <Skeleton className="h-4 w-[90%] rounded-lg" />
                                <Skeleton className="h-4 w-[75%] rounded-lg" />
                                <Skeleton className="h-4 w-[85%] rounded-lg" />
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            <div
                ref={inputContainerRef}
                className={cn(
                    "w-full z-20 transition-transform duration-0", // No transition for instant movement
                    isMobile ? "fixed bottom-0 left-0 right-0" : "relative"
                )}
            >
              <div className='p-2' style={{backgroundColor: '#212121'}}>
                 <form
                    onSubmit={handleChatSubmit}
                    className={cn("relative mx-auto w-full max-w-[95%]",
                        (!chatInput.trim() || isExtracting || !documentText) && "opacity-50"
                    )}
                    >
                    <Textarea
                        ref={textareaRef}
                        className="w-full rounded-3xl border border-white/10 py-3 pl-4 pr-12 text-white placeholder-[#9A9A9A] h-auto min-h-[52px] max-h-[150px] resize-none overflow-y-auto focus-visible:ring-0 focus-visible:ring-offset-0 font-inter shadow-lg shadow-black/20"
                        placeholder="Ask anything..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                         onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleChatSubmit();
                            }
                        }}
                        disabled={isAiThinking || isExtracting || !documentText}
                        rows={1}
                        style={{backgroundColor: '#303030'}}
                    />
                    <div className="absolute right-3 bottom-2 flex h-[36px] items-center gap-1">
                        {isMobile && (
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={handleInsertNewline}
                                className="w-8 h-8 rounded-full text-slate-400 hover:bg-white/10"
                                aria-label="Insert new line"
                            >
                                <CornerDownLeft className="w-5 h-5" />
                            </Button>
                        )}
                        <SendStopButton
                            size='md'
                            onSend={handleChatSubmit}
                            onStop={handleStopAi}
                            isSending={isAiThinking}
                            disabled={!chatInput.trim() || isExtracting || !documentText}
                        />
                    </div>
                </form>
              </div>
            </div>

            <AlertDialog open={showConfirmNewChat} onOpenChange={setShowConfirmNewChat}>
                <AlertDialogContent className="w-[70vw] sm:max-w-[425px] p-0 border-slate-700 rounded-2xl bg-slate-900/70 backdrop-blur-xl shadow-lg text-white">
                  <AlertDialogHeader2 className="p-6 pb-0">
                    <AlertDialogTitle2>Start New Chat?</AlertDialogTitle2>
                    <AlertDialogDesc>
                      Are you sure you want to start a new chat? Your current conversation history will be cleared.
                    </AlertDialogDesc>
                  </AlertDialogHeader2>
                  <AlertDialogFooter className='flex-row justify-end items-center space-x-2 p-6 pt-4'>
                    <AlertDialogCancel asChild><Button variant="outline" className='flex-1 sm:flex-none rounded-xl'>Cancel</Button></AlertDialogCancel>
                    <AlertDialogAction asChild><Button variant="destructive" className='flex-1 sm:flex-none rounded-xl' onClick={startNewChat}>New Chat</Button></AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </>
        );

    if (isMobile) {
        return (
             <div
                className="flex flex-col overflow-hidden h-full w-full absolute inset-0 z-20"
                style={{backgroundColor: '#212121', height: 'var(--1dvh, 100vh)'}}
            >
                {chatViewContent}
            </div>
        );
    }
    
    return (
        <div
            className="flex-shrink-0 flex flex-col overflow-hidden h-full border-l border-white/10 w-[512px]"
            style={{backgroundColor: '#212121'}}
            aria-label="AI Chat Panel"
        >
            {chatViewContent}
        </div>
    );
}
