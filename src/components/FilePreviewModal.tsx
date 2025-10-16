
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
import React, { useEffect, useState, useRef, useCallback, lazy, Suspense } from 'react';
import { X, Download, RefreshCw, Check, ExternalLink, File as FileIcon, FileText, FileImage, FileVideo, Music, FileSpreadsheet, Presentation, Sparkles, Minus, Plus, ChevronLeft, ChevronRight, FileCode, Square, Loader2, ArrowUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AnimatePresence, motion } from 'framer-motion';

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
import { Link2Icon } from './icons/Link2Icon';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Input } from './ui/input';
import dynamic from 'next/dynamic';
import { Skeleton } from './ui/skeleton';

const ChatPanel = dynamic(() => import('./ChatPanel'), {
  ssr: false,
  loading: () => <ChatPanelSkeleton />,
});

const ChatPanelSkeleton = () => (
    <motion.div
        layout
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 512, opacity: 1 }}
        exit={{ width: 0, opacity: 0, transition: { duration: 0.2, ease: 'easeOut' } }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="flex-shrink-0 flex flex-col overflow-hidden h-full border-l border-white/10"
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
    </motion.div>
);


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

export function FilePreviewModal({ item, onOpenChange }: { item: Content | null, onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const [showChat, setShowChat] = useState(false);
  
  const [documentText, setDocumentText] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pdfProxy, setPdfProxy] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfScale, setPdfScale] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [scaleInput, setScaleInput] = useState('100%');
  const isMobile = useIsMobile();
  const pdfViewerRef = useRef<FilePreviewRef>(null);
  const pageInputRef = useRef<HTMLInputElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const fileContentRef = useRef<HTMLDivElement>(null);
  const scaleBeforeFullscreen = useRef<number>(1);
  const manualPageInputInProgress = useRef(false);

  const ZOOM_STEP = 0.1;
  const MAX_ZOOM = 5;
  const MIN_ZOOM = 0.1;

  const resetPdfState = useCallback(() => {
    setPdfProxy(null);
    setNumPages(undefined);
    setPageNumber(1);
    setPageInput('1');
    setPdfScale(1);
    setDocumentText(null);
    setIsExtracting(false);
    setShowChat(false);
  }, []);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    // Add a delay to allow the dialog to animate out before resetting state
    setTimeout(resetPdfState, 300);
  }, [onOpenChange, resetPdfState]);

  // All hooks should be called unconditionally at the top level.
  // We'll check for `item` later before rendering.
  useEffect(() => {
    if(item) {
        resetPdfState();
    }
  }, [item, resetPdfState]);
  
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
  }

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
    if (!fileUrl) {
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
        className={cn("relative flex-1 flex flex-col bg-[#13161C] overflow-hidden")}
    >
        <header className="flex h-14 shrink-0 items-center justify-between px-2 sm:px-4 bg-[#2f3b47] backdrop-blur-sm border-b border-slate-800 z-10">
            {/* Left Section */}
             <div className="flex items-center gap-1 overflow-hidden flex-1">
                <div className="flex items-center gap-1 md:hidden">
                    <Button variant="ghost" size="icon" onClick={handleClose} className="text-slate-300 hover:text-white hover:bg-white/10 rounded-full h-9 w-9 flex-shrink-0 focus-visible:ring-0 focus-visible:ring-offset-0" aria-label="Close file preview">
                        <X className="w-5 h-5" />
                    </Button>
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={handleDownload} disabled={!fileUrl} className="text-slate-200 hover:text-white hover:bg-white/20 rounded-full h-9 w-9">
                                <Download className="w-5 h-5" />
                            </Button>
                           </TooltipTrigger>
                          <TooltipContent side="bottom" sideOffset={8} className="rounded-lg bg-black text-white"><p>Download</p></TooltipContent>
                      </Tooltip>
                      <Tooltip>
                          <TooltipTrigger asChild>
                             <Button variant="ghost" size="icon" onClick={() => window.open(openUrl, '_blank')} disabled={!openUrl} className="text-slate-200 hover:text-white hover:bg-white/20 rounded-full h-9 w-9">
                                <ExternalLink className="w-5 h-5" />
                            </Button>
                           </TooltipTrigger>
                          <TooltipContent side="bottom" sideOffset={8} className="rounded-lg bg-black text-white"><p>Open in new tab</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
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
              <TooltipProvider delayDuration={100}>
                <div className='hidden md:flex items-center gap-1 sm:gap-2'>
                    {!isLink && (
                    <>
                        <Tooltip>
                           <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={handleDownload} disabled={!fileUrl} className="text-slate-200 hover:text-white hover:bg-white/20 rounded-full h-9 w-9">
                                  <Download className="w-5 h-5" />
                              </Button>
                           </TooltipTrigger>
                           <TooltipContent side="bottom" sideOffset={8} className="rounded-lg bg-black text-white"><p>Download</p></TooltipContent>
                        </Tooltip>
                        {!isMobile && (
                           <Tooltip>
                            <TooltipTrigger asChild>
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
                                >
                                    <Presentation className="w-5 h-5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" sideOffset={8} className="rounded-lg bg-black text-white"><p>Present</p></TooltipContent>
                           </Tooltip>
                        )}
                    </>
                    )}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => window.open(openUrl, '_blank')} disabled={!openUrl} className="text-slate-200 hover:text-white hover:bg-white/20 rounded-full h-9 w-9">
                                <ExternalLink className="w-5 h-5" />
                            </Button>
                        </TooltipTrigger>
                       <TooltipContent side="bottom" sideOffset={8} className="rounded-lg bg-black text-white"><p>Open in new tab</p></TooltipContent>
                    </Tooltip>
                </div>
                </TooltipProvider>
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
            </div>
        </main>
    </div>
  )};

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent 
        className={cn(
            "max-w-none w-screen p-0 flex flex-row bg-slate-900/80 backdrop-blur-sm border-0 gap-0",
            "h-full md:h-[var(--1dvh,100vh)]"
        )}
        hideCloseButton={true}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>File Preview: {item.name}</DialogTitle>
          <DialogDescription>
            Previewing file {item.name}. You can download, share, or chat with the document if supported.
          </DialogDescription>
        </DialogHeader>
        
        <div className={cn("flex-1 flex flex-col transition-all duration-300 ease-in-out", showChat ? "w-1/2" : "w-full")}>
            {renderFilePreview()}
        </div>
        
        
        <AnimatePresence>
          {showChat && (
              <ChatPanel
                  isMobile={isMobile}
                  documentText={documentText}
                  isExtracting={isExtracting}
                  onClose={() => setShowChat(false)}
              />
          )}
        </AnimatePresence>

      </DialogContent>
    </Dialog>
  );
}
