'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import FilePreview from './FilePreview';
import type { Content } from '@/lib/contentService';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { X, Download, Share2, File as FileIcon, ExternalLink, Sparkles, Send, RefreshCw, Copy, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase/auth/use-user';
import { AnimatePresence, motion } from 'framer-motion';
import { chatAboutDocument } from '@/ai/flows/chat-flow';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import ReactMarkdown from 'react-markdown';
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


// Define a type for the ref to hold the text extraction function
type PdfViewerRef = {
  extractText: () => Promise<string>;
};

type ChatMessageProps = {
    msg: { role: 'user' | 'model', text: string };
    onCopy: (text: string, id: string) => void;
    copiedMessageId: string | null;
    messageId: string;
};

const ChatMessage = React.memo(function ChatMessage({ msg, onCopy, copiedMessageId, messageId }: ChatMessageProps) {
    if (msg.role === 'user') {
        return (
            <div className="flex justify-end">
                <div className="rounded-full bg-blue-900/80 px-4 py-2 inline-block">
                    <p className="text-slate-200">{msg.text}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="prose prose-sm max-w-full text-slate-200 relative group">
            <ReactMarkdown
              components={{
                h2: ({node, ...props}) => <h2 className="text-white mt-4 mb-2" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-white mt-3 mb-1" {...props} />,
                h4: ({node, ...props}) => <h4 className="text-white mt-2 mb-1" {...props} />,
                p: ({node, ...props}) => <p className="text-slate-200 my-2" {...props} />,
                strong: ({node, ...props}) => <strong className="text-white" {...props} />,
                ul: ({node, ...props}) => <ul className="text-slate-200 my-2 ml-4 list-disc" {...props} />,
                ol: ({node, ...props}) => <ol className="text-slate-200 my-2 ml-4 list-decimal" {...props} />,
                li: ({node, ...props}) => <li className="text-slate-200 mb-1" {...props} />,
                code: ({node, ...props}) => <code className="text-white bg-black/50 rounded-sm px-1" {...props} />,
                pre: ({node, ...props}) => <pre className="bg-black/50 p-2 rounded-md" {...props} />,
                hr: ({node, ...props}) => <hr className="border-slate-700 my-4" {...props} />,
                 table: ({node, ...props}) => <table className="w-full border-collapse border border-slate-700" {...props} />,
                thead: ({node, ...props}) => <thead className="bg-slate-800" {...props} />,
                tbody: ({node, ...props}) => <tbody {...props} />,
                tr: ({node, ...props}) => <tr className="border-b border-slate-700" {...props} />,
                th: ({node, ...props}) => <th className="p-2 border-r border-slate-700 text-left text-white" {...props} />,
                td: ({node, ...props}) => <td className="p-2 border-r border-slate-700" {...props} />,
              }}
            >
                {msg.text}
            </ReactMarkdown>
            <div className="text-right mt-2">
                <button
                    onClick={() => onCopy(msg.text, messageId)}
                    className="p-1.5 bg-slate-700/50 rounded-full text-slate-300 hover:bg-slate-700 hover:text-white transition-opacity"
                    title="Copy message"
                    aria-label="Copy AI response to clipboard"
                >
                    {copiedMessageId === messageId ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
            </div>
        </div>
    );
});


export function FilePreviewModal({ item, onOpenChange }: { item: Content | null, onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const { user } = useUser();
  const isAdmin = user?.uid === process.env.NEXT_PUBLIC_ADMIN_UID;
  const pdfViewerRef = useRef<PdfViewerRef>(null);
  
  const [showChat, setShowChat] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [documentText, setDocumentText] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);
  const [showConfirmNewChat, setShowConfirmNewChat] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);


  const fileUrl = item?.metadata?.storagePath;

  const handleNewChat = useCallback(() => {
    if (chatHistory.length > 0) {
        setShowConfirmNewChat(true);
    } else {
        startNewChat();
    }
  }, [chatHistory.length]);
  
  const startNewChat = useCallback(() => {
    setChatHistory([]);
    setDocumentText(null); // Allow re-extraction if needed
    setIsAiThinking(false);
    setShowConfirmNewChat(false);
  }, []);

  useEffect(() => {
    // Reset state when a new item is opened, but don't close the chat panel
    setChatHistory([]);
    setDocumentText(null);
    setIsAiThinking(false);
    setShowConfirmNewChat(false);
  }, [item]);

  useEffect(() => {
    // Scroll to bottom of chat history when it updates
    if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, isAiThinking]);


  if (!item) return null;

  const handleDownload = async () => {
    if (!fileUrl || !item) return;
    try {
        setLoading(true);
        setError(null);
        const res = await fetch(fileUrl);
        if (!res.ok) throw new Error(`Failed to fetch file: ${res.statusText}`);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = item.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(blobUrl);
    } catch (error: any) {
        console.error("Download failed:", error);
        setError(error.message);
        toast({
            variant: "destructive",
            title: "Download Failed",
            description: "Could not download the file.",
        });
    } finally {
        setLoading(false);
    }
  }
  
  const handleCopyToClipboard = (text: string, messageId: string) => {
    navigator.clipboard.writeText(text).then(() => {
        setCopiedMessage(messageId);
        setTimeout(() => setCopiedMessage(null), 2000); // Reset after 2s
    }).catch(err => {
        console.error('Failed to copy: ', err);
        toast({
            variant: "destructive",
            title: "Failed to Copy",
            description: "Could not copy the message.",
        })
    });
  }


  const handleClose = () => {
    setShowChat(false); // Also close chat on modal close
    onOpenChange(false);
  }
  
  const handleOpenInNewTab = () => {
    if (!fileUrl) return;
    window.open(fileUrl, '_blank');
  };

  const handleCopyLink = () => {
    if(!fileUrl) return;
    navigator.clipboard.writeText(fileUrl).then(() => {
        toast({
            title: "Link Copied!",
            description: "A shareable link to this file has been copied.",
        })
    }).catch(err => {
        console.error('Failed to copy: ', err);
        toast({
            variant: "destructive",
            title: "Failed to Copy",
            description: "Could not copy the link.",
        })
    });
  }

  const handleChatSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!chatInput.trim() || isAiThinking) return;

    let currentDocText = documentText;

    if (!currentDocText && pdfViewerRef.current) {
        setIsExtracting(true);
        try {
            currentDocText = await pdfViewerRef.current.extractText();
            setDocumentText(currentDocText);
        } catch (err) {
            console.error("Failed to extract PDF text on demand:", err);
            toast({ variant: 'destructive', title: 'Could not read PDF', description: 'AI features are unavailable for this file.' });
            setIsExtracting(false);
            return;
        } finally {
            setIsExtracting(false);
        }
    }
    
    if (!currentDocText) {
       toast({ variant: 'destructive', title: 'Document Content Unavailable', description: 'Cannot chat without document content.' });
       return;
    }

    const newQuestion = chatInput;
    const currentChatHistory = [...chatHistory, { role: 'user' as const, text: newQuestion }];
    setChatHistory(currentChatHistory);
    setChatInput('');
    setIsAiThinking(true);
    
    try {
        const response = await chatAboutDocument({ question: newQuestion, documentContent: currentDocText });
        setChatHistory(prev => [...prev, { role: 'model', text: response }]);
    } catch (error: any) {
        console.error("AI chat error:", error);
        setChatHistory(prev => [...prev, { role: 'model', text: error.message || 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
        setIsAiThinking(false);
    }
  }

  const isChatAvailable = item.metadata?.mime === 'application/pdf';


  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent 
        className="max-w-none w-screen h-screen p-0 flex flex-col bg-slate-900/80 border-0"
        hideCloseButton={true}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>File Preview: {item.name}</DialogTitle>
          <DialogDescription>
            Previewing file {item.name}. You can download, share, or chat with the document if supported.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden h-full">

            {/* File Preview */}
            <div className="flex-1 flex flex-col h-full bg-transparent">
                <header className="flex h-16 shrink-0 items-center justify-between px-4 bg-slate-950/70 border-b border-slate-800 z-10">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={handleClose} className="text-slate-300 hover:text-white hover:bg-white/10" aria-label="Close file preview">
                        <X className="w-6 h-6" />
                    </Button>
                    <div className='flex items-center gap-3'>
                        <FileIcon className='w-5 h-5 text-slate-400' />
                        <span className="font-medium text-white truncate">{item.name}</span>
                    </div>
                </div>
                <div className='flex items-center gap-2'>
                    {isChatAvailable && (
                    <Button variant={showChat ? 'default' : 'outline'} onClick={() => setShowChat(!showChat)} className="rounded-full" aria-label={showChat ? "Close AI chat" : "Open AI chat"}>
                        <Sparkles className="mr-2 h-4 w-4"/>
                        Chat with AI
                    </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={handleDownload} disabled={!fileUrl || loading} className="text-slate-300 hover:text-white hover:bg-white/10" title="Download">
                        <Download className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleOpenInNewTab} disabled={!fileUrl} className="text-slate-300 hover:text-white hover:bg-white/10" title="Open in new tab">
                        <ExternalLink className="w-5 h-5" />
                    </Button>
                    {isAdmin && (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant='default' className='rounded-full' disabled={!fileUrl}>
                                <Share2 className="w-5 h-5 mr-2" />
                                Share
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 border-slate-700 rounded-xl bg-slate-800 text-white shadow-lg mr-4">
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <h4 className="font-medium leading-none">Share File</h4>
                                    <p className="text-sm text-slate-400">
                                        Anyone with this link can view the file.
                                    </p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Input defaultValue={fileUrl} readOnly className="h-8"/>
                                    <Button size="sm" className="px-3" onClick={handleCopyLink} aria-label="Copy shareable link">
                                        <span className="sr-only">Copy</span>
                                        <Share2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                    )}
                </div>
                </header>

                <main className="flex-1 overflow-auto flex items-center justify-center relative">
                    {loading && <div className="text-white">Loading...</div>}
                    {error && <div className="text-red-400">Error: {error}</div>}
                    {!loading && !error && fileUrl && <FilePreview url={fileUrl} mime={item.metadata?.mime ?? 'application/octet-stream'} itemName={item.name} pdfViewerRef={pdfViewerRef} />}
                    {!loading && !fileUrl && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-slate-300 bg-slate-800/50 rounded-lg p-8">
                        <p className="text-xl mb-3">File content not available.</p>
                        <p className="text-sm text-slate-400">The file could not be loaded. It might have been deleted or there was a network issue.</p>
                    </div>
                    )}
                </main>
            </div>

            <AnimatePresence>
              {showChat && (
                <motion.aside
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 448, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="flex flex-col overflow-hidden h-full bg-slate-900"
                    aria-label="AI Chat Panel"
                >
                     <header className="flex items-center justify-between whitespace-nowrap border-b border-white/10 px-4 py-3 shrink-0">
                        <div className="flex items-center gap-3 text-white">
                            <Sparkles className="w-5 h-5 text-blue-400" />
                            <h2 className="text-lg font-bold">AI Study Assistant</h2>
                        </div>
                        <div className="flex items-center">
                            <Button variant="ghost" size="icon" onClick={handleNewChat} className="text-slate-300 hover:bg-white/10 rounded-full w-8 h-8" title="Start New Chat" aria-label="Start a new chat session">
                                <RefreshCw className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setShowChat(false)} className="text-slate-300 hover:bg-white/10 rounded-full w-8 h-8" title="Close Chat" aria-label="Close chat panel">
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                    </header>
                    <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-hidden">
                        <div ref={chatContainerRef} className="flex-1 space-y-6 overflow-y-auto pr-4 -mr-4">
                            {isExtracting && (
                               <div className="w-full mt-2">
                                    <div className="h-1 bg-blue-500/50 animate-pulse rounded"></div>
                                    <p className="text-center text-xs text-slate-400 mt-1">Analyzing PDF...</p>
                                </div>
                            )}
                            
                            {chatHistory.length === 0 && !isAiThinking && !isExtracting && (
                                <div className="prose prose-sm max-w-full text-slate-200">
                                    <p>Hello! I am your AI assistant. Ask me anything about this document.</p>
                                </div>
                            )}

                            {chatHistory.map((msg, index) => (
                                <ChatMessage
                                    key={`msg-${index}`}
                                    messageId={`msg-${index}`}
                                    msg={msg}
                                    onCopy={handleCopyToClipboard}
                                    copiedMessageId={copiedMessage}
                                />
                            ))}

                            {isAiThinking && (
                                <div className="w-full">
                                    <div className="h-1 bg-blue-500/50 animate-pulse rounded"></div>
                                </div>
                            )}
                        </div>
                        <div className="mt-8">
                            <form onSubmit={handleChatSubmit} className="relative">
                                <Input 
                                    className="w-full rounded-full border border-white/10 bg-white/5 py-4 pl-6 pr-16 text-white placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary h-14 text-base backdrop-blur-lg"
                                    placeholder="Type your message..."
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    disabled={isExtracting || isAiThinking}
                                />
                                <Button type="submit" size="icon" className="absolute top-1/2 right-3 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white hover:bg-primary/80" disabled={isAiThinking || !chatInput.trim() || isExtracting} aria-label="Send message">
                                    <Send className="w-5 h-5" />
                                </Button>
                            </form>
                        </div>
                    </div>
                </motion.aside>
              )}
            </AnimatePresence>
        </div>
        <AlertDialog open={showConfirmNewChat} onOpenChange={setShowConfirmNewChat}>
            <AlertDialogContent className="sm:max-w-[425px] p-0 border-slate-700 rounded-2xl bg-gradient-to-b from-slate-800/80 to-slate-900/70 backdrop-blur-lg shadow-lg shadow-blue-500/10 text-white">
              <AlertDialogHeader2 className="p-6 pb-0">
                <AlertDialogTitle2>Start New Chat?</AlertDialogTitle2>
                <AlertDialogDesc>
                  Are you sure you want to start a new chat? Your current conversation history will be cleared.
                </AlertDialogDesc>
              </AlertDialogHeader2>
              <AlertDialogFooter className="p-6 pt-4">
                <AlertDialogCancel asChild><Button variant="ghost">Cancel</Button></AlertDialogCancel>
                <AlertDialogAction asChild><Button variant="destructive" onClick={startNewChat}>New Chat</Button></AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
