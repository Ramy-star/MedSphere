'use client';
import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useDebounce } from 'use-debounce';

// Explicitly set the worker source
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;


const options = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@3.11.174/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@3.11.174/standard_fonts/`,
};

type PdfViewerProps = {
  file: string;
  onLoadSuccess?: (pdf: PDFDocumentProxy) => void;
  scale: number;
  onPageChange?: (page: number) => void;
  isFullscreen?: boolean;
  currentPage?: number;
};

export type PdfViewerRef = {
  scrollToPage: (page: number) => void;
};

const PdfViewer = forwardRef<PdfViewerRef, PdfViewerProps>(({ file, onLoadSuccess, scale, onPageChange, isFullscreen, currentPage }, ref) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number }[]>([]);
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  const [debouncedScale] = useDebounce(scale, 100);

  const onDocumentLoadSuccessInternal = useCallback(async (loadedPdf: PDFDocumentProxy) => {
    setNumPages(loadedPdf.numPages);
    if (onLoadSuccess) {
      onLoadSuccess(loadedPdf);
    }
    const dims: { width: number; height: number }[] = [];
    for (let i = 1; i <= loadedPdf.numPages; i++) {
      const page = await loadedPdf.getPage(i);
      dims.push({ width: page.view[2], height: page.view[3] });
    }
    setPageDimensions(dims);
  }, [onLoadSuccess]);

  const rowVirtualizer = useVirtualizer({
    count: numPages,
    getScrollElement: () => containerRef.current,
    estimateSize: (index) => (pageDimensions[index] ? pageDimensions[index].height * debouncedScale : 1000),
    overscan: 3,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  useEffect(() => {
    if (!onPageChange || !virtualItems.length) return;

    let middleVisibleIndex = 0;
    if (virtualItems.length > 0 && containerRef.current) {
        const viewportTop = containerRef.current.scrollTop;
        const viewportBottom = viewportTop + containerRef.current.clientHeight;

        for (const virtualItem of virtualItems) {
            const itemTop = virtualItem.start;
            const itemBottom = itemTop + virtualItem.size;

            if (itemTop < viewportBottom && itemBottom > viewportTop) {
                // This item is at least partially visible
                const visibleHeight = Math.min(itemBottom, viewportBottom) - Math.max(itemTop, viewportTop);
                if (visibleHeight > 0) { // Check if it's the most visible one
                     middleVisibleIndex = virtualItem.index;
                     break;
                }
            }
        }
    }
    onPageChange(middleVisibleIndex + 1);

  }, [virtualItems, onPageChange]);

  useImperativeHandle(ref, () => ({
    scrollToPage: (page: number) => {
      rowVirtualizer.scrollToIndex(page - 1, { align: 'start', behavior: 'smooth' });
    },
  }));

  function onDocumentLoadError(error: Error) {
    if (error.message.includes('API version') && error.message.includes('Worker version')) return;
    console.error('Error loading PDF:', error);
    toast({ variant: 'destructive', title: 'Error loading PDF', description: 'The file could not be loaded.' });
  }

  const onRenderError = useCallback((error: Error) => {
    if (error.name === 'AbortException' || error.message.includes('TextLayer task cancelled')) return;
    console.error('Failed to render PDF page:', error);
    toast({ variant: 'destructive', title: 'PDF Render Error', description: 'A page could not be displayed correctly.' });
  }, [toast]);


  if (isFullscreen) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black">
        <Document file={file} onLoadSuccess={onDocumentLoadSuccessInternal} onLoadError={onDocumentLoadError} options={options} loading={<Skeleton className="h-[80vh] w-[80%]" />}>
          <Page pageNumber={currentPage || 1} scale={scale} onRenderError={onRenderError} renderAnnotationLayer={false} renderTextLayer={true} className="shadow-2xl fullscreen:object-contain" />
        </Document>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
      <Document file={file} onLoadSuccess={onDocumentLoadSuccessInternal} onLoadError={onDocumentLoadError} options={options} loading={<div className="p-4 w-full flex justify-center"><Skeleton className="h-[80vh] w-[80%]" /></div>}>
        {numPages > 0 && pageDimensions.length > 0 && (
          <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
            {virtualItems.map((virtualItem) => {
              const pageIndex = virtualItem.index;
              const pageNumber = pageIndex + 1;
              return (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={rowVirtualizer.measureElement}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${virtualItem.start}px)` }}
                  className="flex justify-center w-full"
                >
                  <div className="shadow-lg" style={{ marginBottom: '4px' }}>
                    <Page
                      pageNumber={pageNumber}
                      scale={debouncedScale}
                      onRenderError={onRenderError}
                      renderAnnotationLayer={true}
                      renderTextLayer={true}
                      loading={<Skeleton style={{ height: pageDimensions[pageIndex]?.height * debouncedScale || 1000, width: pageDimensions[pageIndex]?.width * debouncedScale || 700 }} />}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Document>
    </div>
  );
});

PdfViewer.displayName = 'PdfViewer';
export default PdfViewer;
