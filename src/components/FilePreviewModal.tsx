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
import { contentService } from '@/lib/contentService';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { X, Download, Send, RefreshCw, Copy, Check, ExternalLink, File as FileIcon, FileText, FileImage, FileVideo, Music, FileSpreadsheet, Presentation, FileCode, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { chatAboutDocument, type ChatInput } from '@/ai/flows/chat-flow';
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
import { Skeleton } from './ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { AiAssistantIcon } from './icons/AiAssistantIcon';
import type { PDFDocumentProxy } from 'pdfjs-dist';


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
             <button
                onClick={() => onCopy(msg.text, messageId)}
                className="absolute top-0 right-0 p-1.5 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                title="Copy message"
                aria-label="Copy AI response to clipboard"
            >
                {copiedMessageId === messageId ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
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
                table: ({node, ...props}) => <table className="w-full my-4 border-collapse border border-slate-700" {...props} />,
                thead: ({node, ...props}) => <thead className="bg-slate-800" {...props} />,
                tbody: ({node, ...props}) => <tbody {...props} />,
                tr: ({node, ...props}) => <tr className="border-b border-slate-700" {...props} />,
                th: ({node, ...props}) => <th className="border-r border-slate-700 p-2 text-left text-white" {...props} />,
                td: ({node, ...props}) => <td className="border-r border-slate-700 p-2" {...props} />,
              }}
            >
                {msg.text}
            </ReactMarkdown>
           
        </div>
    );
});


