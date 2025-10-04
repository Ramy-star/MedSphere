
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
  const [pageDimensions, setPageDimensions] = useState<{width: number, height: number}[]>([]);
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);

  const onDocumentLoadSuccessInternal = useCallback(async (loadedPdf: PDFDocumentProxy) => {
    setPdfRef(loadedPdf);
    setNumPages(loadedPdf.numPages);
    
    const dims = [];
    for(let i=1; i <= loadedPdf.numPages; i++) {
        const page = await loadedPdf.getPage(i);
        const viewport = page.getViewport({ scale: 1 }); // Always get base dimensions
        dims.push({ width: viewport.width, height: viewport.height });
    }
    setPageDimensions(dims);

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
    estimateSize: (index) => (pageDimensions[index]?.height ?? 1000) * scale + 16,
    overscan: 2,
  });

  useEffect(() => {
    if (targetPageNumber > 0 && targetPageNumber <= numPages) {
        rowVirtualizer.scrollToIndex(targetPageNumber - 1, { align: 'start', smooth: true });
    }
  }, [targetPageNumber, numPages, rowVirtualizer]);

  useEffect(() => {
    const handleScroll = () => {
        if (!containerRef.current || rowVirtualizer.virtualItems.length === 0) return;
        
        const virtualItems = rowVirtualizer.virtualItems;
        const scrollOffset = containerRef.current.scrollTop;

        let visibleItem = virtualItems.find(item => {
            const itemTop = item.start;
            const itemBottom = item.start + item.size;
            return itemTop <= scrollOffset && itemBottom > scrollOffset;
        });

        if (visibleItem && onPageChange) {
            onPageChange(visibleItem.index + 1);
        }
    };
    
    const el = containerRef.current;
    el?.addEventListener('scroll', handleScroll, { passive: true });
    return () => el?.removeEventListener('scroll', handleScroll);

  }, [rowVirtualizer, onPageChange]);

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
          loading={<div className="p-4"><Skeleton className="h-[80vh] w-[80%]" /></div>}
          className="flex justify-center"
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
                              pdf={pdfRef}
                              pageNumber={virtualItem.index + 1}
                              scale={scale}
                              onRenderError={onRenderError}
                              renderAnnotationLayer={false}
                              className="shadow-2xl mb-4"
                              loading={<Skeleton style={{ height: (pageDimensions[virtualItem.index]?.height ?? 1000) * scale, width: (pageDimensions[virtualItem.index]?.width ?? 800) * scale }} />}
                          />
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
