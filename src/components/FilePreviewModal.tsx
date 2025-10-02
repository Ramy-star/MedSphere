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
import { X, Download, Sparkles, Send, RefreshCw, Copy, Check, ExternalLink, File as FileIcon, FileText, FileImage, FileVideo, Music, FileSpreadsheet, Presentation, FileCode } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase/auth/use-user';
import { AnimatePresence, motion } from 'framer-motion';
import { chatAboutDocument } from '@/ai/flows/chat-flow';
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
import { Input } from './ui/input';
import { Link2Icon } from './icons/Link2Icon';
import { AiAssistantIcon } from './icons/AiAssistantIcon';
import { Skeleton } from './ui/skeleton';


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

const getIconForFileType = (item: Content): { Icon: LucideIcon, color: string } => {
    if (item.type === 'LINK') {
        return { Icon: Link2Icon, color: 'text-cyan-400' };
    }

    const fileName = item.name;
    const mimeType = item.metadata?.mime;
    const extension = fileName.split('.').pop()?.toLowerCase();

    if (mimeType?.startsWith('image/')) return { Icon: FileImage, color: 'text-purple-400' };
    if (mimeType?.startsWith('video/')) return { Icon: FileVideo, color: 'text-red-400' };
    if (mimeType?.startsWith('audio/')) return { Icon: Music, color: 'text-orange-400' };
    
    switch (extension) {
        case 'pdf':
            return { Icon: FileText, color: 'text-red-400' };
        case 'docx':
        case 'doc':
            return { Icon: FileText, color: 'text-blue-500' };
        case 'xlsx':
        case 'xls':
            return { Icon: FileSpreadsheet, color: 'text-green-500' };
        case 'pptx':
        case 'ppt':
            return { Icon: Presentation, color: 'text-orange-500' };
        case 'html':
        case 'js':
        case 'css':
        case 'tsx':
        case 'ts':
            return { Icon: FileCode, color: 'text-gray-400' };
        case 'txt':
             return { Icon: FileText, color: 'text-gray-400' };
        case 'mp3':
        case 'wav':
             return { Icon: Music, color: 'text-orange-400' };
        case 'mp4':
        case 'mov':
             return { Icon: FileVideo, color: 'text-red-400' };
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'gif':
        case 'svg':
             return { Icon: FileImage, color: 'text-purple-400' };
        default:
            return { Icon: FileIcon, color: 'text-gray-400' };
    }
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
                h2: ({node, ...props}) => <h2 className="text-white mt-6 mb-3" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-white mt-4 mb-2" {...props} />,
                h4: ({node, ...props}) => <h4 className="text-white mt-3 mb-1" {...props} />,
                p: ({node, ...props}) => <p className="text-slate-200 my-4" {...props} />,
                strong: ({node, ...props}) => <strong className="text-white" {...props} />,
                ul: ({node, ...props}) => <ul className="text-slate-200 my-4 ml-4 list-disc" {...props} />,
                ol: ({node, ...props}) => <ol className="text-slate-200 my-4 ml-4 list-decimal" {...props} />,
                li: ({node, ...props}) => <li className="text-slate-200 mb-2" {...props} />,
                code: ({node, ...props}) => <code className="text-white bg-black/50 rounded-sm px-1 py-0.5" {...props} />,
                pre: ({node, ...props}) => <pre className="bg-black/50 p-2 rounded-md" {...props} />,
                hr: ({node, ...props}) => <hr className="border-slate-700 my-6" {...props} />,
                 table: ({node, ...props}) => <table className="w-full border-collapse border border-slate-700 my-4" {...props} />,
                thead: ({node, ...props}) => <thead className="bg-slate-800" {...props} />,
                tbody: ({node, ...props}) => <tbody {...props} />,
                tr: ({node, ...props}) => <tr className="border-b border-slate-700" {...props} />,
                th: ({node, ...props}) => <th className="p-2 border-r border-slate-700 text-left text-white" {...props} />,
                td: ({node, ...props}) => <td className="p-2 border-r border-slate-700" {...props} />,
              }}
            >
                {msg.text}
            </ReactMarkdown>
            <div className="text-right mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => onCopy(msg.text, messageId)}
                    className="p-1.5 bg-slate-700/50 rounded-full text-slate-300 hover:bg-slate-700 hover:text-white"
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
  const isLink = item?.type === 'LINK';
  const linkUrl = item?.metadata?.url;
  const openUrl = isLink ? linkUrl : fileUrl;

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
  
  const { Icon, color } = getIconForFileType(item);


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
      const aiResponse = await chatAboutDocument({ question: newQuestion, documentContent: currentDocText });
      setChatHistory(prev => [...prev, { role: 'model', text: aiResponse }]);
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
        className="max-w-none w-screen h-screen p-0 flex flex-col bg-transparent border-0"
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
                <div className="flex items-center gap-4 overflow-hidden">
                    <Button variant="ghost" size="icon" onClick={handleClose} className="text-slate-300 hover:text-white hover:bg-white/10 flex-shrink-0" aria-label="Close file preview">
                        <X className="w-6 h-6" />
                    </Button>
                    <div className="flex items-center gap-3 overflow-hidden">
                       <Icon className={`w-6 h-6 ${color} shrink-0`} />
                       <span className="text-white font-medium truncate">{item.name}</span>
                    </div>
                </div>
                <div className='flex items-center gap-2'>
                    {!isLink && (
                        <Button variant="ghost" size="icon" onClick={handleDownload} disabled={!fileUrl || loading} className="text-slate-300 hover:text-white hover:bg-white/10" title="Download">
                            <Download className="w-5 h-5" />
                        </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => window.open(openUrl, '_blank')} disabled={!openUrl} className="text-slate-300 hover:text-white hover:bg-white/10" title="Open in new tab">
                        <ExternalLink className="w-5 h-5" />
                    </Button>
                    {isChatAvailable && (
                    <Button variant={showChat ? 'default' : 'outline'} onClick={() => setShowChat(!showChat)} className="rounded-full">
                        <Sparkles className="mr-2 h-4 w-4"/>
                        Chat with AI
                    </Button>
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
                    className="flex flex-col overflow-hidden h-full"
                    style={{ backgroundColor: '#1A1A1A' }}
                    aria-label="AI Chat Panel"
                >
                     <header className="flex items-center justify-between whitespace-nowrap border-b border-white/10 px-4 py-3 shrink-0">
                        <div className="flex items-center gap-3 text-white">
                            <AiAssistantIcon className="w-5 h-5" />
                            <h2 className="text-lg font-bold">AI Assistant</h2>
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

                            {isAiThinking && !isExtracting && (
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-[80%] rounded-lg" />
                                    <Skeleton className="h-4 w-[95%] rounded-lg" />
                                    <Skeleton className="h-4 w-[60%] rounded-lg" />
                                </div>
                            )}
                        </div>
                        <div className="mt-8">
                            <form onSubmit={handleChatSubmit} className="relative">
                                <Input 
                                    className="w-full rounded-full border-none bg-[#343541] py-4 pl-6 pr-16 text-white placeholder-[#9A9A9A] 
                                    focus:outline-none focus-visible:outline-none focus:ring-0 focus:ring-offset-0 !ring-0 !shadow-none h-14 text-base"
                                    
                                    placeholder="Ask anything"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    disabled={isExtracting || isAiThinking}
                                />
                                <Button type="submit" size="icon" className="absolute top-1/2 right-3 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-500" disabled={isAiThinking || !chatInput.trim() || isExtracting} aria-label="Send message">
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
