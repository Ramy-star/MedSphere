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
import { fileService } from '@/lib/fileService';
import { contentService } from '@/lib/contentService';
import React, { useEffect, useState, useRef, useCallback, lazy, Suspense, FormEvent } from 'react';
import { X, Download, RefreshCw, Check, ExternalLink, File as FileIcon, FileText, FileImage, FileVideo, Music, FileSpreadsheet, Presentation, Sparkles, Minus, Plus, ChevronLeft, ChevronRight, FileCode, Square, Loader2, ArrowUp, Wand2, MessageSquareQuote, Lightbulb, HelpCircle, Maximize, Shrink, FileCheck, Edit, SquareArrowOutUpRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription as AlertDialogDesc, // Renamed to avoid conflict
  AlertDialogFooter,
  AlertDialogHeader as AlertDialogHeader2,
  AlertDialogTitle as AlertDialogTitle2,
} from "@/components/ui/alert-dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Link2Icon } from './icons/Link2Icon';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Input } from './ui/input';
import dynamic from 'next/dynamic';
import { Skeleton } from './ui/skeleton';
import { InteractiveExamIcon } from './icons/InteractiveExamIcon';
import { FlashcardIcon } from './icons/FlashcardIcon';
import { useAuthStore } from '@/stores/auth-store';
import { useRouter } from 'next/navigation';
import * as pdfjs from 'pdfjs-dist';
import { Note, NotePage } from './profile/ProfileNotesSection';
import { NoteViewer } from './profile/NoteViewer';


const ChatPanel = dynamic(() => import('./ChatPanel'), {
  ssr: false,
  loading: () => <ChatPanelSkeleton />,
});

const ChatPanelSkeleton = () => (
    <div
        className="flex-shrink-0 flex flex-col overflow-hidden h-full border-l border-white/10 w-[512px]"
        style={{backgroundColor: '#212121'}}
        aria-label="AI Chat Panel"
    >
        <header className="flex items-center justify-between whitespace-nowrap px-4 py-3 shrink-0 h-14 sticky top-0 bg-[#212121] z-10">
            <Skeleton className="h-6 w-32 rounded-lg" />
            <div className="flex items-center">
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-9 w-9 rounded-full" />
            </div>
        </header>
        <div className='relative flex-1 flex flex-col overflow-hidden p-6'>
             <div className="flex items-start space-x-3 group/message">
                <Skeleton className="h-6 w-6 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-3 pt-1">
                    <Skeleton className="h-4 w-12 rounded-lg" />
                    <Skeleton className="h-4 w-[90%] rounded-lg" />
                    <Skeleton className="h-4 w-[75%] rounded-lg" />
                </div>
            </div>
        </div>
    </div>
);


type PdfControlsProps = {
    isMobile: boolean,
    numPages: number | undefined,
    pageNumber: number,
    goToPage: (page: number) => void,
    zoomIn: () => void,
    zoomOut: () => void,
    pageInput: string,
    setPageInput: (value: string) => void,
    handlePageInputSubmit: (e: React.FormEvent) => void,
    handlePageInputBlur: (e: React.FocusEvent) => void,
    pageInputRef: React.RefObject<HTMLInputElement>,
    scaleInput: string;
    handleScaleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleScaleInputSubmit: (e: React.FormEvent) => void;
    handleScaleInputBlur: (e: React.FocusEvent) => void;
};


