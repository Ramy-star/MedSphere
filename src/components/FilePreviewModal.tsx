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
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { X, Download, Send, RefreshCw, Copy, Check, ExternalLink, File as FileIcon, FileText, FileImage, FileVideo, Music, FileSpreadsheet, Presentation, FileCode, Sparkles, Minus, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
import { Textarea } from '@/components/ui/textarea';
import { Link2Icon } from './icons/Link2Icon';
import { Skeleton } from './ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { AiAssistantIcon } from './icons/AiAssistantIcon';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { cn } from '@/lib/utils';
import { useMobileViewStore } from '@/hooks/use-mobile-view-store';


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
                <div className="rounded-2xl bg-blue-900/80 px-4 py-2.5 max-w-[90%] sm:max-w-sm">
                    <p className="text-sm text-slate-200 whitespace-pre-wrap break-words">{msg.text}</p>
                </div>
            </div>
        );
    }

    return (
        <div className={cn("prose prose-sm md:prose-base max-w-full text-slate-200 relative group")}>
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
                h2: ({node, ...props}) => <h2 className="text-white mt-6 mb-3 text-lg md:text-xl" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-white mt-4 mb-2 text-base md:text-lg" {...props} />,
                h4: ({node, ...props}) => <h4 className="text-white mt-3 mb-1 text-base" {...props} />,
                p: ({node, ...props}) => <p className="text-slate-200 my-4 text-sm md:text-base" {...props} />,
                strong: ({node, ...props}) => <strong className="text-white" {...props} />,
                ul: ({node, ...props}) => <ul className="text-slate-200 my-4 ml-4 list-disc text-sm md:text-base" {...props} />,
                ol: ({node, ...props}) => <ol className="text-slate-200 my-4 ml-4 list-decimal text-sm md:text-base" {...props} />,
                li: ({node, ...props}) => <li className="text-slate-200 mb-2 text-sm md:text-base" {...props} />,
                code: ({node, ...props}) => <code className="text-white bg-black/50 rounded-sm px-1 py-0.5 text-sm md:text-base" {...props} />,
                pre: ({node, ...props}) => <pre className="bg-black/50 p-2 rounded-md" {...props} />,
                hr: ({node, ...props}) => <hr className="border-slate-700 my-6" {...props} />,
                table: ({node, ...props}) => <table className="w-full my-4 border-collapse border border-slate-700 rounded-lg overflow-hidden" {...props} />,
                thead: ({node, ...props}) => <thead className="bg-slate-800/50" {...props} />,
                tbody: ({node, ...props}) => <tbody {...props} />,
                tr: ({node, ...props}) => <tr className="border-b border-slate-700 last:border-b-0" {...props} />,
                th: ({node, ...props}) => <th className="border-r border-slate-700 p-2 text-left text-white font-semibold last:border-r-0 text-sm md:text-base" {...props} />,
                td: ({node, ...props}) => <td className="border-r border-slate-700 p-2 align-top last:border-r-0 text-sm md:text-base" {...props} />,
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
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [documentText, setDocumentText] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);
  const [showConfirmNewChat, setShowConfirmNewChat] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHoveringPreview, setIsHoveringPreview] = useState(false);
  const isMobile = useIsMobile();
  const { setHeaderFixed, chatInputOffset, setChatInputOffset } = useMobileViewStore();

  // PDF specific state
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfScale, setPdfScale] = useState(1);
  const [isPdfControlsVisible, setIsPdfControlsVisible] = useState(false);

  // Refs
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
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
    setNumPages(pdf.numPages);
    if (isMobile) {
        if (previewContainerRef.current) {
            const page = await pdf.getPage(1);
            const containerWidth = previewContainerRef.current.clientWidth - 32; // with padding
            const scale = containerWidth / page.getViewport({ scale: 1 }).width;
            setPdfScale(scale);
        }
    } else {
        setPdfScale(1); // Default 100% zoom for desktop
    }
    
    if (documentText || isExtracting) return;

    setIsExtracting(true);
    try {
      const text = await contentService.extractTextFromPdf(pdf);
      setDocumentText(text);
    } catch (err: any) {
      console.error("Failed to extract PDF text:", err);
      setDocumentText(null);
      toast({ 
        variant: 'destructive', 
        title: 'Text Extraction Failed', 
        description: err.message || 'Could not read document content for chat.' 
      });
    } finally {
      setIsExtracting(false);
    }
  }, [isMobile, documentText, isExtracting, toast]);
  
  useEffect(() => {
    startNewChat();
    setDocumentText(null); 
    setShowChat(false); 
    setError(null);
    setLoading(false);
    setIsExtracting(false);
    // Reset PDF state
    setNumPages(undefined);
    setPageNumber(1);
    setPdfScale(1);
  }, [item, startNewChat]);

  useEffect(() => {
    if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, isAiThinking]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [chatInput]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || !isMobile) return;

    let onVVResize = () => {};

    const handleFocus = () => {
      setHeaderFixed(true);
      onVVResize = () => {
        if (window.visualViewport) {
          const keyboardHeight = window.innerHeight - window.visualViewport.height;
          setChatInputOffset(keyboardHeight);
        }
      };

      if ('visualViewport' in window && window.visualViewport) {
        window.visualViewport.addEventListener('resize', onVVResize);
      }
    };

    const handleBlur = () => {
      setHeaderFixed(false);
      setChatInputOffset(0);
       if ('visualViewport' in window && window.visualViewport) {
        window.visualViewport.removeEventListener('resize', onVVResize);
      }
    };
    
    textarea.addEventListener('focus', handleFocus);
    textarea.addEventListener('blur', handleBlur);

    return () => {
      textarea.removeEventListener('focus', handleFocus);
      textarea.removeEventListener('blur', handleBlur);
      handleBlur();
    }
  }, [isMobile, setHeaderFixed, setChatInputOffset]);


  useEffect(() => {
    setIsPdfControlsVisible(isHoveringPreview || isMobile);
  }, [isHoveringPreview, isMobile]);

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
        setTimeout(() => setCopiedMessage(null), 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
        toast({
            variant: "destructive",
            title: "Failed to Copy",
            description: "Could not copy the message."
        })
    });
  }


  const handleClose = () => {
    setShowChat(false);
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
        const responseText = await chatAboutDocument({
            question: newQuestion,
            documentContent: documentText,
            chatHistory: chatHistory,
        });
        setChatHistory(prev => [...prev, { role: 'model' as const, text: responseText }]);
    } catch (error) {
        console.error("Error calling chat flow:", error);
        toast({
            variant: "destructive",
            title: "AI Chat Error",
            description: "The AI assistant could not be reached. Please try again later."
        });
        setChatHistory(prev => prev.slice(0, -1));
    } finally {
        setIsAiThinking(false);
    }
  }


  const isChatAvailable = item.metadata?.mime === 'application/pdf';
  const isPdf = item.metadata?.mime === 'application/pdf';

  const renderPdfControls = () => {
    const MAX_ZOOM = 5;
    const MIN_ZOOM = 0.1;
    const ZOOM_STEP = 0.05;
    
    const goToPage = (page: number) => {
        setPageNumber(Math.max(1, Math.min(page, numPages || 1)));
    }
    
    const zoomIn = () => setPdfScale(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
    const zoomOut = () => setPdfScale(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
  
    return (
        <AnimatePresence>
            {isPdf && numPages && isPdfControlsVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="flex items-center gap-0 md:gap-1 bg-black/60 text-white rounded-full p-1 shadow-lg backdrop-blur-md border border-white/20"
                >
                    <Button variant="ghost" size="icon" className="rounded-full w-8 h-8" onClick={() => goToPage(pageNumber - 1)} disabled={pageNumber <= 1}>
                        <ChevronLeft className="w-4 h-4" />
                        <span className="sr-only">Previous Page</span>
                    </Button>
                    <span className="text-xs px-2 tabular-nums whitespace-nowrap">{pageNumber} / {numPages ?? '--'}</span>
                    <Button variant="ghost" size="icon" className="rounded-full w-8 h-8" onClick={() => goToPage(pageNumber + 1)} disabled={pageNumber >= (numPages || 0)}>
                        <ChevronRight className="w-4 h-4" />
                        <span className="sr-only">Next Page</span>
                    </Button>
                    <div className="h-4 md:h-5 w-px bg-white/20 mx-1"></div>
                    <Button variant="ghost" size="icon" className="rounded-full w-8 h-8" onClick={zoomOut} disabled={pdfScale <= MIN_ZOOM}>
                        <Minus className="w-4 h-4" />
                    </Button>
                    <span className='text-xs w-12 text-center font-mono'>
                        {`${Math.round(pdfScale * 100)}%`}
                    </span>
                    <Button variant="ghost" size="icon" className="rounded-full w-8 h-8" onClick={zoomIn} disabled={pdfScale >= MAX_ZOOM}>
                        <Plus className="w-4 h-4" />
                    </Button>
                </motion.div>
            )}
        </AnimatePresence>
    );
  };
  
  const renderFilePreview = () => (
    <motion.div 
        layout
        ref={previewContainerRef}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        onMouseEnter={() => setIsHoveringPreview(true)}
        onMouseLeave={() => setIsHoveringPreview(false)}
        className="relative flex-1 flex flex-col h-full bg-slate-900 overflow-hidden"
    >
        <header className="flex h-16 shrink-0 items-center justify-between px-2 sm:px-4 bg-slate-950/70 border-b border-slate-800 z-10">
            <div className="flex items-center gap-2 overflow-hidden">
                <Button variant="ghost" size="icon" onClick={handleClose} className="text-slate-300 hover:text-white hover:bg-white/10 rounded-full flex-shrink-0 focus-visible:ring-0 focus-visible:ring-offset-0" aria-label="Close file preview">
                    <X className="w-6 h-6" />
                </Button>
                <div className="flex items-center gap-3 overflow-hidden">
                    <Icon className={cn("w-6 h-6 shrink-0", color)} />
                    <div className='flex items-center gap-2'>
                       <span className="hidden md:inline text-sm md:text-base text-white font-medium truncate">{item.name}</span>
                    </div>
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
                <Button 
                    variant={showChat ? 'default' : 'outline'} 
                    onClick={() => setShowChat(!showChat)} 
                    className={cn(
                        "rounded-full px-3 h-9 sm:px-4",
                        showChat && "bg-primary hover:bg-primary/90",
                        !showChat && "bg-background/50 border-white/20 text-white"
                    )}
                >
                    <Sparkles className="mr-0 sm:mr-2 h-4 w-4"/>
                    <span className="sm:inline">
                      Chat with AI
                    </span>
                </Button>
                )}
            </div>
        </header>

        <main className="grid flex-1 overflow-hidden grid-rows-1 grid-cols-1">
            <div className="[grid-area:1/1] overflow-auto flex items-center justify-center">
              {loading && <div className="text-white">Loading...</div>}
              {error && <div className="text-red-400">Error: {error}</div>}
              {!loading && !error && fileUrl && (
                <FilePreview 
                    url={fileUrl} 
                    mime={item.metadata?.mime ?? 'application/octet-stream'} 
                    itemName={item.name}
                    onPdfLoadSuccess={handlePdfLoadSuccess}
                    pdfScale={pdfScale}
                    pageNumber={pageNumber}
                />
              )}
              {!loading && !fileUrl && (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-300 bg-slate-800/50 rounded-lg p-8">
                  <p className="text-xl mb-3">File content not available.</p>
                  <p className="text-sm text-slate-400">The file could not be loaded. It might have been deleted or there was a network issue.</p>
              </div>
              )}
            </div>
            <div className="[grid-area:1/1] place-self-end justify-self-center z-20 mb-4">
                {renderPdfControls()}
            </div>
        </main>
    </motion.div>
  );

  const renderChatView = () => {

    const chatViewContent = (
      <>
        <header className={cn("flex items-center justify-between whitespace-nowrap px-4 py-3 shrink-0 h-16")}>
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
        <div 
            ref={chatContainerRef} 
            className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6"
        >
                
                {chatHistory.length === 0 && !isAiThinking && (
                    <div className="prose prose-sm md:prose-base max-w-full text-slate-200">
                        {isExtracting ? (
                            <div className="flex items-center gap-2">
                            <Skeleton className="h-5 w-5 rounded-full" />
                            <p>Analyzing document...</p>
                            </div>
                        ) : documentText ? (
                            <p className="text-sm md:text-base">Hello! I am your AI assistant. Ask me anything about this document.</p>
                        ) : (
                            <p className="text-yellow-400 text-sm md:text-base">Document content is not available or could not be extracted. Chat is disabled.</p>
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
        <div 
            className={cn(
              "mt-auto bg-[#1A1A1A] p-2 border-t border-white/10",
              isMobile && "fixed bottom-0 left-0 right-0 z-50",
              "transition-all duration-200"
            )}
             style={{ paddingBottom: isMobile ? `${chatInputOffset}px` : undefined }}
        >
                <form onSubmit={handleChatSubmit} className="relative flex items-end gap-2">
                <Textarea
                    ref={textareaRef}
                    className="w-full rounded-2xl border-none bg-[#343541] py-3 pl-4 pr-12 text-white placeholder-[#9A9A9A] h-auto min-h-[52px] resize-none overflow-y-hidden focus-visible:ring-0"
                    placeholder="Ask anything..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                     onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.shiftKey) {
                            
                        } else if (e.key === 'Enter') {
                            e.preventDefault();
                            handleChatSubmit();
                        }
                    }}
                    disabled={isExtracting || isAiThinking || !documentText}
                    rows={1}
                />
                <div className="absolute bottom-2 right-3 flex-shrink-0">
                    <Button type="submit" size="icon" className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-500" disabled={isAiThinking || !chatInput.trim() || isExtracting || !documentText} aria-label="Send message">
                        <Send className="w-5 h-5" />
                    </Button>
                </div>
            </form>
        </div>
      </>
    );
    
    if (isMobile) {
        return (
             <AnimatePresence>
                {showChat && (
                    <motion.div
                        key="chat-panel-mobile"
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="flex flex-col overflow-hidden bg-[#1A1A1A] h-full w-full absolute inset-0 z-20"
                    >
                        {chatViewContent}
                    </motion.div>
                )}
            </AnimatePresence>
        );
    }

    return (
        <AnimatePresence initial={false}>
            {showChat && (
                 <motion.div
                    key="chat-panel-desktop"
                    layout
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 448, opacity: 1 }}
                    exit={{ width: 0, opacity: 0, transition: { duration: 0.2, ease: 'easeOut' } }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    className="flex-shrink-0 flex flex-col overflow-hidden bg-[#1A1A1A] h-full"
                    aria-label="AI Chat Panel"
                >
                    {chatViewContent}
                </motion.div>
            )}
        </AnimatePresence>
    );
  };


  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent 
        className="max-w-none w-screen h-[100dvh] p-0 flex flex-row bg-slate-900/80 backdrop-blur-sm border-0 gap-0"
        hideCloseButton={true}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>File Preview: {item.name}</DialogTitle>
          <DialogDescription>
            Previewing file {item.name}. You can download, share, or chat with the document if supported.
          </DialogDescription>
        </DialogHeader>
        
        {renderFilePreview()}
        {renderChatView()}
       
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
