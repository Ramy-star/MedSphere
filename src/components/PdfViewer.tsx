'use client';
import { useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useDebounce } from 'use-debounce';

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
};

const PdfViewer = forwardRef(({ file, onLoadSuccess, scale, onPageChange }: PdfViewerProps, ref) => {
  const [numPages, setNumPages] = useState<number>(0);
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageDimensions, setPageDimensions] = useState<{ width: number, height: number }[]>([]);
  
  const onDocumentLoadSuccessInternal = useCallback(async (loadedPdf: PDFDocumentProxy) => {
    setNumPages(loadedPdf.numPages);
    
    const allPageDimensions = await Promise.all(
        Array.from({ length: loadedPdf.numPages }, async (_, i) => {
            const page = await loadedPdf.getPage(i + 1);
            const viewport = page.getViewport({ scale });
            return { width: viewport.width, height: viewport.height };
        })
    );

    setPageDimensions(allPageDimensions);

    if (onLoadSuccess) {
      onLoadSuccess(loadedPdf);
    }
  }, [onLoadSuccess, scale]);

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
    overscan: 5,
  });

  useImperativeHandle(ref, () => ({
    scrollTo: (page: number) => {
      if (page > 0 && page <= numPages) {
        rowVirtualizer.scrollToIndex(page - 1, { align: 'start' });
      }
    }
  }));

  const [debouncedVirtualizer] = useDebounce(rowVirtualizer.getVirtualItems(), 100);

  useEffect(() => {
    if (!onPageChange || !containerRef.current) return;
    
    const virtualItems = debouncedVirtualizer;
    if (!virtualItems || virtualItems.length === 0) return;

    const viewportCenter = (containerRef.current.scrollTop + containerRef.current.clientHeight / 2);

    let bestMatch = null;
    let smallestDistance = Infinity;

    for (const item of virtualItems) {
      const itemCenter = item.start + item.size / 2;
      const distance = Math.abs(viewportCenter - itemCenter);
      if (distance < smallestDistance) {
        smallestDistance = distance;
        bestMatch = item;
      }
    }
    
    if (bestMatch) {
      const currentPage = bestMatch.index + 1;
      onPageChange(currentPage);
    }
  }, [debouncedVirtualizer, onPageChange]);

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
                  {rowVirtualizer.getVirtualItems().map((virtualItem) => (
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
