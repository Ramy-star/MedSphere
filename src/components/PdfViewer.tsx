'use client';
import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef, Children } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';


pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;


const options = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
};

type PdfViewerProps = {
  file: string;
  onLoadSuccess?: (pdf: PDFDocumentProxy) => void;
  scale: number;
  onPageChange?: (page: number) => void;
  scrollListenerEnabled: boolean;
  setScrollListenerEnabled: (enabled: boolean) => void;
  isFullscreen?: boolean;
  currentPage?: number;
};

export type PdfViewerRef = {
  scrollToPage: (page: number) => Promise<void>;
};

const PdfViewer = forwardRef<PdfViewerRef, PdfViewerProps>(({ file, onLoadSuccess, scale, onPageChange, scrollListenerEnabled, setScrollListenerEnabled, isFullscreen, currentPage }, ref) => {
  const [numPages, setNumPages] = useState<number>(0);
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const onDocumentLoadSuccessInternal = useCallback(async (loadedPdf: PDFDocumentProxy) => {
    setNumPages(loadedPdf.numPages);
    if (onLoadSuccess) {
      onLoadSuccess(loadedPdf);
    }
  }, [onLoadSuccess]);


  function onDocumentLoadError(error: Error) {
    if (error.message.includes('API version') && error.message.includes('Worker version')) {
        return;
    }
    console.error('Error loading PDF:', error);
    toast({
      variant: 'destructive',
      title: 'Error loading PDF',
      description: 'The file could not be loaded. It may be corrupted or in an unsupported format.',
    });
  }

  const onRenderError = useCallback((error: Error) => {
    if (error.name === 'AbortException' || error.message.includes('TextLayer task cancelled')) {
        return; 
    }
    console.error('Failed to render PDF page:', error);
    toast({
        variant: 'destructive',
        title: 'PDF Render Error',
        description: 'A page could not be displayed correctly.',
    });
  }, [toast]);


  useImperativeHandle(ref, () => ({
    scrollToPage: async (page: number) => {
        const pageIndex = page - 1;
        if (!containerRef.current || pageIndex < 0 || pageIndex >= numPages) return;

        const container = containerRef.current;
        const pageElement = container.querySelector(`[data-page-number="${page}"]`);

        if (pageElement) {
            container.scrollTo({
                top: (pageElement as HTMLElement).offsetTop - container.offsetTop,
                behavior: 'auto'
            });
        }
    },
  }));

  const handleScroll = useCallback(() => {
    if (!onPageChange || !containerRef.current || !scrollListenerEnabled || numPages === 0) return;

    const container = containerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;
    
    // Check if scrolled to the very bottom
    if (scrollHeight > 0 && scrollTop + clientHeight >= scrollHeight - 10) {
      onPageChange(numPages);
      return;
    }

    const pageElements = Array.from(container.querySelectorAll('[data-page-number]'));
    let bestVisiblePage = 1;
    let maxVisibleRatio = 0;

    for (const el of pageElements) {
        const pageNumber = parseInt(el.getAttribute('data-page-number') || '0', 10);
        const rect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        const visibleHeight = Math.max(0, Math.min(rect.bottom, containerRect.bottom) - Math.max(rect.top, containerRect.top));
        const visibleRatio = visibleHeight / rect.height;

        if (visibleRatio > maxVisibleRatio) {
            maxVisibleRatio = visibleRatio;
            bestVisiblePage = pageNumber;
        }
    }
    
    onPageChange(bestVisiblePage);
  }, [onPageChange, numPages, scrollListenerEnabled]);

  useEffect(() => {
      const container = containerRef.current;
      if (!container || isFullscreen) return; // Don't attach scroll listener in fullscreen
  
      const scrollDebounceTimeout = 100;
      let scrollTimeout: NodeJS.Timeout | null = null;
      
      const debouncedScrollHandler = () => {
          if(scrollTimeout) clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(handleScroll, scrollDebounceTimeout);
      };

      container.addEventListener('scroll', debouncedScrollHandler, { passive: true });
      
      handleScroll();

      return () => {
        container.removeEventListener('scroll', debouncedScrollHandler);
        if(scrollTimeout) clearTimeout(scrollTimeout);
      };
  }, [handleScroll, isFullscreen]);

  if (isFullscreen) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccessInternal}
          onLoadError={onDocumentLoadError}
          options={options}
          loading={<Skeleton className="h-[80vh] w-[80%]" />}
        >
          <Page
            pageNumber={currentPage || 1}
            scale={scale}
            onRenderError={onRenderError}
            renderAnnotationLayer={false}
            renderTextLayer={false}
            className="shadow-2xl"
          />
        </Document>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center">
      <div 
        ref={containerRef} 
        className="w-full h-full overflow-y-auto"
      >
        <Document
            file={file}
            onLoadSuccess={onDocumentLoadSuccessInternal}
            onLoadError={onDocumentLoadError}
            options={options}
            loading={<div className="p-4 w-full flex justify-center"><Skeleton className="h-[80vh] w-[80%]" /></div>}
            className="flex justify-center"
        >
           <div className="flex flex-col items-center gap-4 py-4">
              {Array.from(new Array(numPages), (el, index) => (
                 <div key={`page_${index + 1}`} data-page-number={index + 1}>
                    <Page
                        pageNumber={index + 1}
                        scale={scale}
                        onRenderError={onRenderError}
                        renderAnnotationLayer={false}
                        loading={<Skeleton style={{ height: (1122 * scale), width: (794 * scale) }} />}
                    />
                 </div>
              ))}
           </div>
        </Document>
      </div>
    </div>
  );
});

PdfViewer.displayName = 'PdfViewer';

export default PdfViewer;
