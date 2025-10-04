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
  const [pageDimensions, setPageDimensions] = useState<{width: number, height: number}[]>([]);
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  const onDocumentLoadSuccessInternal = async (loadedPdf: PDFDocumentProxy) => {
    setNumPages(loadedPdf.numPages);
    
    // Pre-fetch all page dimensions
    const dims = [];
    for(let i=1; i <= loadedPdf.numPages; i++) {
        const page = await loadedPdf.getPage(i);
        const viewport = page.getViewport({ scale });
        dims.push({ width: viewport.width, height: viewport.height });
    }
    setPageDimensions(dims);

    if (onLoadSuccess) {
      onLoadSuccess(loadedPdf);
    }
  };

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
        title: 'PDF RenderError',
        description: 'A page could not be displayed correctly.',
    });
  }, [toast]);
  
  // Use TanStack Virtualizer
  const rowVirtualizer = useVirtualizer({
    count: numPages,
    getScrollElement: () => containerRef.current,
    estimateSize: (index) => (pageDimensions[index]?.height ?? 1000) + 16, // height + margin
    overscan: 2,
  });

  // Effect for programmatic scrolling when arrow buttons are clicked
  useEffect(() => {
    if (targetPageNumber > 0 && targetPageNumber <= numPages) {
        rowVirtualizer.scrollToIndex(targetPageNumber - 1, { align: 'start', smooth: false });
    }
  }, [targetPageNumber, numPages, rowVirtualizer]);

  // Effect for updating page number on manual scroll
  useEffect(() => {
    const handleScroll = () => {
        if (!containerRef.current || rowVirtualizer.virtualItems.length === 0) return;
        
        const scrollOffset = containerRef.current.scrollTop;
        const virtualItems = rowVirtualizer.virtualItems;
        
        // Find the topmost visible item
        let topVisibleIndex = -1;
        for (const virtualItem of virtualItems) {
            if (virtualItem.start >= scrollOffset) {
                topVisibleIndex = virtualItem.index;
                break;
            }
        }
        // If scrolled past all items, it's the last one
        if (topVisibleIndex === -1 && virtualItems.length > 0) {
            topVisibleIndex = virtualItems[virtualItems.length - 1].index;
        }

        if (topVisibleIndex !== -1 && onPageChange) {
            onPageChange(topVisibleIndex + 1);
        }
    };
    
    const el = containerRef.current;
    el?.addEventListener('scroll', handleScroll, { passive: true });
    return () => el?.removeEventListener('scroll', handleScroll);

  }, [rowVirtualizer.virtualItems, onPageChange, rowVirtualizer]);


  return (
    <div className="w-full h-full flex flex-col items-center">
      <Document
        file={file}
        onLoadSuccess={onDocumentLoadSuccessInternal}
        onLoadError={onDocumentLoadError}
        options={options}
        loading={<div className="p-4"><Skeleton className="h-[80vh] w-full" /></div>}
        className="hidden" // The Document component itself doesn't render anything visible here
      >
        {/* We render pages inside the virtualized container */}
      </Document>
      <div 
        ref={containerRef} 
        className="w-full h-full overflow-y-auto"
      >
        {numPages > 0 && pageDimensions.length === numPages && (
            <div
                style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                }}
            >
                {rowVirtualizer.getVirtualItems().map((virtualItem) => (
                    <div
                        key={virtualItem.key}
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
                        <Page
                            pageNumber={virtualItem.index + 1}
                            scale={scale}
                            onRenderError={onRenderError}
                            renderAnnotationLayer={false}
                            className="shadow-2xl"
                            loading={<Skeleton style={{ height: (pageDimensions[virtualItem.index]?.height ?? 1000) + 16, width: pageDimensions[virtualItem.index]?.width ?? 800 }} />}
                        />
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};

export default PdfViewer;
