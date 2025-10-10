'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import FilePreview, { FilePreviewRef } from './FilePreview';
import type { Content } from '@/lib/contentService';
import { contentService } from '@/lib/contentService';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { X, Download, RefreshCw, Copy, Check, ExternalLink, File as FileIcon, FileText, FileImage, FileVideo, Music, FileSpreadsheet, Presentation, Sparkles, Minus, Plus, ChevronLeft, ChevronRight, FileCode, Square, Loader2, MessageCirclePlus, CornerDownLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { chatAboutDocument } from '@/ai/flows/chat-flow';
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
import { Textarea } from './ui/textarea';
import { Link2Icon } from './icons/Link2Icon';
import { Skeleton } from './ui/skeleton';
import { useMobileViewStore } from '@/hooks/use-mobile-view-store';
import { AiAssistantIcon } from './icons/AiAssistantIcon';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Input } from './ui/input';
import SendStopButton from './SendStopButton';
import { toSanitizedHtml } from '@/lib/chat-formatter/chat-formatter.js';
import '@/lib/chat-formatter/chat-formatter.css';

type PdfControlsProps = {
    isMobile: boolean,
    numPages: number | undefined,
    pageNumber: number,
    pdfScale: number,
    goToPage: (page: number) => void,
    zoomIn: () => void,
    zoomOut: () => void,
    pageInput: string,
    setPageInput: (value: string) => void,
    handlePageInputSubmit: (e: React.FormEvent) => void,
    handlePageInputBlur: (e: React.FocusEvent) => void,
    scaleInput: string,
    handleScaleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    handleScaleInputSubmit: (e: React.FormEvent) => void,
    handleScaleInputBlur: (e: React.FocusEvent) => void,
    pageInputRef: React.RefObject<HTMLInputElement>,
};


const PdfControls = ({
    isMobile,
    numPages,
    pageNumber,
    pdfScale,
    goToPage,
    zoomIn,
    zoomOut,
    pageInput,
    setPageInput,
    handlePageInputSubmit,
    handlePageInputBlur,
    scaleInput,
    handleScaleInputChange,
    handleScaleInputSubmit,
    handleScaleInputBlur,
    pageInputRef,
}: PdfControlsProps) => {
    const MAX_ZOOM = 5;
    const MIN_ZOOM = 0.1;

    useEffect(() => {
        setPageInput(String(pageNumber));
    }, [pageNumber, setPageInput]);

    if (!numPages) return null;

    if (isMobile) {
        return (
            <div className="flex items-center justify-center">
                <span className="text-xs px-2 tabular-nums whitespace-nowrap font-ubuntu text-white">
                    {pageNumber} / {numPages ?? '--'}
                </span>
            </div>
        );
    }

    // Desktop controls
    return (
      <div className="flex items-center gap-0 text-white">
        <form onSubmit={handlePageInputSubmit} className="flex items-center">
            <Input
              ref={pageInputRef}
              type="text"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={handlePageInputBlur}
              className="w-9 h-7 text-center bg-transparent border-0 font-ubuntu focus-visible:ring-1 focus-visible:ring-blue-500 p-0"
              onFocus={(e) => e.target.select()}
            />
            <span className="text-sm px-1 text-slate-400 font-ubuntu">/ {numPages ?? '--'}</span>
        </form>
        
        <div className="h-4 w-px bg-white/20 mx-1"></div>
        
        <Button variant="ghost" size="icon" className="rounded-full w-7 h-7 text-slate-300 hover:bg-white/20 hover:text-white" onClick={zoomOut} disabled={pdfScale <= MIN_ZOOM}>
            <Minus className="w-4 h-4" />
            <span className="sr-only">Zoom Out</span>
        </Button>
        
        <form onSubmit={handleScaleInputSubmit}>
            <Input
                type="text"
                value={scaleInput}
                onChange={handleScaleInputChange}
                onBlur={handleScaleInputBlur}
                className="w-16 h-7 text-center bg-transparent border-0 font-ubuntu focus-visible:ring-1 focus-visible:ring-blue-500"
                onFocus={(e) => e.target.select()}
            />
        </form>
        
        <Button variant="ghost" size="icon" className="rounded-full w-7 h-7 text-slate-300 hover:bg-white/20 hover:text-white" onClick={zoomIn} disabled={pdfScale >= MAX_ZOOM}>
            <Plus className="w-4 h-4" />
            <span className="sr-only">Zoom In</span>
        </Button>
    </div>
    );
};


