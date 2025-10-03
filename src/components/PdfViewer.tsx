'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { Button } from './ui/button';
import { Minus, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useWindowSize } from '@react-hook/window-size';


pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;


const options = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
};

const MAX_ZOOM = 3;
const MIN_ZOOM = 0.2;
const ZOOM_STEP = 0.05;


const PdfViewer = ({ file, onLoadSuccess }: { file: string, onLoadSuccess?: (pdf: PDFDocumentProxy) => void }) => {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(0.25);
  const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 });
  
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const [width] = useWindowSize();
  
  const devicePixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
  const calculatedWidth = Math.min(width, 1024) * 0.9; // 90% of width up to 1024px

  const rowVirtualizer = useVirtualizer({
    count: numPages || 0,
    getScrollElement: () => containerRef.current,
    estimateSize: useCallback(() => {
        if (!pageDimensions.width) return 1000; // Default estimate
        const pageScale = calculatedWidth / pageDimensions.width;
        return pageDimensions.height * pageScale + 16;
    }, [pageDimensions, calculatedWidth]),
    overscan: 2,
  });

  const onDocumentLoadSuccessInternal = async (loadedPdf: PDFDocumentProxy) => {
    setNumPages(loadedPdf.numPages);
     try {
        const firstPage = await loadedPdf.getPage(1);
        const viewport = firstPage.getViewport({ scale: 1 });
        setPageDimensions({ width: viewport.width, height: viewport.height });
    } catch (e) {
        console.error("Could not get page dimensions", e);
    }
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
  
  useEffect(() => {
    const handleScroll = () => {
      if (!rowVirtualizer) return;
      const virtualItems = rowVirtualizer.getVirtualItems();
      if (virtualItems.length > 0) {
        // Find the topmost visible item.
        const firstVisibleItem = virtualItems.find(item => item.start >= (containerRef.current?.scrollTop || 0));
        if (firstVisibleItem) {
          setPageNumber(firstVisibleItem.index + 1);
        }
      }
    };
    const scrollElement = containerRef.current;
    scrollElement?.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollElement?.removeEventListener('scroll', handleScroll);
  }, [rowVirtualizer]);


  const goToPage = (page: number) => {
    rowVirtualizer.scrollToIndex(page - 1, { align: 'start' });
    setPageNumber(page);
  }
  
  const zoomIn = () => setScale(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  const zoomOut = () => setScale(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM));


  return (
    <div 
      className="w-full h-full flex flex-col items-center justify-start"
    >
      <div ref={containerRef} className="flex-1 w-full overflow-auto">
         <Document
              file={file}
              onLoadSuccess={onDocumentLoadSuccessInternal}
              onLoadError={onDocumentLoadError}
              options={options}
              className="flex flex-col items-center"
            >
              <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                {rowVirtualizer.getVirtualItems().map((virtualItem) => (
                    <div
                      key={virtualItem.key}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualItem.size}px`,
                        transform: `translateY(${virtualItem.start}px)`,
                      }}
                      className="flex justify-center mb-4" // mb-4 for spacing between pages
                    >
                      <Page
                        pageNumber={virtualItem.index + 1}
                        width={calculatedWidth}
                        scale={scale}
                        renderTextLayer={true}
                        onRenderError={onRenderError}
                      />
                    </div>
                ))}
              </div>
            </Document>
      </div>

      {numPages && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center">
           <div className="flex items-center gap-0 md:gap-1 bg-black/80 text-white rounded-full p-1 shadow-lg">
            
            <Button variant="ghost" size="icon" className="rounded-full w-8 h-8" onClick={() => goToPage(Math.max(pageNumber - 1, 1))} disabled={pageNumber <= 1}>
                <ChevronLeft className="w-4 h-4" />
                <span className="sr-only">Previous Page</span>
            </Button>
            
            <span className="text-xs px-2 tabular-nums whitespace-nowrap">{pageNumber} / {numPages ?? '--'}</span>
            
            <Button variant="ghost" size="icon" className="rounded-full w-8 h-8" onClick={() => goToPage(Math.min(pageNumber + 1, numPages))} disabled={pageNumber >= numPages}>
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
