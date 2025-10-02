'use client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import FilePreview from './FilePreview';
import type { Content } from '@/lib/contentService';
import { useEffect, useState, useRef, useCallback } from 'react';
import { X, Download, Share2, File as FileIcon, ExternalLink, Sparkles, Send, RefreshCw, Bot, User, Copy, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase/auth/use-user';
import { AnimatePresence, motion } from 'framer-motion';
import { chatAboutDocument } from '@/ai/flows/chat-flow';
import { Skeleton } from './ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';


// Define a type for the ref to hold the text extraction function
type PdfViewerRef = {
  extractText: () => Promise<string>;
};

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


  const chatContainerRef = useRef<HTMLDivElement>(null);


  const fileUrl = item?.metadata?.storagePath;
  const loading = false; 

  const handleNewChat = useCallback(() => {
    setChatHistory([]);
    setDocumentText(null); // Allow re-extraction if needed
    setIsAiThinking(false);
  }, []);

  useEffect(() => {
    // Reset state when a new item is opened
    handleNewChat();
    // Do not close chat when item changes, user might want to keep it open
  }, [item, handleNewChat]);

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
        const res = await fetch(fileUrl);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = item.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(blobUrl);
    } catch (error) {
        console.error("Download failed:", error);
        toast({
            variant: "destructive",
            title: "Download Failed",
            description: "Could not download the file.",
        });
        window.open(fileUrl, '_blank');
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
    if (!chatInput.trim()) return;

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
      }
      setIsExtracting(false);
    }
    
    if (!currentDocText) {
       toast({ variant: 'destructive', title: 'Document Content Unavailable', description: 'Cannot chat without document content.' });
       return;
    }


    const newQuestion = chatInput;
    setChatHistory(prev => [...prev, { role: 'user', text: newQuestion }]);
    setChatInput('');
    setIsAiThinking(true);

    try {
        const answer = await chatAboutDocument({ question: newQuestion, documentContent: currentDocText });
        setChatHistory(prev => [...prev, { role: 'model', text: answer }]);
    } catch (error) {
        console.error("AI chat error:", error);
        setChatHistory(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
        setIsAiThinking(false);
    }
  }

  const isChatAvailable = item.metadata?.mime === 'application/pdf';


  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent 
        className="max-w-none w-screen h-screen rounded-none p-0 flex flex-col bg-slate-900/80 backdrop-blur-sm border-0"
        hideCloseButton={true}
      >
        <DialogTitle className="sr-only">File Preview: {item.name}</DialogTitle>
        <div className="flex flex-1 overflow-hidden h-full">

            {/* File Preview */}
            <div className="flex-1 flex flex-col h-full">
                <header className="flex h-16 shrink-0 items-center justify-between px-4 bg-slate-950/70 border-b border-slate-800 z-10">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={handleClose} className="text-slate-300 hover:text-white hover:bg-white/10">
                        <X className="w-6 h-6" />
                    </Button>
                    <div className='flex items-center gap-3'>
                        <FileIcon className='w-5 h-5 text-slate-400' />
                        <span className="font-medium text-white truncate">{item.name}</span>
                    </div>
                </div>
                <div className='flex items-center gap-2'>
                    {isChatAvailable && (
                    <Button variant={showChat ? 'default' : 'outline'} onClick={() => setShowChat(!showChat)} className="rounded-full">
                        <Sparkles className="mr-2 h-4 w-4"/>
                        Chat with AI
                    </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={handleDownload} disabled={!fileUrl} className="text-slate-300 hover:text-white hover:bg-white/10" title="Download">
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
                                    <Button size="sm" className="px-3" onClick={handleCopyLink}>
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
                    {!loading && fileUrl && <FilePreview url={fileUrl} mime={item.metadata?.mime ?? 'application/octet-stream'} itemName={item.name} pdfViewerRef={pdfViewerRef} />}
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
                >
                     <header className="flex items-center justify-between whitespace-nowrap border-b border-white/10 px-4 py-3 shrink-0">
                        <div className="flex items-center gap-3 text-white">
                            <Sparkles className="w-5 h-5 text-blue-400" />
                            <h2 className="text-lg font-bold">AI Study Assistant</h2>
                        </div>
                        <div className="flex items-center">
                            <Button variant="ghost" size="icon" onClick={handleNewChat} className="text-slate-300 hover:bg-white/10 rounded-full w-8 h-8" title="Start New Chat">
                                <RefreshCw className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setShowChat(false)} className="text-slate-300 hover:bg-white/10 rounded-full w-8 h-8" title="Close Chat">
                                <X className="w-5 h-5" />
                            </Button>
                        </div>
                    </header>
                    <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-hidden">
                        <div ref={chatContainerRef} className="flex-1 space-y-6 overflow-y-auto pr-4 -mr-4">
                            {isExtracting && (
                                <div className="flex justify-center items-center text-slate-400 text-sm p-4">
                                    <p>Analyzing PDF for chat...</p>
                                </div>
                            )}
                            
                            {chatHistory.length === 0 && !isAiThinking && !isExtracting && (
                                <div className="prose prose-sm max-w-full text-slate-200">
                                    <p>Hello! I am your AI assistant. Ask me anything about this document.</p>
                                </div>
                            )}

                            {chatHistory.map((msg, index) => {
                                const messageId = `msg-${index}`;
                                if (msg.role === 'user') {
                                    return (
                                        <div key={messageId} className="flex justify-end">
                                            <div className="rounded-full bg-blue-900/80 px-4 py-2 inline-block">
                                                <p className="text-slate-200">{msg.text}</p>
                                            </div>
                                        </div>
                                    )
                                }
                                return (
                                    <div key={messageId} className="prose prose-sm max-w-full text-slate-200 relative">
                                        <ReactMarkdown
                                          components={{
                                            h2: ({node, ...props}) => <h2 className="text-white" {...props} />,
                                            h3: ({node, ...props}) => <h3 className="text-white" {...props} />,
                                            p: ({node, ...props}) => <p className="text-slate-200" {...props} />,
                                            strong: ({node, ...props}) => <strong className="text-white" {...props} />,
                                            ul: ({node, ...props}) => <ul className="text-slate-200" {...props} />,
                                            ol: ({node, ...props}) => <ol className="text-slate-200" {...props} />,
                                            li: ({node, ...props}) => <li className="text-slate-200" {...props} />,
                                            code: ({node, ...props}) => <code className="text-white bg-black/50 rounded-sm px-1" {...props} />,
                                            pre: ({node, ...props}) => <pre className="bg-black/50 p-2 rounded-md" {...props} />,
                                          }}
                                        >
                                            {msg.text}
                                        </ReactMarkdown>
                                        <div className="text-right mt-2">
                                            <button 
                                                onClick={() => handleCopyToClipboard(msg.text, messageId)}
                                                className="p-1.5 bg-slate-700/50 rounded-full text-slate-300 hover:bg-slate-700 hover:text-white transition-opacity"
                                                title="Copy message"
                                            >
                                                {copiedMessage === messageId ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}

                            {isAiThinking && (
                                <div className="w-full">
                                    <div className="space-y-2">
                                        <Skeleton className="h-3 w-4/5" />
                                        <Skeleton className="h-3 w-full" />
                                        <Skeleton className="h-3 w-3/4" />
                                    </div>
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
                                <Button type="submit" size="icon" className="absolute top-1/2 right-3 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white hover:bg-primary/80" disabled={isAiThinking || !chatInput.trim() || isExtracting}>
                                    <Send className="w-5 h-5" />
                                </Button>
                            </form>
                        </div>
                    </div>
                </motion.aside>
              )}
            </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
