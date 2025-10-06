'use client';
import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import { useVirtualizer, Virtualizer } from '@tanstack/react-virtual';
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
};

export type PdfViewerRef = {
  scrollToPage: (page: number) => void;
  rowVirtualizer: Virtualizer<HTMLDivElement, Element> | null;
};

const PdfViewer = forwardRef<PdfViewerRef, PdfViewerProps>(({ file, onLoadSuccess, scale, onPageChange, scrollListenerEnabled, setScrollListenerEnabled }, ref) => {
  const [numPages, setNumPages] = useState<number>(0);
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageDimensions, setPageDimensions] = useState<{ width: number, height: number }[]>([]);
  const isMobile = useIsMobile();
  const [pdfProxy, setPdfProxy] = useState<PDFDocumentProxy | null>(null);
  
  const onDocumentLoadSuccessInternal = useCallback(async (loadedPdf: PDFDocumentProxy) => {
    setPdfProxy(loadedPdf);
    setNumPages(loadedPdf.numPages);
    
    // Estimate dimensions for all pages for the virtualizer
    const allPageDimensions = await Promise.all(
        Array.from({ length: loadedPdf.numPages }, async (_, i) => {
            try {
                const page = await loadedPdf.getPage(i + 1);
                const viewport = page.getViewport({ scale });
                return { width: viewport.width, height: viewport.height };
            } catch (e) {
                // If a page fails to load, use a default height
                console.error(`Failed to get page ${i+1} dimensions`, e);
                return { width: 800 * scale, height: 1000 * scale };
            }
        })
    );

    setPageDimensions(allPageDimensions);

    if (onLoadSuccess) {
      onLoadSuccess(loadedPdf);
    }
  }, [onLoadSuccess, scale]);

  function onDocumentLoadError(error: Error) {
    // This warning is frequent and not critical, related to worker version mismatches.
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
    // This is a common, non-critical warning when scrolling fast.
    // It happens when react-pdf cancels a render task for a page that's no longer in view.
    if (error.name === 'AbortException' || (error.message && error.message.includes('TextLayer task cancelled'))) {
        return; 
    }
    console.error('Failed to render PDF page:', error);
    toast({
        variant: 'destructive',
        title: 'PDF Render Error',
        description: 'A page could not be displayed correctly.',
    });
  }, [toast]);

  const rowVirtualizer = useVirtualizer({
    count: numPages,
    getScrollElement: () => containerRef.current,
    estimateSize: (i) => (pageDimensions[i]?.height ?? 1000) + 16, // +16 for margin
    overscan: isMobile ? 1 : 2,
  });

  useImperativeHandle(ref, () => ({
    scrollToPage: (page: number) => {
      const pageIndex = page - 1;
      if (pageIndex >= 0 && pageIndex < numPages) {
        rowVirtualizer.scrollToIndex(pageIndex, { align: 'start', behavior: 'auto' });
      }
    },
    rowVirtualizer: rowVirtualizer
  }));

  const virtualItems = rowVirtualizer.getVirtualItems();

  useEffect(() => {
    const container = containerRef.current;
    if (!onPageChange || !container || virtualItems.length === 0) return;
  
    const handleScroll = () => {
        if (!scrollListenerEnabled) return;

      // Check if scrolled to the very bottom
      if (container.scrollHeight > 0 && container.scrollTop + container.clientHeight >= container.scrollHeight - 10) { // 10px tolerance
        if (numPages > 0) {
          onPageChange(numPages);
        }
        return;
      }
  
      // Find the topmost visible item in the viewport
      let topmostVisibleIndex = -1;
      const { scrollTop } = container;
  
      for (const virtualItem of virtualItems) {
        // Find the first item whose starting point is at or just below the top of the viewport
        if (virtualItem.start >= scrollTop - 10) { // 10px tolerance from top
          topmostVisibleIndex = virtualItem.index;
          break;
        }
      }
      
      if (topmostVisibleIndex !== -1) {
        onPageChange(topmostVisibleIndex + 1);
      } else if (virtualItems.length > 0) {
        // Fallback if no item is found (e.g., scrolled past the last item's start)
        const lastVirtualItem = virtualItems[virtualItems.length - 1];
        if (scrollTop > lastVirtualItem.start) {
          onPageChange(lastVirtualItem.index + 1);
        }
      }
    };
  
    // Run once on initial render
    handleScroll();
  
    const scrollDebounceTimeout = 100;
    let scrollTimeout: NodeJS.Timeout | null = null;
    const debouncedScrollHandler = () => {
        if(scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(handleScroll, scrollDebounceTimeout);
    };

    container.addEventListener('scroll', debouncedScrollHandler, { passive: true });
    return () => {
      container.removeEventListener('scroll', debouncedScrollHandler);
      if(scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, [virtualItems, onPageChange, numPages, scrollListenerEnabled]);


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
          {numPages > 0 && pageDimensions.length > 0 && (
              <div
                  style={{
                      height: `${rowVirtualizer.getTotalSize()}px`,
                      width: '100%',
                      position: 'relative',
                  }}
                  className="flex justify-center"
              >
                  {virtualItems.map((virtualItem) => (
                      <div
                          key={virtualItem.key}
                          data-index={virtualItem.index}
                          ref={rowVirtualizer.measureElement}
                          style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              transform: `translateY(${virtualItem.start}px)`,
                              display: 'flex',
                              justifyContent: 'center'
                          }}
                      >
                          <div className="mb-4">
                              <Page
                                  pageNumber={virtualItem.index + 1}
                                  scale={scale}
                                  onRenderError={onRenderError}
                                  renderAnnotationLayer={false}
                                  className="shadow-2xl"
                                  loading={<Skeleton style={{ height: pageDimensions[virtualItem.index]?.height || 1000, width: pageDimensions[virtualItem.index]?.width || 800 }} />}
                              />
                          </div>
                      </div>
                  ))}
              </div>
          )}
        </Document>
      </div>
    </div>
  );
});

PdfViewer.displayName = 'PdfViewer';

export default PdfViewer;
