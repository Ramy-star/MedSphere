'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import { useVirtualizer } from '@tanstack/react-virtual';

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const options = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
};

const PdfViewer = ({ file, onLoadSuccess, scale, pageNumber: targetPageNumber, onPageChange }: { file: string, onLoadSuccess?: (pdf: PDFDocumentProxy) => void, scale: number, pageNumber: number, onPageChange?: (page: number) => void }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pdfRef, setPdfRef] = useState<PDFDocumentProxy | null>(null);
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageDimensions, setPageDimensions] = useState<{ width: number, height: number } | null>(null);

  const onDocumentLoadSuccessInternal = useCallback(async (loadedPdf: PDFDocumentProxy) => {
    setPdfRef(loadedPdf);
    setNumPages(loadedPdf.numPages);
    
    // Get dimensions of the first page to estimate the size of others
    const page = await loadedPdf.getPage(1);
    const viewport = page.getViewport({ scale });
    setPageDimensions({ width: viewport.width, height: viewport.height });

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
    // AbortException is common on fast scrolling and can be ignored.
    if (error.name === 'AbortException' || (error.message && error.message.includes('TextLayer task cancelled'))) {
        return; 
    }
    console.error('Failed to render PDF page:', error);
    toast({
        variant: 'destructive',
        title: 'PDF RenderError',
        description: 'A page could not be displayed correctly.',
    });
  }, [toast]);


  const rowVirtualizer = useVirtualizer({
    count: numPages,
    getScrollElement: () => containerRef.current,
    estimateSize: () => (pageDimensions?.height ?? 1000) + 16, // page height + margin
    overscan: 5,
  });

  useEffect(() => {
    if (targetPageNumber > 0 && targetPageNumber <= numPages) {
       rowVirtualizer.scrollToIndex(targetPageNumber - 1, { align: 'start', smooth: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetPageNumber]);


  const handleScroll = useCallback(() => {
    if (!rowVirtualizer.virtualItems || rowVirtualizer.virtualItems.length === 0 || !containerRef.current) return;

    // Find the item that is closest to the center of the viewport
    let bestMatch = null;
    let smallestDistance = Infinity;
    const viewportCenter = containerRef.current.scrollTop + containerRef.current.clientHeight / 2;

    for (const item of rowVirtualizer.virtualItems) {
        const itemCenter = item.start + item.size / 2;
        const distance = Math.abs(viewportCenter - itemCenter);
        if (distance < smallestDistance) {
            smallestDistance = distance;
            bestMatch = item;
        }
    }
    
    if (bestMatch && onPageChange) {
      onPageChange(bestMatch.index + 1);
    }
  }, [rowVirtualizer.virtualItems, onPageChange]);


  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

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
            {pageDimensions && (
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
                                    loading={<Skeleton style={{ height: pageDimensions.height, width: pageDimensions.width }} />}
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
};

export default PdfViewer;