const PdfControls = ({
    isMobile,
    numPages,
    pageNumber,
    goToPage,
    zoomIn,
    zoomOut,
    pageInput,
    setPageInput,
    handlePageInputSubmit,
    handlePageInputBlur,
    pageInputRef,
    scaleInput,
    handleScaleInputChange,
    handleScaleInputSubmit,
    handleScaleInputBlur,
}: PdfControlsProps) => {

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
      <div className="flex items-center gap-2 text-white">
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

        <div className="h-6 w-px bg-slate-600 mx-2"></div>

        <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={zoomOut} className="text-slate-300 hover:bg-white/10 rounded-full w-9 h-9">
                        <Minus className="w-5 h-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8}><p>Zoom Out</p></TooltipContent>
            </Tooltip>
        </TooltipProvider>

        <form onSubmit={handleScaleInputSubmit}>
            <Input
                type="text"
                value={scaleInput}
                onChange={handleScaleInputChange}
                onBlur={handleScaleInputBlur}
                className="w-16 h-7 text-center bg-transparent border-0 font-ubuntu focus-visible:ring-1 focus-visible:ring-blue-500 p-0"
                onFocus={(e) => e.target.select()}
            />
        </form>
        
        <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={zoomIn} className="text-slate-300 hover:bg-white/10 rounded-full w-9 h-9">
                        <Plus className="w-5 h-5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8}><p>Zoom In</p></TooltipContent>
            </Tooltip>
        </TooltipProvider>
    </div>
    );
};


const getIconForFileType = (item: Content): { Icon: LucideIcon | React.FC<any>, color: string } => {
    if (item.type === 'LINK') {
        return { Icon: Link2Icon, color: 'text-cyan-400' };
    }
    
    if (item.type === 'INTERACTIVE_QUIZ') {
        return { Icon: Lightbulb, color: 'text-yellow-400' };
    }
    if (item.type === 'INTERACTIVE_EXAM') {
        return { Icon: InteractiveExamIcon, color: '' };
    }
    if (item.type === 'INTERACTIVE_FLASHCARD') {
        return { Icon: FlashcardIcon, color: '' };
    }
    if (item.type === 'NOTE') {
        return { Icon: FileText, color: 'text-yellow-300' };
    }

    const mimeType = item.metadata?.mime;

    if(mimeType === 'text/markdown') return { Icon: HelpCircle, color: 'text-red-400' };
    if (mimeType?.startsWith('image/')) return { Icon: FileImage, color: 'text-purple-400' };
    if (mimeType?.startsWith('video/')) return { Icon: FileVideo, color: 'text-red-400' };
    if (mimeType?.startsWith('audio/')) return { Icon: Music, color: 'text-orange-400' };
    if (mimeType === 'application/pdf') return { Icon: FileText, color: 'text-red-400' };

    const extension = item.name.split('.').pop()?.toLowerCase();
    
    switch (extension) {
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
        default:
            return { Icon: FileIcon, color: 'text-gray-400' };
    }
};