type ChatMessageProps = {
    msg: { role: 'user' | 'model', text: string };
    onCopy: (text: string, id: string) => void;
    onRegenerate: () => void;
    isLastMessage: boolean;
    isAiThinking: boolean;
    copiedMessageId: string | null;
    messageId: string;
    fontSizeClass: string;
    isMobile: boolean;
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


const ChatMessage = React.memo(function ChatMessage({ msg, onCopy, onRegenerate, isLastMessage, isAiThinking, copiedMessageId, messageId, fontSizeClass, isMobile }: ChatMessageProps) {
    const [safeHtml, setSafeHtml] = useState('');

    useEffect(() => {
        if (msg.role === 'model') {
            try {
                setSafeHtml(toSanitizedHtml(msg.text));
            } catch (error) {
                console.error("Error formatting model output:", error);
                // Fallback to plain text if formatting fails
                const pre = document.createElement('pre');
                pre.textContent = msg.text;
                setSafeHtml(pre.outerHTML);
            }
        }
    }, [msg.text, msg.role]);
    
    if (msg.role === 'user') {
        return (
            <div className="flex justify-end">
                <div className={cn("rounded-3xl px-4 py-2.5 max-w-[90%]", fontSizeClass)} style={{backgroundColor: '#003f7a'}}>
                    <p className="text-white whitespace-pre-wrap break-words font-inter">{msg.text}</p>
                </div>
            </div>
        );
    }
    
    const showActions = isLastMessage && !isAiThinking;

    return (
        <div className="group/message">
            <div
                className={cn("prose prose-sm max-w-full preview", fontSizeClass)}
                dangerouslySetInnerHTML={{ __html: safeHtml }}
            />

            {showActions && (
                 <div className={cn("flex items-center gap-2 mt-4 transition-opacity", isMobile ? "opacity-100" : "opacity-0 group-hover/message:opacity-100")}>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCopy(msg.text, messageId)}
                        className="h-8 px-2 text-slate-400 hover:bg-slate-700 hover:text-white group/action"
                        aria-label="Copy AI response to clipboard"
                    >
                         {copiedMessageId === messageId ? <Check className="w-4 h-4 mr-0 sm:mr-1.5 transition-all" /> : <Copy className="w-4 h-4 mr-0 sm:mr-1.5 transition-all" />}
                        <span className="text-sm max-w-0 sm:max-w-xs overflow-hidden whitespace-nowrap transition-all group-hover/action:max-w-xs hidden sm:inline"></span>
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onRegenerate}
                        className="h-8 px-2 text-slate-400 hover:bg-slate-700 hover:text-white group/action"
                        aria-label="Regenerate response"
                    >
                        <RefreshCw className="w-4 h-4 mr-0 sm:mr-1.5 transition-all" />
                        <span className="text-sm max-w-0 sm:max-w-xs overflow-hidden whitespace-nowrap transition-all group-hover/action:max-w-xs hidden sm:inline"></span>
                    </Button>
                </div>
            )}
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
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showConfirmNewChat, setShowConfirmNewChat] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setHeaderFixed, chatInputOffset, setChatInputOffset } = useMobileViewStore();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pdfProxy, setPdfProxy] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfScale, setPdfScale] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [scaleInput, setScaleInput] = useState('100%');
  const fontSizes = ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl'];
  const [fontSizeIndex, setFontSizeIndex] = useState(1);
  const isMobile = useIsMobile();
  const pdfViewerRef = useRef<FilePreviewRef>(null);
  const pageInputRef = useRef<HTMLInputElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileContentRef = useRef<HTMLDivElement>(null);
  const scaleBeforeFullscreen = useRef<number>(1);
  const manualPageInputInProgress = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const ZOOM_STEP = 0.1;
  const MAX_ZOOM = 5;
  const MIN_ZOOM = 0.1;
  
  const startNewChat = useCallback(() => {
    setChatHistory([]);
    setIsAiThinking(false);
    setShowConfirmNewChat(false);
  }, []);

  const resetPdfState = useCallback(() => {
    setPdfProxy(null);
    setNumPages(undefined);
    setPageNumber(1);
    setPageInput('1');
    setPdfScale(1);
    setDocumentText(null);
    setIsExtracting(false);
    setShowChat(false);
    startNewChat();
  }, [startNewChat]);

  // All hooks should be called unconditionally at the top level.
  // We'll check for `item` later before rendering.
  useEffect(() => {
    if(item) {
        resetPdfState();
    }
  }, [item, resetPdfState]);
  
  const handleClose = () => {
    onOpenChange(false);
    setTimeout(resetPdfState, 300);
  };
  
  const goToPage = useCallback(async (page: number) => {
      const newPage = Math.max(1, Math.min(page, numPages || 1));
      setPageNumber(newPage);
      if (pdfViewerRef.current) {
          pdfViewerRef.current.scrollToPage(newPage);
      }
  }, [numPages]);

  const zoomIn = useCallback(() => setPdfScale(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM)), []);
  const zoomOut = useCallback(() => setPdfScale(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM)), []);
  
  const handlePageInputSubmit = useCallback((e: React.FormEvent) => {
      e.preventDefault();
      manualPageInputInProgress.current = false;
      const page = parseInt(pageInput, 10);
      if (!isNaN(page)) {
          goToPage(page);
      }
  }, [goToPage, pageInput]);

  const handlePageInputBlur = (e: React.FocusEvent) => {
      handlePageInputSubmit(e);
  };
  
  const handleScaleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setScaleInput(e.target.value);
  };

  const handleScaleInputSubmit = useCallback((e: React.FormEvent) => {
      e.preventDefault();
      const newScale = parseInt(scaleInput.replace('%', ''), 10);
      if (!isNaN(newScale)) {
          setPdfScale(Math.max(MIN_ZOOM, Math.min(newScale / 100, MAX_ZOOM)));
      }
  }, [scaleInput]);

  const handleScaleInputBlur = (e: React.FocusEvent) => {
      handleScaleInputSubmit(e);
  };

  const onPageChange = useCallback((newPage: number) => {
    setPageNumber(newPage);
  }, []);

  useEffect(() => {
      if (!manualPageInputInProgress.current) {
        setPageInput(String(pageNumber));
      }
  }, [pageNumber]);
  
  const handleNewChat = useCallback(() => {
    if (chatHistory.length > 0) {
        setShowConfirmNewChat(true);
    } else {
        startNewChat();
    }
  }, [chatHistory.length, startNewChat]);

  const submitChat = useCallback(async (question: string) => {
    if (!question.trim()) return;

    if (!documentText) {
       toast({ variant: 'destructive', title: 'Document Content Unavailable', description: 'Cannot chat without document content. The content might still be loading or failed to load.' });
       return;
    }

    setChatHistory(prev => [...prev, { role: 'user' as const, text: question }]);
    setChatInput('');
    setIsAiThinking(true);
    
    abortControllerRef.current = new AbortController();
    
    try {
        const response = await chatAboutDocument({
            question: question,
            documentContent: documentText,
            chatHistory: chatHistory,
        }, { signal: abortControllerRef.current.signal });
        
        setChatHistory(prev => [...prev, { role: 'model' as const, text: response }]);

    } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log("Chat request aborted.");
          setChatHistory(prev => prev.slice(0, -1)); // Remove the user's question as it was cancelled
          return; // Don't show an error toast
        }
        console.error("Error calling AI flow:", error);
        toast({
            variant: "destructive",
            title: "AI Assistant Error",
            description: "The AI assistant could not be reached. Please try again later."
        });
        setChatHistory(prev => prev.slice(0, -1)); // Remove the user's question if the call fails
    } finally {
        setIsAiThinking(false);
        abortControllerRef.current = null;
    }
  }, [documentText, chatHistory, toast]);

  const handlePdfLoadSuccess = useCallback(async (pdf: PDFDocumentProxy) => {
    setPdfProxy(pdf);
    setNumPages(pdf.numPages);
    
    if (isMobile) {
        if (previewContainerRef.current) {
            const page = await pdf.getPage(1);
            const containerWidth = previewContainerRef.current.clientWidth;
            const viewportWidth = page.getViewport({ scale: 1 }).width;
            setPdfScale(containerWidth / viewportWidth);
        }
    } else {
        setPdfScale(1);
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
    setScaleInput(`${Math.round(pdfScale * 100)}%`);
  }, [pdfScale]);

  useEffect(() => {
    if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, isAiThinking]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
        textarea.style.height = 'auto';
        const scrollHeight = textarea.scrollHeight;
        textarea.style.height = `${scrollHeight}px`;
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
        const handleFullscreenChange = async () => {
            const isNowFullscreen = !!document.fullscreenElement;
            setIsFullscreen(isNowFullscreen);

            if (isNowFullscreen) {
                if (fileContentRef.current && pdfProxy) {
                    scaleBeforeFullscreen.current = pdfScale;
                    const page = await pdfProxy.getPage(pageNumber);
                    const viewport = page.getViewport({ scale: 1 });
                    
                    const screenWidth = window.innerWidth;
                    const screenHeight = window.innerHeight;

                    const scaleX = screenWidth / viewport.width;
                    const scaleY = screenHeight / viewport.height;
                    
                    setPdfScale(Math.min(scaleX, scaleY));
                }
            } else {
                setPdfScale(scaleBeforeFullscreen.current);
            }
        };

        const onKeyDown = (e: KeyboardEvent) => {
            if (!document.fullscreenElement) return;
            e.preventDefault();
            const total = numPages || 0;

            if ((e.key === 'ArrowRight' || e.key === 'ArrowDown') && pageNumber < total) {
                goToPage(pageNumber + 1);
            } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowUp') && pageNumber > 1) {
                goToPage(pageNumber - 1);
            }
        };

        const onWheel = (e: WheelEvent) => {
            if (document.fullscreenElement) e.preventDefault();
        };

        const onTouchMove = (e: TouchEvent) => {
            if (document.fullscreenElement) e.preventDefault();
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        if (isFullscreen) {
            document.addEventListener('keydown', onKeyDown, true);
            document.addEventListener('wheel', onWheel, { capture: true, passive: false });
            document.addEventListener('touchmove', onTouchMove, { capture: true, passive: false });
        }

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('keydown', onKeyDown, true);
            document.removeEventListener('wheel', onWheel, { capture: true });
            document.removeEventListener('touchmove', onTouchMove, { capture: true });
        };
    }, [isFullscreen, numPages, pdfProxy, pdfScale, pageNumber, goToPage]);

  const handleChatSubmit = useCallback(async (e?: React.FormEvent<HTMLFormElement> | React.MouseEvent<Element, MouseEvent>) => {
      e?.preventDefault();
      if(isAiThinking) return;
      await submitChat(chatInput);
  }, [chatInput, submitChat, isAiThinking]);
  
  const handleRegenerate = useCallback(async () => {
    if (isAiThinking || chatHistory.length === 0) return;

    const lastUserMessage = [...chatHistory].reverse().find(m => m.role === 'user');
    if (!lastUserMessage) return;

    setChatHistory(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.role === 'model') {
            return prev.slice(0, -1);
        }
        return prev;
    });

    await submitChat(lastUserMessage.text);
  }, [isAiThinking, chatHistory, submitChat]);

  const handleStopAi = () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
  }

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
        // Move cursor after the inserted newline
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.selectionStart = selectionStart + 1;
                textareaRef.current.selectionEnd = selectionStart + 1;
                textareaRef.current.focus();
            }
        }, 0);
    }
  };

  // This is the correct place for the early return, after all hooks have been called.
  if (!item) {
    return null;
  }
  
  const { Icon, color } = getIconForFileType(item);
  const fileUrl = item?.metadata?.storagePath;
  const isLink = item?.type === 'LINK';
  const linkUrl = item?.metadata?.url;
  const openUrl = isLink ? linkUrl : fileUrl;
  const isPdf = item?.metadata?.mime === 'application/pdf';
  const isChatAvailable = item.metadata?.mime === 'application/pdf';
  
  const renderFilePreview = () => (
    <motion.div 
        layout
        ref={previewContainerRef}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className={cn("relative flex-1 flex flex-col bg-[#13161C] overflow-hidden")}
    >
        <header className="flex h-14 shrink-0 items-center justify-between px-2 sm:px-4 bg-[#2f3b47] backdrop-blur-sm border-b border-slate-800 z-10">
            {/* Left Section */}
             <div className="flex items-center gap-1 overflow-hidden flex-1">
                <div className="flex items-center gap-1 md:hidden">
                    <Button variant="ghost" size="icon" onClick={handleClose} className="text-slate-300 hover:text-white hover:bg-white/10 rounded-full h-9 w-9 flex-shrink-0 focus-visible:ring-0 focus-visible:ring-offset-0" aria-label="Close file preview">
                        <X className="w-5 h-5" />
                    </Button>
                    {!isLink && (
                        <Button variant="ghost" size="icon" onClick={handleDownload} disabled={!fileUrl || loading} className="text-slate-200 hover:text-white hover:bg-white/20 rounded-full h-9 w-9" title="Download">
                            <Download className="w-5 h-5" />
                        </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => window.open(openUrl, '_blank')} disabled={!openUrl} className="text-slate-200 hover:text-white hover:bg-white/20 rounded-full h-9 w-9" title="Open in new tab">
                        <ExternalLink className="w-5 h-5" />
                    </Button>
                </div>

                <div className="hidden md:flex items-center gap-3 overflow-hidden">
                    <Button variant="ghost" size="icon" onClick={handleClose} className="text-slate-300 hover:text-white hover:bg-white/10 rounded-full flex-shrink-0 focus-visible:ring-0 focus-visible:ring-offset-0" aria-label="Close file preview">
                       <X className="w-6 h-6" />
                    </Button>
                    <Icon className={cn("w-5 h-5 shrink-0", color)} />
                    <div className='flex items-center gap-2'>
                       <span className={cn("text-sm text-white font-medium truncate")}>{item.name}</span>
                    </div>
                </div>
            </div>

            {/* Center Section */}
             <div className={cn("flex-1 items-center justify-center", isPdf && (isMobile ? 'flex' : 'hidden md:flex'))}>
                 <PdfControls
                    isMobile={isMobile}
                    numPages={numPages}
                    pageNumber={pageNumber}
                    pdfScale={pdfScale}
                    goToPage={goToPage}
                    zoomIn={zoomIn}
                    zoomOut={zoomOut}
                    pageInput={pageInput}
                    setPageInput={(v) => {
                      manualPageInputInProgress.current = true;
                      setPageInput(v);
                    }}
                    handlePageInputSubmit={handlePageInputSubmit}
                    handlePageInputBlur={handlePageInputBlur}
                    scaleInput={scaleInput}
                    handleScaleInputChange={handleScaleInputChange}
                    handleScaleInputSubmit={handleScaleInputSubmit}
                    handleScaleInputBlur={handleScaleInputBlur}
                    pageInputRef={pageInputRef}
                />
            </div>

            {/* Right Section */}
            <div className='flex items-center gap-1 sm:gap-2 flex-1 justify-end'>
                <div className='hidden md:flex items-center gap-1 sm:gap-2'>
                    {!isLink && (
                    <>
                        <Button variant="ghost" size="icon" onClick={handleDownload} disabled={!fileUrl || loading} className="text-slate-200 hover:text-white hover:bg-white/20 rounded-full h-9 w-9" title="Download">
                            <Download className="w-5 h-5" />
                        </Button>
                        {!isMobile && (
                            <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                                if (fileContentRef.current) {
                                fileContentRef.current.requestFullscreen();
                                toast({
                                    title: "Presentation Mode",
                                    description: "To exit fullscreen, press the ESC key.",
                                    duration: 3000,
                                })
                                }
                            }} 
                            disabled={!fileUrl} 
                            className="text-slate-200 hover:text-white hover:bg-white/20 rounded-full h-9 w-9" 
                            title="Present"
                            >
                                <Presentation className="w-5 h-5" />
                            </Button>
                        )}
                    </>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => window.open(openUrl, '_blank')} disabled={!openUrl} className="text-slate-200 hover:text-white hover:bg-white/20 rounded-full h-9 w-9" title="Open in new tab">
                        <ExternalLink className="w-5 h-5" />
                    </Button>
                </div>
                {isChatAvailable && (
                    <Button
                        onClick={() => setShowChat(!showChat)}
                        className={cn(
                            "rounded-full px-3 sm:px-4 h-9 text-white transition-all duration-300 relative overflow-hidden font-bold",
                            "active:scale-95",
                             !showChat && "bg-gradient-to-r from-[#2968b5] to-[#C42929]",
                             showChat && "bg-gradient-to-r from-[#1263FF] to-[#D11111]"
                        )}
                    >
                        <div className="flex items-center relative z-10">
                            <Sparkles className="h-4 w-4 mr-2" />
                            <span className={cn("sm:inline")}>Ask AI</span>
                        </div>
                    </Button>
                )}
            </div>
        </header>

        <main ref={fileContentRef} className="flex-1 grid grid-rows-1 grid-cols-1 overflow-hidden">
             <div className="[grid-area:1/1] overflow-auto">
              {loading && <div className="text-white">Loading...</div>}
              {error && <div className="text-red-400">Error: {error}</div>}
              {!loading && !error && fileUrl && (
                <FilePreview 
                    key={item.id}
                    ref={pdfViewerRef}
                    url={fileUrl} 
                    mime={item.metadata?.mime ?? 'application/octet-stream'} 
                    itemName={item.name}
                    onPdfLoadSuccess={handlePdfLoadSuccess}
                    pdfScale={pdfScale}
                    onPageChange={onPageChange}
                    isFullscreen={isFullscreen}
                    currentPage={pageNumber}
                />
              )}
              {!loading && !fileUrl && (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-300 bg-slate-800/50 rounded-lg p-8">
                  <p className="text-xl mb-3">File content not available.</p>
                  <p className="text-sm text-slate-400">The file could not be loaded. It might have been deleted or there was a network issue.</p>
              </div>
              )}
            </div>
        </main>
    </motion.div>
  );

  const renderChatView = () => {
    const chatViewContent = (
      <>
        <header className={cn("flex items-center justify-between whitespace-nowrap px-4 py-3 shrink-0 h-14")}>
            <div className="flex items-center gap-2">
                <AiAssistantIcon className="h-6 w-6" />
                <h2 className="text-lg font-semibold text-white">AI Assistant</h2>
            </div>
            <div className="flex items-center">
                 <Button variant="ghost" size="icon" onClick={decreaseFontSize} disabled={fontSizeIndex === 0} className="text-slate-300 hover:bg-white/10 rounded-full w-9 h-9" title="Decrease font size">
                    <Minus className="w-6 h-6" />
                </Button>
                <Button variant="ghost" size="icon" onClick={increaseFontSize} disabled={fontSizeIndex === fontSizes.length - 1} className="text-slate-300 hover:bg-white/10 rounded-full w-9 h-9" title="Increase font size">
                    <Plus className="w-6 h-6" />
                </Button>
                <Button variant="ghost" size="icon" onClick={handleNewChat} className="text-slate-300 hover:bg-white/10 rounded-full w-9 h-9" title="Start New Chat" aria-label="Start a new chat session">
                    <MessageCirclePlus className="w-6 h-6" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setShowChat(false)} className="text-slate-300 hover:bg-white/10 rounded-full w-9 h-9" title="Close Chat" aria-label="Close chat panel">
                    <X className="w-6 h-6" />
                </Button>
            </div>
        </header>
        <div className='relative flex-1 flex flex-col overflow-hidden'>
            <div 
                ref={chatContainerRef} 
                className={cn("flex-1 space-y-6 overflow-y-auto p-4 sm:p-6")}
                style={{
                    backgroundColor: '#212121',
                    paddingBottom: isMobile ? '7rem' : '1.5rem',
                }}
            >
                    
                    {chatHistory.length === 0 && !isAiThinking && (
                        <div className={cn("prose prose-sm max-w-full font-inter", fontSizes[fontSizeIndex])}>
                            {isExtracting ? (
                                <div className="flex items-center gap-2 text-white">
                                <Skeleton className="h-5 w-5 rounded-full" />
                                <p>Analyzing document...</p>
                                </div>
                            ) : documentText ? (
                                <p className="text-white">Hello! I am your AI assistant. Ask me anything about this document, or ask me to create a quiz!</p>
                            ) : (
                                <p className="text-yellow-400">Document content is not available or could not be extracted. Chat is disabled.</p>
                            )}
                        </div>
                    )}

                    {chatHistory.map((msg, index) => {
                        const isLastMessage = index === chatHistory.length - 1;
                        return (
                            <ChatMessage
                                key={`msg-${index}`}
                                messageId={`msg-${index}`}
                                msg={msg}
                                onCopy={handleCopyToClipboard}
                                onRegenerate={handleRegenerate}
                                isLastMessage={isLastMessage}
                                isAiThinking={isAiThinking}
                                copiedMessageId={copiedMessageId}
                                fontSizeClass={fontSizes[fontSizeIndex]}
                                isMobile={isMobile}
                            />
                        )
                    })}

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
             <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[#212121] to-transparent pointer-events-none" />
        </div>
        <div 
            className={cn(
              "p-2 mb-2",
              isMobile ? "fixed bottom-2 left-0 right-0 z-50" : "mt-auto",
              "transition-transform duration-300"
            )}
            style={{ transform: isMobile ? `translateY(-${chatInputOffset}px)` : 'none', backgroundColor: '#212121' }}
        >
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
      </>
    );
    
    if (isMobile) {
        return (
             <AnimatePresence>
                {showChat && (
                    <motion.div
                        key="chat-panel-mobile"
                        initial={{ y: '100dvh' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100dvh' }}
                        transition={{ type: "spring", stiffness: 400, damping: 40 }}
                        className="flex flex-col overflow-hidden h-[100dvh] w-full absolute inset-0 z-20"
                        style={{backgroundColor: '#212121'}}
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
                    animate={{ width: 512, opacity: 1 }}
                    exit={{ width: 0, opacity: 0, transition: { duration: 0.2, ease: 'easeOut' } }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    className="flex-shrink-0 flex flex-col overflow-hidden h-full border-l border-white/10"
                    style={{backgroundColor: '#212121'}}
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
