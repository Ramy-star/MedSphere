'use client';
import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import { useVirtualizer } from '@tanstack/react-virtual';
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
  const [pageDimensions, setPageDimensions] = useState<{ width: number, height: number }[]>([]);
  const isMobile = useIsMobile();
  const [pdfProxy, setPdfProxy] = useState<PDFDocumentProxy | null>(null);
  
  const rowVirtualizer = useVirtualizer({
    count: numPages,
    getScrollElement: () => containerRef.current,
    estimateSize: (i) => (pageDimensions[i]?.height ?? 1000) + 8, // +8 for margin
    overscan: isMobile ? 1 : 2,
  });

  const computePageDimensions = useCallback(async (targetScale: number) => {
    if (!pdfProxy) return;
    try {
      const dims = await Promise.all(
        Array.from({ length: pdfProxy.numPages }, async (_, i) => {
          const page = await pdfProxy.getPage(i + 1);
          const vp = page.getViewport({ scale: targetScale });
          return { width: Math.ceil(vp.width), height: Math.ceil(vp.height) };
        })
      );
      setPageDimensions(dims);
      // Tell virtualizer to re-measure after state update
      setTimeout(() => {
        try { rowVirtualizer.measure(); } catch (e) { /* ignore if not yet mounted */ }
      }, 50);
    } catch (err) {
      console.error('Failed to compute page dimensions:', err);
    }
  }, [pdfProxy, rowVirtualizer]);

  const onDocumentLoadSuccessInternal = useCallback(async (loadedPdf: PDFDocumentProxy) => {
    setPdfProxy(loadedPdf);
    setNumPages(loadedPdf.numPages);

    await computePageDimensions(scale);

    if (onLoadSuccess) {
      onLoadSuccess(loadedPdf);
    }
  }, [onLoadSuccess, scale, computePageDimensions]);

  useEffect(() => {
    if (pdfProxy) {
      computePageDimensions(scale);
    }
  }, [scale, pdfProxy, computePageDimensions]);

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
        if (pageIndex < 0 || pageIndex >= numPages) return;

        // 1) Wait for page dimensions to be ready
        let tries = 0;
        while ((pageDimensions.length !== numPages) && tries < 40) { // ~2s max
            await new Promise(r => setTimeout(r, 50));
            tries++;
        }

        // 2) Ask the virtualizer to re-measure to ensure offsets are correct
        try { rowVirtualizer.measure(); } catch (e) { /* ignore if not yet mounted */ }

        // 3) Wait for the target DOM element to exist
        const container = containerRef.current;
        let el: HTMLElement | null = null;
        if (container) {
            let waitTries = 0;
            while (waitTries < 20) { // ~1s max wait
                el = container.querySelector<HTMLElement>(`[data-index="${pageIndex}"]`);
                if (el) break;
                await new Promise(r => setTimeout(r, 50));
                waitTries++;
            }
        }

        // 4) If the element is found, use precise offsetTop scrolling. Otherwise, fall back to virtualizer's method.
        if (el && container) {
            container.scrollTo({ top: el.offsetTop, behavior: 'auto' });
        } else {
            rowVirtualizer.scrollToIndex(pageIndex, { align: 'start', behavior: 'auto' });
        }
    },
  }));

  const virtualItems = rowVirtualizer.getVirtualItems();

  const handleScroll = useCallback(() => {
    if (!onPageChange || !containerRef.current || virtualItems.length === 0 || !scrollListenerEnabled) return;

    const container = containerRef.current;
    
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
      if (virtualItem.start >= scrollTop - 10) { // 10px tolerance from top
        topmostVisibleIndex = virtualItem.index;
        break;
      }
    }
    
    if (topmostVisibleIndex !== -1) {
      onPageChange(topmostVisibleIndex + 1);
    } else if (virtualItems.length > 0) {
      const lastVirtualItem = virtualItems[virtualItems.length - 1];
      if (scrollTop > lastVirtualItem.start) {
        onPageChange(lastVirtualItem.index + 1);
      }
    }
  }, [virtualItems, onPageChange, numPages, scrollListenerEnabled]);

  useEffect(() => {
      const container = containerRef.current;
      if (!container) return;
  
      const scrollDebounceTimeout = 100;
      let scrollTimeout: NodeJS.Timeout | null = null;
      
      const debouncedScrollHandler = () => {
          if(scrollTimeout) clearTimeout(scrollTimeout);
          scrollTimeout = setTimeout(handleScroll, scrollDebounceTimeout);
      };

      container.addEventListener('scroll', debouncedScrollHandler, { passive: true });
      
      // Initial call
      handleScroll();

      return () => {
        container.removeEventListener('scroll', debouncedScrollHandler);
        if(scrollTimeout) clearTimeout(scrollTimeout);
      };
  }, [handleScroll]);

  // SINGLE PAGE FULLSCREEN VIEW
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

  // MULTI-PAGE SCROLLABLE VIEW (Normal mode)
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
          {numPages > 0 && pageDimensions.length === numPages && (
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
                          <div className="mb-2">
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