export function FilePreviewModal({ item, onOpenChange }: { item: Content | null, onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const router = useRouter();
  const [showChat, setShowChat] = useState(false);
  const [initialQuotedText, setInitialQuotedText] = useState<string | null>(null);
  
  const [documentContext, setDocumentContext] = useState<{ lectureText: string | null, questionText: string | null }>({ lectureText: null, questionText: null });
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pdfProxy, setPdfProxy] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfScale, setPdfScale] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [scaleInput, setScaleInput] = useState('100%');
  const [isExamInProgress, setIsExamInProgress] = useState(false);
  const isMobile = useIsMobile();
  const pdfViewerRef = useRef<FilePreviewRef>(null);
  const pageInputRef = useRef<HTMLInputElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const fileContentRef = useRef<HTMLDivElement | null>(null);
  const scaleBeforeFullscreen = useRef<number>(1);
  const manualPageInputInProgress = useRef(false);
  const [selection, setSelection] = useState<{ text: string; position: { top: number; left: number } } | null>(null);

  const { can } = useAuthStore();

  const ZOOM_STEP = 0.1;
  const MAX_ZOOM = 5;
  const MIN_ZOOM = 0.1;

  const resetState = useCallback(() => {
    setPdfProxy(null);
    setNumPages(undefined);
    setPageNumber(1);
    setPageInput('1');
    setPdfScale(1);
    setDocumentContext({ lectureText: null, questionText: null });
    setIsExtracting(false);
    setShowChat(false);
    setInitialQuotedText(null);
    setError(null);
    setSelection(null);
    setIsExamInProgress(false);
  }, []);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setTimeout(resetState, 300);
  }, [onOpenChange, resetState]);

  useEffect(() => {
    if (item) {
      resetState();
      // If the item is a note, immediately open chat
      if (item.type === 'NOTE') {
          setShowChat(true);
      }
    }
  }, [item, resetState]);

    const handleTextExtraction = useCallback(async (currentItem: Content) => {
        if (documentContext.lectureText || isExtracting) return;
    
        setIsExtracting(true);
        setError(null);
        
        let lectureText: string | null = null;
        let questionText: string | null = null;
        let referencedFiles: Content[] = [];
        
        if (currentItem.type === 'NOTE') {
            try {
                const noteData: Note = JSON.parse(currentItem.metadata!.quizData!);
                const activePage = noteData.pages[0]; // Assuming only one page is passed for context
                lectureText = `# ${noteData.title}\n\n**Page: ${activePage.title}**\n\n${activePage.content}`;
                
                if (activePage.referencedFileIds) {
                    for (const fileId of activePage.referencedFileIds) {
                        const file = await contentService.getById(fileId);
                        if(file) referencedFiles.push(file);
                    }
                }
            } catch (e) {
                console.error("Failed to parse note data for AI chat", e);
                lectureText = 'Error: Could not load note content.';
            }
        }
    
        try {
            const isQuizFile = currentItem.type === 'INTERACTIVE_QUIZ' || currentItem.type === 'INTERACTIVE_EXAM' || currentItem.type === 'INTERACTIVE_FLASHCARD';
            const isQuestionFile = currentItem.metadata?.sourceFileId && currentItem.metadata?.mime === 'text/markdown';

            let filesToProcess: Content[] = [...referencedFiles];

            if (isQuizFile) {
                questionText = JSON.stringify(JSON.parse(currentItem.metadata?.quizData || '{}'), null, 2);
            } else if (isQuestionFile) {
                const questionBlob = await fileService.getFileContent(currentItem.metadata!.storagePath!);
                questionText = await questionBlob.text();
            }

            const sourceFileId = currentItem.metadata?.sourceFileId;
            if (sourceFileId) {
                const sourceFile = await contentService.getById(sourceFileId);
                if (sourceFile) filesToProcess.push(sourceFile);
            } else if (currentItem.type === 'FILE') {
                filesToProcess.push(currentItem);
            }
            
            if (filesToProcess.length > 0) {
                const fileContents = await Promise.all(
                    filesToProcess.map(async file => {
                        if (file.metadata?.storagePath) {
                            try {
                                const fileBlob = await fileService.getFileContent(file.metadata.storagePath);
                                if (file.metadata.mime === 'application/pdf') {
                                    const pdf = await pdfjs.getDocument(await fileBlob.arrayBuffer()).promise;
                                    return await fileService.extractTextFromPdf(pdf);
                                } else if (file.metadata.mime?.startsWith('text/')) {
                                    return await fileBlob.text();
                                }
                            } catch (e) {
                                console.error(`Failed to process file ${file.name}:`, e);
                                return `[Error processing file: ${file.name}]`;
                            }
                        }
                        return '';
                    })
                );
                const combinedContent = fileContents.filter(Boolean).join('\n\n---\n\n');
                lectureText = lectureText ? `${lectureText}\n\n===\n\n${combinedContent}` : combinedContent;
            }
            
            setDocumentContext({ lectureText, questionText });
    
        } catch (err: any) {
            console.error("Failed to extract text for chat:", err);
            setDocumentContext({ lectureText: null, questionText: null });
            toast({
                variant: 'destructive',
                title: 'Text Extraction Failed',
                description: err.message || 'Could not read document content for chat.'
            });
        } finally {
            setIsExtracting(false);
        }
    }, [documentContext.lectureText, isExtracting, toast]);


    useEffect(() => {
        if (item && showChat && !documentContext.lectureText && !isExtracting) {
            handleTextExtraction(item);
        }
    }, [item, showChat, documentContext.lectureText, isExtracting, handleTextExtraction]);
  
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
      handlePageInputSubmit(e as unknown as FormEvent);
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
      handleScaleInputSubmit(e as unknown as FormEvent);
  };

  const onPageChange = useCallback((newPage: number) => {
    setPageNumber(newPage);
  }, []);

  useEffect(() => {
      if (!manualPageInputInProgress.current) {
        setPageInput(String(pageNumber));
      }
  }, [pageNumber]);
  
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
  }, [isMobile]);
  
  useEffect(() => {
    setScaleInput(`${Math.round(pdfScale * 100)}%`);
  }, [pdfScale]);


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

  
  const handleDownload = async () => {
    if (!fileUrl || !item) return;
    try {
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
    }
  };

  const handleTextSelect = useCallback((text: string, position: { top: number; left: number }) => {
    const containerRect = previewContainerRef.current?.getBoundingClientRect();
    if (containerRect) {
      setSelection({
        text,
        position: {
          top: position.top - containerRect.top,
          left: position.left - containerRect.left,
        },
      });
    }
  }, []);

  const handleQuoteToChat = () => {
    if (selection) {
      setInitialQuotedText(selection.text);
      setShowChat(true);
      setSelection(null);
    }
  };

  const handleEditInteractiveContent = () => {
    if (!item) return;
    const sourceId = item.metadata?.sourceFileId;
    if (sourceId) {
      router.push(`/questions-creator/${sourceId}`);
      handleClose();
    } else {
        toast({
            variant: 'destructive',
            title: 'Source Not Found',
            description: 'Cannot edit this item because its original source file ID is missing.'
        });
    }
  }


  if (!item) return null;
  
  const { Icon, color } = getIconForFileType(item);
  const fileUrl = item?.metadata?.storagePath;
  const isLink = item?.type === 'LINK';
  const linkUrl = item?.metadata?.url;
  const openUrl = isLink ? linkUrl : fileUrl;
  const isPdf = item?.metadata?.mime === 'application/pdf';
  const isMarkdown = item?.metadata?.mime === 'text/markdown';
  const isTextFile = item?.metadata?.mime?.startsWith('text/');
  const isNote = item.type === 'NOTE';
  const isQuiz = item?.type === 'INTERACTIVE_QUIZ' || item?.type === 'INTERACTIVE_EXAM' || item?.type === 'INTERACTIVE_FLASHCARD';
  const isChatAvailable = (isPdf || isMarkdown || isTextFile || isQuiz || isNote) && !isExamInProgress;
  const isQuoteAvailable = (isPdf || isMarkdown || isTextFile || isNote) && !isExamInProgress;
  const displayName = item.name;
  const canEditInteractive = can('canAdministerExams', item.id) && (item.type === 'INTERACTIVE_QUIZ' || item.type === 'INTERACTIVE_EXAM');
  
  const renderLoadingSkeleton = () => (
    <div className="relative flex-1 flex flex-col bg-[#13161C] overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between px-2 sm:px-4 bg-[#2f3b47] z-10">
            <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-5 w-40 rounded-lg hidden md:block" />
            </div>
            <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-24 rounded-full" />
            </div>
        </header>
        <main className="flex-1 p-4">
            <Skeleton className="h-full w-full rounded-lg" />
        </main>
    </div>
  );
  
  const renderFilePreview = () => {
    // Special handling for note viewing
    if (isNote) {
        try {
            const noteData: Note = JSON.parse(item.metadata!.quizData!);
            return <NoteViewer note={noteData} />
        } catch (e) {
            return <div>Error displaying note.</div>
        }
    }

    if (!fileUrl && !isQuiz) {
      if (error) {
        return (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-300 bg-slate-800/50 rounded-lg p-8">
            <p className="text-xl mb-3 text-red-400">Error: {error}</p>
            <p className="text-sm text-slate-400">The file content could not be loaded.</p>
          </div>
        )
      }
      return renderLoadingSkeleton();
    }
    
    return (
    <div
        ref={previewContainerRef}
        className={cn("relative flex-1 flex flex-col bg-[#13161C] overflow-hidden", isFullscreen && "fixed inset-0 z-[100] bg-black")}
    >
        <header className={cn("flex h-14 shrink-0 items-center justify-between px-2 sm:px-4 z-10", isFullscreen ? 'bg-black/50' : 'bg-[#2f3b47]')}>
            <div className="flex items-center gap-1 overflow-hidden flex-1">
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={handleClose} className="text-slate-300 hover:text-white hover:bg-white/10 rounded-full h-9 w-9 flex-shrink-0 focus-visible:ring-0 focus-visible:ring-offset-0" aria-label="Close file preview">
                        <X className="w-5 h-5" />
                    </Button>
                     {isMobile && !isQuiz && (
                        <div className='flex items-center'>
                            <TooltipProvider delayDuration={100}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={handleDownload} disabled={!fileUrl} className="text-slate-200 hover:text-white hover:bg-white/20 rounded-full h-9 w-9">
                                            <Download className="w-5 h-5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" sideOffset={8}><p>Download</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={() => window.open(openUrl, '_blank')} disabled={!openUrl} className="text-slate-200 hover:text-white hover:bg-white/20 rounded-full h-9 w-9">
                                            <SquareArrowOutUpRight className="w-5 h-5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" sideOffset={8}><p>Open in browser</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    )}
                </div>

                <div className="hidden md:flex items-center gap-3 overflow-hidden">
                    <Icon className={cn("w-5 h-5 shrink-0", color)} />
                    <div className='flex items-center gap-2'>
                       <span className={cn("text-sm text-white font-medium truncate")}>{displayName}</span>
                    </div>
                </div>
            </div>

            <div className={cn("flex-1 items-center justify-center", isPdf && (isMobile ? 'flex' : 'hidden md:flex'))}>
                 {isPdf && (
                    <PdfControls
                        isMobile={isMobile}
                        numPages={numPages}
                        pageNumber={pageNumber}
                        goToPage={goToPage}
                        pageInput={pageInput}
                        setPageInput={(v) => {
                          manualPageInputInProgress.current = true;
                          setPageInput(v);
                        }}
                        handlePageInputSubmit={handlePageInputSubmit}
                        handlePageInputBlur={handlePageInputBlur}
                        pageInputRef={pageInputRef}
                        zoomIn={zoomIn} 
                        zoomOut={zoomOut}
                        scaleInput={scaleInput}
                        handleScaleInputChange={handleScaleInputChange}
                        handleScaleInputSubmit={handleScaleInputSubmit}
                        handleScaleInputBlur={handleScaleInputBlur}
                    />
                 )}
            </div>

            <div className='flex items-center gap-1 sm:gap-2 flex-1 justify-end'>
              <TooltipProvider delayDuration={100}>
                <div className={cn('hidden md:flex items-center gap-1 sm:gap-2')}>
                    {canEditInteractive && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={handleEditInteractiveContent} className="text-slate-200 hover:text-white hover:bg-white/20 rounded-full h-9 w-9">
                                    <Edit className="w-5 h-5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" sideOffset={8}><p>Edit Questions</p></TooltipContent>
                        </Tooltip>
                    )}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={handleDownload} disabled={!fileUrl} className="text-slate-200 hover:text-white hover:bg-white/20 rounded-full h-9 w-9">
                                <Download className="w-5 h-5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" sideOffset={8}><p>Download</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => window.open(openUrl, '_blank')} disabled={!openUrl} className="text-slate-200 hover:text-white hover:bg-white/20 rounded-full h-9 w-9">
                                <SquareArrowOutUpRight className="w-5 h-5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" sideOffset={8}><p>Open in browser</p></TooltipContent>
                    </Tooltip>
                    {isPdf && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => { if(isFullscreen) { document.exitFullscreen(); } else { fileContentRef.current?.requestFullscreen(); } }} className="text-slate-200 hover:text-white hover:bg-white/20 rounded-full h-9 w-9">
                                    {isFullscreen ? <Shrink className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" sideOffset={8}><p>{isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}</p></TooltipContent>
                        </Tooltip>
                    )}
                </div>
                </TooltipProvider>
                
                <Button
                    onClick={() => setShowChat(!showChat)}
                    disabled={!isChatAvailable}
                    className={cn(
                        "rounded-full px-3 sm:px-4 h-9 text-white transition-all duration-300 relative overflow-hidden font-bold",
                        "active:scale-95",
                        !isChatAvailable && "opacity-50 cursor-not-allowed",
                         showChat && "bg-gradient-to-r from-[#1263FF] to-[#D11111]",
                         !showChat && "bg-gradient-to-r from-[#2968b5] to-[#C42929]"
                    )}
                >
                    <div className="flex items-center relative z-10">
                        <Sparkles className="h-4 w-4 mr-2" />
                        <span className={cn("sm:inline")}>Ask AI</span>
                    </div>
                </Button>
                
            </div>
        </header>

        <main ref={fileContentRef} className={cn("flex-1 overflow-auto", isQuiz ? "w-full max-w-6xl mx-auto" : "overflow-x-auto", isFullscreen && "w-full h-full")}>
             <div className={cn("no-scrollbar overflow-auto h-full", isQuiz ? 'w-full h-full' : '[grid-area:1/1]')}>
              <FilePreview 
                  key={item.id}
                  itemId={item.id}
                  ref={pdfViewerRef}
                  url={fileUrl} 
                  mime={item.metadata?.mime ?? 'application/octet-stream'} 
                  itemName={item.name}
                  onPdfLoadSuccess={handlePdfLoadSuccess}
                  pdfScale={pdfScale}
                  onPageChange={onPageChange}
                  isFullscreen={isFullscreen}
                  currentPage={pageNumber}
                  onTextSelect={isQuoteAvailable ? handleTextSelect : undefined}
                  onSelectionChange={() => setSelection(null)}
                  itemType={item.type}
                  quizData={item.metadata?.quizData}
                  onExamStateChange={setIsExamInProgress}
              />
            </div>
            {selection && isQuoteAvailable && (
                <div
                    className="absolute z-20"
                    style={{ 
                        top: selection.position.top, 
                        left: selection.position.left,
                        transform: 'translateX(-50%)' 
                    }}
                >
                     <button
                        onClick={handleQuoteToChat}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-white shadow-lg transition-transform active:scale-95 border border-slate-700"
                        style={{ backgroundColor: '#212121' }}
                    >
                        <MessageSquareQuote className="h-4 w-4" />
                        <span className="text-sm font-medium">Ask AI</span>
                    </button>
                </div>
            )}
        </main>
    </div>
  )};

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent 
        className={cn(
            "max-w-none w-screen p-0 flex flex-row bg-slate-900/80 backdrop-blur-sm border-0 gap-0",
            "h-full md:h-[var(--1dvh,100vh)] z-[60]" // z-index is higher than main layout's floating assistant
        )}
        hideCloseButton={true}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>File Preview: {displayName}</DialogTitle>
          <DialogDescription>
            Previewing file {displayName}. You can download, share, or chat with the document if supported.
          </DialogDescription>
        </DialogHeader>
        
        <div className={cn(
          "flex-1 flex flex-col transition-all duration-300 ease-in-out", 
          showChat && !isMobile ? "w-[calc(100%-512px)]" : "w-full"
        )}>
            {renderFilePreview()}
        </div>
        
        
        <div className={cn(
            "h-full transition-all duration-300 ease-in-out overflow-hidden",
            isMobile ? 'fixed top-0 left-0 w-full z-20' : 'relative',
            isMobile && (showChat ? 'translate-x-0' : 'translate-x-full'),
            !isMobile && (showChat ? 'w-[512px]' : 'w-0')
        )}>
             {(isChatAvailable || showChat) && (
                <ChatPanel
                    showChat={showChat}
                    isMobile={isMobile}
                    documentText={documentContext.lectureText}
                    isExtracting={isExtracting}
                    onClose={() => setShowChat(false)}
                    initialQuotedText={initialQuotedText}
                    onInitialQuotedTextConsumed={() => setInitialQuotedText(null)}
                    questionsText={documentContext.questionText}
                />
            )}
        </div>

      </DialogContent>
    </Dialog>
  );
}
