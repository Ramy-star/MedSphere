
'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const options = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
};

const PdfViewer = ({ file, onLoadSuccess, scale, pageNumber: targetPageNumber, onPageChange }: { file: string, onLoadSuccess?: (pdf: PDFDocumentProxy) => void, scale: number, pageNumber: number, onPageChange?: (page: number) => void }) => {
  const [numPages, setNumPages] = useState<number>();
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const onDocumentLoadSuccessInternal = (loadedPdf: PDFDocumentProxy) => {
    setNumPages(loadedPdf.numPages);
    pageRefs.current = Array(loadedPdf.numPages).fill(null);
    if(onLoadSuccess) {
      onLoadSuccess(loadedPdf);
    }
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
        title: 'PDF RenderError',
        description: 'A page could not be displayed correctly.',
    });
  }, [toast]);

  // Scroll to page when targetPageNumber changes (from button clicks)
  useEffect(() => {
    if (targetPageNumber > 0 && targetPageNumber <= (numPages || 0)) {
        const pageElement = pageRefs.current[targetPageNumber - 1];
        if (pageElement) {
            pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
  }, [targetPageNumber, numPages]);

  // Intersection observer for scroll detection
  useEffect(() => {
    if (!onPageChange || !numPages || !containerRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter(e => e.isIntersecting);
        if (visibleEntries.length > 0) {
          // Find the entry with the highest intersection ratio
          const mostVisibleEntry = visibleEntries.reduce((prev, current) => {
            return prev.intersectionRatio > current.intersectionRatio ? prev : current;
          });
          const pageIndex = parseInt(mostVisibleEntry.target.getAttribute('data-page-index') || '0', 10);
          if (pageIndex + 1 !== targetPageNumber) {
            onPageChange(pageIndex + 1);
          }
        }
      },
      { 
        root: containerRef.current,
        threshold: Array.from({ length: 11 }, (_, i) => i * 0.1), // Create thresholds from 0.0 to 1.0
      }
    );

    const currentRefs = pageRefs.current;
    currentRefs.forEach(ref => {
      if (ref) observer.observe(ref);
    });

    return () => {
        currentRefs.forEach(ref => {
        if (ref) observer.unobserve(ref);
      });
    };
  }, [numPages, onPageChange, targetPageNumber]);


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
         {numPages && (
            <div className="flex flex-col items-center">
              {Array.from(new Array(numPages), (el, index) => (
                 <div
                    key={`page_container_${index + 1}`}
                    ref={el => pageRefs.current[index] = el}
                    data-page-index={index}
                    className="my-2"
                >
                    <Page
                        key={`page_${index + 1}`}
                        pageNumber={index + 1}
                        scale={scale}
                        onRenderError={onRenderError}
                        renderAnnotationLayer={false}
                        className="shadow-2xl"
                        loading={<Skeleton style={{ height: 1100 * scale, width: 850 * scale }} />}
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
