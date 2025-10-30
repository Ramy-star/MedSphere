'use client';

import { useEffect, useState, forwardRef, MouseEvent, useCallback, useRef } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import PdfViewer, { type PdfViewerRef } from './PdfViewer';
import { Skeleton } from './ui/skeleton';
import { contentService } from '@/lib/contentService';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { QuizContainer } from './quiz-tabs';
import type { Lecture } from '@/lib/types';
import ExamContainer from './ExamContainer';
import { FlashcardContainer } from './FlashcardContainer';


// Import react-pdf styles here to ensure they are loaded
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

type FilePreviewProps = {
  itemId: string;
  url?: string;
  mime?: string;
  itemName: string;
  onPdfLoadSuccess?: (pdf: PDFDocumentProxy) => void;
  pdfScale: number;
  onPageChange?: (page: number) => void;
  isFullscreen?: boolean;
  currentPage?: number;
  onTextSelect?: (text: string, position: { top: number, left: number }) => void;
  onSelectionChange?: () => void;
  itemType: string;
  quizData?: string;
  onExamStateChange?: (inProgress: boolean) => void;
};

// Define the type for the ref handle
export type FilePreviewRef = PdfViewerRef;

const FilePreview = forwardRef<FilePreviewRef, FilePreviewProps>(({ itemId, url, mime, itemName, onPdfLoadSuccess, pdfScale, onPageChange, isFullscreen, currentPage, onTextSelect, onSelectionChange, itemType, quizData, onExamStateChange }, ref) => {
  const [content, setContent] = useState<string | Blob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [contentUrl, setContentUrl] = useState<string|null>(null);
  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  useEffect(() => {
    let objectUrl: string | null = null;
    let isCancelled = false;

    if (itemType === 'INTERACTIVE_QUIZ' || itemType === 'INTERACTIVE_EXAM' || itemType === 'INTERACTIVE_FLASHCARD') {
        setIsLoading(false);
        return;
    }

    const loadContent = async () => {
        if (!url) {
            setIsLoading(false);
            setContent(null);
            return;
        }
        setIsLoading(true);
        try {
            const blob = await contentService.getFileContent(url);
            if (isCancelled) return;

            if (mime === 'text/markdown') {
              const text = await blob.text();
              setContent(text);
            } else {
              objectUrl = URL.createObjectURL(blob);
              setContentUrl(objectUrl);
              setContent(blob);
            }
        } catch (error) {
            console.error("Error loading content for preview:", error);
            setContent(null);
        } finally {
            if (!isCancelled) {
                setIsLoading(false);
            }
        }
    };

    loadContent();

    return () => {
      isCancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [url, mime, itemType]);
  
  const handleSelectionEvent = useCallback((event: Event | React.TouchEvent | React.MouseEvent) => {
    if (!onTextSelect) return;

    // Use a small timeout to let the selection stabilize
    if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
    }
    
    // Prevent context menu on touch devices
    if (event.type === 'touchend') {
      event.preventDefault();
    }
    
    selectionTimeoutRef.current = setTimeout(() => {
        const selection = window.getSelection();
        const selectedText = selection?.toString().trim();
        
        if (selectedText) {
            const range = selection!.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            onTextSelect(selectedText, { top: rect.top, left: rect.left + rect.width / 2 });
        }
    }, 300);

  }, [onTextSelect]);


  const handleSelectionChange = useCallback(() => {
      if (!onTextSelect || !onSelectionChange) return;
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
          onSelectionChange();
      }
  }, [onTextSelect, onSelectionChange]);


  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    document.addEventListener('selectionchange', handleSelectionChange);
    container.addEventListener('mouseup', handleSelectionEvent);
    container.addEventListener('touchend', handleSelectionEvent);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      container.removeEventListener('mouseup', handleSelectionEvent);
      container.removeEventListener('touchend', handleSelectionEvent);
    };
  }, [handleSelectionChange, handleSelectionEvent]);


  if (isLoading) {
      return (
          <div className="w-full h-full flex items-center justify-center">
              <Skeleton className="h-[90%] w-[90%] rounded-lg" />
          </div>
      );
  }
  
  if (itemType === 'INTERACTIVE_QUIZ' || itemType === 'INTERACTIVE_EXAM' || itemType === 'INTERACTIVE_FLASHCARD') {
    if (!quizData) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-300 bg-slate-800/50 rounded-lg p-8">
                <p className="text-xl font-semibold mb-3">⚠️ Data Missing</p>
                <p className="text-base mb-4 text-slate-400">Could not load the interactive content data.</p>
            </div>
        );
    }
    try {
        const parsedData = JSON.parse(quizData);
        // Ensure lectures is always an array of Lecture objects
        const lectures: Lecture[] = Array.isArray(parsedData) 
            ? parsedData 
            : (parsedData && (parsedData.mcqs_level_1 || parsedData.mcqs_level_2 || parsedData.written || parsedData.flashcards)) 
                ? [parsedData] 
                : [];
        
        return (
             <div ref={containerRef} className="w-full h-full overflow-y-auto no-scrollbar selectable">
                {itemType === 'INTERACTIVE_QUIZ' && <QuizContainer lectures={lectures} />}
                {itemType === 'INTERACTIVE_EXAM' && <ExamContainer lectures={lectures} onStateChange={onExamStateChange} fileItemId={itemId} />}
                {itemType === 'INTERACTIVE_FLASHCARD' && <FlashcardContainer lectures={lectures} fileItemId={itemId} />}
            </div>
        );
    } catch (e) {
        console.error("Failed to parse quiz/exam data:", e);
        return (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-300 bg-slate-800/50 rounded-lg p-8">
                <p className="text-xl font-semibold mb-3">⚠️ Invalid Content Format</p>
                <p className="text-base mb-4 text-slate-400">The data is corrupted or in an incorrect format.</p>
            </div>
        );
    }
  }

  if (!content) {
       return (
        <div className="flex flex-col items-center justify-center h-full text-center text-slate-300 bg-slate-800/50 rounded-lg p-8">
            <p className="text-xl font-semibold mb-3">⚠️ Preview could not be loaded</p>
            <p className="text-base mb-4 text-slate-400">There was an error loading the file content. Check your network connection.</p>
            <a href={url} download={itemName} className="mt-4 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">Download File</a>
        </div>
      );
  }

  const commonProps = {
    className: cn('selectable'),
  };
  
  if (mime === 'application/pdf') {
    return (
        <div {...commonProps} ref={containerRef} className={cn(commonProps.className, 'w-full h-full')}>
            <PdfViewer 
                ref={ref} 
                file={contentUrl!} 
                onLoadSuccess={onPdfLoadSuccess} 
                scale={pdfScale} 
                onPageChange={onPageChange} 
                isFullscreen={isFullscreen} 
                currentPage={currentPage}
            />
        </div>
    );
  }

  if (mime === 'text/markdown') {
    return (
      <div 
        {...commonProps}
        ref={containerRef}
        className="prose prose-base max-w-full p-6 text-white selectable" 
        style={{
            '--tw-prose-body': '#E2E8F0',
            '--tw-prose-headings': '#FFFFFF',
            '--tw-prose-lead': '#A0AEC0',
            '--tw-prose-links': '#63B3ED',
            '--tw-prose-bold': '#FFFFFF',
            '--tw-prose-counters': '#A0AEC0',
            '--tw-prose-bullets': '#A0AEC0',
            '--tw-prose-hr': '#4A5568',
            '--tw-prose-quotes': '#A0AEC0',
            '--tw-prose-quote-borders': '#4A5568',
            '--tw-prose-captions': '#A0AEC0',
            '--tw-prose-code': '#E2E8F0',
            '--tw-prose-pre-code': '#E2E8F0',
            '--tw-prose-pre-bg': '#1A202C',
            '--tw-prose-th-borders': '#4A5568',
            '--tw-prose-td-borders': '#4A5568',
        } as React.CSSProperties}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content as string}</ReactMarkdown>
      </div>
    );
  }

  if (!contentUrl) {
    return (
        <div className="w-full h-full flex items-center justify-center">
          <Skeleton className="h-[90%] w-[90%] rounded-lg" />
        </div>
    );
  }

  if (mime?.startsWith('image/')) {
    return (
        <div {...commonProps} ref={containerRef} className={cn(commonProps.className, "w-full h-full overflow-auto flex items-center justify-center p-4 md:p-8")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={contentUrl} alt={itemName} className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
        </div>
    );
  }
  
  if (mime?.startsWith('audio/')) {
    return <div {...commonProps} ref={containerRef} className={cn(commonProps.className, "w-full h-full flex items-center justify-center p-4")}><audio controls src={contentUrl} className="w-full max-w-lg" /></div>;
  }
  
  if (mime?.startsWith('video/')) {
    return <div {...commonProps} ref={containerRef} className={cn(commonProps.className, "w-full h-full flex items-center justify-center bg-black")}><video controls src={contentUrl} className="max-w-full max-h-full" /></div>;
  }

  if (mime === 'text/html') {
    return <iframe ref={iframeRef} src={contentUrl} className={cn("w-full h-full border-2 border-slate-700 rounded-lg bg-white text-black shadow-lg", commonProps.className)} title={itemName} sandbox="allow-scripts allow-same-origin" />;
  }

  if (mime?.startsWith('text/')) {
    return <iframe ref={iframeRef} src={contentUrl} className={cn(commonProps.className, "w-full h-full border-2 border-slate-700 rounded-lg bg-slate-800 text-white shadow-lg")} title={itemName} />
  }

  // Use Office viewer for docx, xlsx, pptx if it's a public URL (won't work for blob URLs from local storage)
  if (url && !url.startsWith('blob:') && (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation')) {
    return <iframe src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`} className="w-full h-full border-0 rounded-lg shadow-2xl" title={itemName} />
  }
  
  return (
    <div className="flex flex-col items-center justify-center h-full text-center text-slate-300 bg-slate-800/50 rounded-lg p-8">
        <p className="text-xl font-semibold mb-3">⚠️ Preview not available</p>
        <p className="text-base mb-4 text-slate-400">Unsupported file type: <code className='bg-slate-900 px-2 py-1 rounded-md text-slate-300'>{mime}</code></p>
        <a href={url} download={itemName} className="mt-4 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700