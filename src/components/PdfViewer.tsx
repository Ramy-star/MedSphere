'use client';
import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { Button } from './ui/button';
import { Minus, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';


pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;


const options = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
};

const MAX_ZOOM = 3;
const MIN_ZOOM = 0.2;
const ZOOM_STEP = 0.1;


const PdfViewer = ({ file, onLoadSuccess }: { file: string, onLoadSuccess?: (pdf: PDFDocumentProxy) => void }) => {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    // Set initial scale to fit width or a default for mobile
    if (containerRef.current) {
        const pageContainer = containerRef.current.querySelector('.react-pdf__Page');
        if (pageContainer) {
            const containerWidth = containerRef.current.clientWidth;
            const pageWidth = pageContainer.clientWidth / scale; // get original width
            setScale(containerWidth / pageWidth);
        } else {
             setScale(isMobile ? 0.5 : 1);
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);
  

  const onDocumentLoadSuccessInternal = (loadedPdf: PDFDocumentProxy) => {
    setNumPages(loadedPdf.numPages);
    if(onLoadSuccess) {
      onLoadSuccess(loadedPdf);
    }
  }

  function onDocumentLoadError(error: Error) {
    if (error.message.includes('API version') && error.message.includes('Worker version')) {
        console.warn(`Ignoring expected PDF.js version mismatch error: ${error.message}`);
        return;
    }
    console.error('Error loading PDF:', error);
    toast({
      variant: 'destructive',
      title: 'Error loading PDF',
      description: 'The file could not be loaded. It may be corrupted or in an unsupported format.',
    });
  }

  const onRenderError = (error: Error) => {
    if (error.name === 'AbortException' || (error.message && error.message.includes('TextLayer task cancelled'))) {
        return; // Ignore AbortExceptions as they are expected on rapid interaction.
    }
    console.error('Failed to render PDF page:', error);
    toast({
        variant: 'destructive',
        title: 'PDF Render Error',
        description: 'A page could not be displayed correctly.',
    });
  }
  

  const goToPage = (page: number) => {
    setPageNumber(Math.max(1, Math.min(page, numPages || 1)));
  }
  
  const zoomIn = () => setScale(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  const zoomOut = () => setScale(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM));


  return (
    <div 
      ref={containerRef} 
      className="w-full h-full flex flex-col items-center justify-start overflow-auto"
    >
      <Document
        file={file}
        onLoadSuccess={onDocumentLoadSuccessInternal}
        onLoadError={onDocumentLoadError}
        options={options}
        className="flex justify-center"
      >
        <Page
            pageNumber={pageNumber}
            scale={scale}
            renderTextLayer={true}
            onRenderError={onRenderError}
            className="shadow-2xl"
        />
      </Document>

      {numPages && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center">
           <div className="flex items-center gap-0 md:gap-1 bg-black/80 text-white rounded-full p-1 shadow-lg">
            
            <Button variant="ghost" size="icon" className="rounded-full w-8 h-8" onClick={() => goToPage(pageNumber - 1)} disabled={pageNumber <= 1}>
                <ChevronLeft className="w-4 h-4" />
                <span className="sr-only">Previous Page</span>
            </Button>
            
            <span className="text-xs px-2 tabular-nums whitespace-nowrap">{pageNumber} / {numPages ?? '--'}</span>
            
            <Button variant="ghost" size="icon" className="rounded-full w-8 h-8" onClick={() => goToPage(pageNumber + 1)} disabled={pageNumber >= numPages}>
                <ChevronRight className="w-4 h-4" />
                <span className="sr-only">Next Page</span>
            </Button>

            <div className="h-4 md:h-5 w-px bg-white/20 mx-1"></div>
            
            <Button variant="ghost" size="icon" className="rounded-full w-8 h-8" onClick={zoomOut} disabled={scale <= MIN_ZOOM}>
              <Minus className="w-4 h-4" />
            </Button>

            <span className='text-xs w-10 text-center font-mono'>
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