export function FilePreviewModal({ item, onOpenChange }: { item: Content | null, onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  
  const [showChat, setShowChat] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatInput['chatHistory']>([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [documentText, setDocumentText] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);
  const [showConfirmNewChat, setShowConfirmNewChat] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();


  const chatContainerRef = useRef<HTMLDivElement>(null);


  const fileUrl = item?.metadata?.storagePath;
  const isLink = item?.type === 'LINK';
  const linkUrl = item?.metadata?.url;
  const openUrl = isLink ? linkUrl : fileUrl;

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

  const handlePdfLoadSuccess = useCallback(async (pdf: PDFDocumentProxy) => {
    if (documentText || isExtracting) return;

    setIsExtracting(true);
    try {
      const text = await contentService.extractTextFromPdf(pdf);
      setDocumentText(text);
    } catch (err: any) {
      console.error("Failed to extract PDF text:", err);
      setDocumentText(null); // Ensure it's null on failure
      toast({ 
        variant: 'destructive', 
        title: 'Text Extraction Failed', 
        description: err.message || 'Could not read document content for chat.' 
      });
    } finally {
      setIsExtracting(false);
    }
  }, [documentText, isExtracting, toast]);
  
  useEffect(() => {
    startNewChat();
    setDocumentText(null); 
    setShowChat(false); 
    setError(null);
    setLoading(false);
    setIsExtracting(false);
  }, [item, startNewChat]);

  useEffect(() => {
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

    if (!documentText) {
       toast({ variant: 'destructive', title: 'Document Content Unavailable', description: 'Cannot chat without document content. The content might still be loading or failed to load.' });
       return;
    }

    const newQuestion = chatInput;
    const currentChatHistory = [...chatHistory, { role: 'user' as const, text: newQuestion }];
    setChatHistory(currentChatHistory);
    setChatInput('');
    setIsAiThinking(true);
    
    try {
      const aiResponse = await chatAboutDocument({ 
        question: newQuestion, 
        documentContent: documentText,
        chatHistory: chatHistory // Send the history BEFORE the new question
      });
      setChatHistory(prev => [...prev, { role: 'model', text: aiResponse }]);
    } catch (error: any) {
        console.error("AI chat error:", error);
        setChatHistory(prev => [...prev, { role: 'model', text: error.message || 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
        setIsAiThinking(false);
    }
  }

  const isChatAvailable = item.metadata?.mime === 'application/pdf';
  
  const renderFilePreview = () => (
    <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 flex flex-col h-full bg-slate-900"
        style={{
            opacity: (isMobile && showChat) ? 0 : 1,
            pointerEvents: (isMobile && showChat) ? 'none' : 'auto'
        }}
    >
        <header className="flex h-16 shrink-0 items-center justify-between px-2 sm:px-4 bg-slate-950/70 border-b border-slate-800 z-10">
            <div className="flex items-center gap-2 overflow-hidden">
                <Button variant="ghost" size="icon" onClick={handleClose} className="text-slate-300 hover:text-white hover:bg-white/10 rounded-full flex-shrink-0 focus-visible:ring-0 focus-visible:ring-offset-0" aria-label="Close file preview">
                    <X className="w-6 h-6" />
                </Button>
                <div className="flex items-center gap-3 overflow-hidden">
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" color={color} />
                </div>
            </div>
            <div className='flex items-center gap-1 sm:gap-2'>
                {!isLink && (
                    <Button variant="ghost" size="icon" onClick={handleDownload} disabled={!fileUrl || loading} className="text-slate-300 hover:text-white hover:bg-white/10 rounded-full h-9 w-9" title="Download">
                        <Download className="w-5 h-5" />
                    </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => window.open(openUrl, '_blank')} disabled={!openUrl} className="text-slate-300 hover:text-white hover:bg-white/10 rounded-full h-9 w-9" title="Open in new tab">
                    <ExternalLink className="w-5 h-5" />
                </Button>
                {isChatAvailable && (
                <Button variant={'outline'} onClick={() => setShowChat(true)} className="rounded-full px-3 h-9 sm:h-auto sm:w-auto sm:px-4">
                    <Sparkles className="mr-0 sm:mr-2 h-4 w-4"/>
                    <span className="sm:hidden">Chat with AI</span>
                    <span className="hidden sm:inline">Chat</span>
                </Button>
                )}
            </div>
        </header>

        <main className="flex-1 overflow-auto flex items-center justify-center relative">
            {loading && <div className="text-white">Loading...</div>}
            {error && <div className="text-red-400">Error: {error}</div>}
            {!loading && !error && fileUrl && (
              <FilePreview 
                  url={fileUrl} 
                  mime={item.metadata?.mime ?? 'application/octet-stream'} 
                  itemName={item.name}
                  onPdfLoadSuccess={handlePdfLoadSuccess}
              />
            )}
            {!loading && !fileUrl && (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-300 bg-slate-800/50 rounded-lg p-8">
                <p className="text-xl mb-3">File content not available.</p>
                <p className="text-sm text-slate-400">The file could not be loaded. It might have been deleted or there was a network issue.</p>
            </div>
            )}
        </main>
    </motion.div>
  );

  const renderChatView = () => (
    <motion.div
        key="chat-panel"
        initial={{ y: isMobile ? '100%' : 0, x: isMobile ? 0 : '100%' }}
        animate={{ y: 0, x: 0 }}
        exit={{ y: isMobile ? '100%' : 0, x: isMobile ? 0 : '100%' }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="flex flex-col overflow-hidden bg-[#1A1A1A] h-full w-full absolute inset-0 z-20 md:w-[448px] md:h-auto md:relative md:border-l md:border-slate-800"
        aria-label="AI Chat Panel"
    >
        <header className="flex items-center justify-between whitespace-nowrap border-b border-white/10 px-4 py-3 shrink-0 h-16">
            <div className="flex items-center gap-2">
                <AiAssistantIcon className="h-6 w-6" />
                <h2 className="text-lg font-semibold text-white">AI Assistant</h2>
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
                
                {chatHistory.length === 0 && !isAiThinking && (
                    <div className="prose prose-sm max-w-full text-slate-200">
                        {isExtracting ? (
                            <div className="flex items-center gap-2">
                            <Skeleton className="h-5 w-5 rounded-full" />
                            <p>Analyzing document...</p>
                            </div>
                        ) : documentText ? (
                            <p>Hello! I am your AI assistant. Ask me anything about this document.</p>
                        ) : (
                            <p className="text-yellow-400">Document content is not available or could not be extracted. Chat is disabled.</p>
                        )}
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
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-[80%] rounded-lg" />
                            <Skeleton className="h-4 w-[95%] rounded-lg" />
                            <Skeleton className="h-4 w-[60%] rounded-lg" />
                        </div>
                    </div>
                )}
            </div>
            <div className="mt-8">
                 <form onSubmit={handleChatSubmit} className="relative">
                    <Input
                        className="w-full rounded-2xl border-none bg-[#343541] py-3 pl-4 pr-16 text-white placeholder-[#9A9A9A] h-14"
                        placeholder="Ask anything..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        disabled={isExtracting || isAiThinking || !documentText}
                    />
                    <Button type="submit" size="icon" className="absolute top-1/2 right-3 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-500" disabled={isAiThinking || !chatInput.trim() || isExtracting || !documentText} aria-label="Send message">
                        <Send className="w-5 h-5" />
                    </Button>
                </form>
            </div>
        </div>
    </motion.div>
  );


  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent 
        className="max-w-none w-screen h-[100dvh] p-0 flex flex-col bg-transparent border-0"
        hideCloseButton={true}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>File Preview: {item.name}</DialogTitle>
          <DialogDescription>
            Previewing file {item.name}. You can download, share, or chat with the document if supported.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 h-full w-full relative overflow-hidden">
            <AnimatePresence>
                {renderFilePreview()}
                {showChat && renderChatView()}
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
