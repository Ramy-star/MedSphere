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
  const [numPages, setNumPages] = useState<number>(0);
  const [pdfRef, setPdfRef] = useState<PDFDocumentProxy | null>(null);
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const onDocumentLoadSuccessInternal = useCallback(async (loadedPdf: PDFDocumentProxy) => {
    setPdfRef(loadedPdf);
    setNumPages(loadedPdf.numPages);
    pageRefs.current = Array(loadedPdf.numPages).fill(null).map((_, i) => pageRefs.current[i] || null);
    
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

  useEffect(() => {
    if (targetPageNumber > 0 && targetPageNumber <= numPages) {
        const pageElement = pageRefs.current[targetPageNumber - 1];
        if (pageElement) {
            pageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
  }, [targetPageNumber, numPages]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageNum = parseInt(entry.target.getAttribute('data-page-number') || '0', 10);
            if (pageNum && onPageChange) {
              onPageChange(pageNum);
            }
          }
        });
      },
      {
        root: containerRef.current,
        rootMargin: '-50% 0px -50% 0px', // Trigger when page is in the middle of the viewport
        threshold: 0,
      }
    );

    const currentRefs = pageRefs.current;
    currentRefs.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      currentRefs.forEach((ref) => {
        if (ref) observer.unobserve(ref);
      });
    };
  }, [numPages, onPageChange]);

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
            <div className="flex flex-col items-center">
              {Array.from(new Array(numPages), (el, index) => (
                <div
                  key={`page_container_${index + 1}`}
                  ref={(el) => (pageRefs.current[index] = el)}
                  data-page-number={index + 1}
                >
                  <Page
                    key={`page_${index + 1}`}
                    pageNumber={index + 1}
                    scale={scale}
                    onRenderError={onRenderError}
                    renderAnnotationLayer={false}
                    className="shadow-2xl mb-4"
                    loading={<Skeleton style={{ height: 1000 * scale, width: 800 * scale }} />}
                  />
                </div>
              ))}
            </div>
        </Document>
      </div>
    </div>
  );
};

export default PdfViewer;
