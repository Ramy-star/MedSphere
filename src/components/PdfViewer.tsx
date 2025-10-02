'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs, type PDFDocumentProxy } from 'react-pdf';
import { Button } from './ui/button';
import { Minus, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';


pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;


const options = {
  cMapUrl: '/cmaps/',
  standardFontDataUrl: '/standard_fonts/',
};

const MAX_ZOOM = 3;
const MIN_ZOOM = 0.2;
const ZOOM_STEP = 0.05;

const PdfViewer = ({ file, onLoadSuccess }: { file: string, onLoadSuccess?: (pdf: PDFDocumentProxy) => void }) => {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState(1);
  const isMobile = useIsMobile();
  const [scale, setScale] = useState(isMobile ? 0.25 : 1);
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const devicePixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio : 1;

  function onDocumentLoadSuccessInternal(loadedPdf: PDFDocumentProxy): void {
    setNumPages(loadedPdf.numPages);
    if(onLoadSuccess) {
      onLoadSuccess(loadedPdf);
    }
  }

  function onDocumentLoadError(error: Error) {
    console.error('Error loading PDF:', error);
    toast({
      variant: 'destructive',
      title: 'Error loading PDF',
      description: 'The file could not be loaded. It may be corrupted or in an unsupported format.',
    });
  }

  const onRenderError = (error: Error) => {
    if (error.name === 'AbortException' || error.message.includes('TextLayer task cancelled')) {
        // This error is expected when the user scrolls quickly or closes the modal.
        // We can safely ignore it.
        return;
    }
    console.error('Failed to render PDF page:', error);
    toast({
        variant: 'destructive',
        title: 'PDF Render Error',
        description: 'A page could not be displayed correctly.',
    });
  }

  useEffect(() => {
    setScale(isMobile ? 0.25 : 1);
  }, [isMobile]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const page = entry.target.getAttribute('data-page-number');
            if (page) {
              setPageNumber(parseInt(page, 10));
            }
          }
        });
      },
      { root: containerRef.current, threshold: 0.5 }
    );

    const pageElements = document.querySelectorAll('[data-page-number]');
    pageElements.forEach((el) => observer.observe(el));

    return () => {
      pageElements.forEach((el) => observer.unobserve(el));
    };
  }, [numPages]);

  const goToPage = (page: number) => {
    const pageElement = document.querySelector(`[data-page-number="${page}"]`);
    if (pageElement) {
        pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setPageNumber(page);
  }
  
  const zoomIn = () => setScale(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  const zoomOut = () => setScale(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM));

  return (
    <div className="w-full h-full flex flex-col items-center justify-start">
      <div ref={containerRef} className="flex-1 w-full overflow-auto">
        <div className="flex justify-center items-start min-h-full">
            <Document
              file={file}
              onLoadSuccess={onDocumentLoadSuccessInternal}
              onLoadError={onDocumentLoadError}
              options={options}
              className="flex flex-col items-center"
            >
              {Array.from({ length: numPages || 0 }, (_, i) => i + 1).map((page) => (
                  <div key={`page_${page}`} className="mb-4" data-page-number={page}>
                    <Page 
                      pageNumber={page} 
                      scale={scale * devicePixelRatio}
                      renderTextLayer={true}
                      onRenderError={onRenderError}
                    />
                  </div>
              ))}
            </Document>
        </div>
      </div>

      {numPages && !isMobile && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center">
           <div className="flex items-center gap-2 bg-black/80 text-white rounded-full p-2 shadow-lg">
            
            <Button variant="ghost" size="icon" className="rounded-full w-8 h-8" onClick={() => goToPage(Math.max(pageNumber - 1, 1))} disabled={pageNumber <= 1}>
                <ChevronLeft className="w-5 h-5" />
                <span className="sr-only">Previous Page</span>
            </Button>
            
            <span className="text-sm px-3 tabular-nums">Page {pageNumber} / {numPages ?? '--'}</span>
            
            <Button variant="ghost" size="icon" className="rounded-full w-8 h-8" onClick={() => goToPage(Math.min(pageNumber + 1, numPages))} disabled={pageNumber >= numPages}>
                <ChevronRight className="w-5 h-5" />
                <span className="sr-only">Next Page</span>
            </Button>

            <div className="h-6 w-px bg-white/20"></div>
            
            <Button variant="ghost" size="icon" className="rounded-full w-8 h-8" onClick={zoomOut} disabled={scale <= MIN_ZOOM}>
              <Minus className="w-4 h-4" />
            </Button>

            <span className='text-sm w-12 text-center font-mono'>
                {`${Math.round(scale * 100)}%`}
            </span>

            <Button variant="ghost" size="icon" className="rounded-full w-8 h-8" onClick={zoomIn} disabled={scale >= MAX_ZOOM}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PdfViewer;
