'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Skeleton } from './ui/skeleton';

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const options = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
};

const PdfViewer = ({ file, onLoadSuccess, scale, pageNumber: targetPageNumber }: { file: string, onLoadSuccess?: (pdf: PDFDocumentProxy) => void, scale: number, pageNumber: number }) => {
  const [numPages, setNumPages] = useState<number>();
  const [pageDimensions, setPageDimensions] = useState<{ width: number, height: number }[]>([]);
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [initialScale, setInitialScale] = useState(1);

  const rowVirtualizer = useVirtualizer({
    count: numPages || 0,
    getScrollElement: () => containerRef.current,
    estimateSize: (index) => pageDimensions[index]?.height * scale + 16 || 1000,
    overscan: 2,
  });

  const onDocumentLoadSuccessInternal = async (loadedPdf: PDFDocumentProxy) => {
    setNumPages(loadedPdf.numPages);
    if(onLoadSuccess) {
      onLoadSuccess(loadedPdf);
    }
    
    const dims = await Promise.all(
        Array.from({ length: loadedPdf.numPages }, (_, i) => loadedPdf.getPage(i + 1))
            .map(p => p.then(page => ({ width: page.view[2], height: page.view[3] })))
    );
    setPageDimensions(dims);

    setTimeout(() => {
        if (containerRef.current && dims[0]) {
            if (isMobile) {
                const containerWidth = containerRef.current.clientWidth - 32; // padding
                const pageOriginalWidth = dims[0].width;
                setInitialScale(containerWidth / pageOriginalWidth);
            } else {
                setInitialScale(1); 
            }
        }
    }, 100);
  }

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
  
  useEffect(() => {
    if(targetPageNumber > 0 && targetPageNumber <= (numPages || 0)) {
        rowVirtualizer.scrollToIndex(targetPageNumber - 1, { align: 'start' });
    }
  }, [targetPageNumber, numPages, rowVirtualizer]);


  const virtualItems = rowVirtualizer.getVirtualItems();
  
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
          loading={<div className="p-4"><Skeleton className="h-[80vh] w-full" /></div>}
          className="flex justify-center"
        >
         {numPages && pageDimensions.length > 0 && (
           <div
              className="relative w-full"
              style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
            >
              {virtualItems.map((virtualRow) => {
                 const pageDim = pageDimensions[virtualRow.index];
                 const width = pageDim ? pageDim.width * scale : 'auto';
                 
                 return (
                    <div
                      key={virtualRow.key}
                      data-index={virtualRow.index}
                      ref={rowVirtualizer.measureElement}
                      className="absolute top-0 left-0 w-full"
                      style={{
                        transform: `translateY(${virtualRow.start}px)`,
                        padding: '8px 0',
                      }}
                    >
                      <div className="mx-auto" style={{ width: `${width}px`}}>
                          <Page
                            key={`page_${virtualRow.index + 1}`}
                            pageNumber={virtualRow.index + 1}
                            scale={scale}
                            onRenderError={onRenderError}
                            renderAnnotationLayer={false}
                            className="shadow-2xl"
                            loading={<Skeleton style={{ height: virtualRow.size - 16, width: width }} />}
                          />
                      </div>
                    </div>
                )
              })}
           </div>
         )}
        </Document>
      </div>
    </div>
  );
};

export default PdfViewer;
