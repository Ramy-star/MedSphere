'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { Button } from './ui/button';
import { Minus, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Skeleton } from './ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';


pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const options = {
  cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
};

const MAX_ZOOM = 5;
const MIN_ZOOM = 0.2;
const ZOOM_STEP = 0.2;

const PdfViewer = ({ file, onLoadSuccess, isControlsVisible, previewContainerRef }: { file: string, onLoadSuccess?: (pdf: PDFDocumentProxy) => void, isControlsVisible: boolean, previewContainerRef: React.RefObject<HTMLDivElement> }) => {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [pageDimensions, setPageDimensions] = useState<{ width: number, height: number }[]>([]);
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [userHasScrolled, setUserHasScrolled] = useState(false);

  const rowVirtualizer = useVirtualizer({
    count: numPages || 0,
    getScrollElement: () => containerRef.current,
    estimateSize: (index) => pageDimensions[index]?.height * scale + 16 || 1000,
    overscan: 2,
  });

  const onDocumentLoadSuccessInternal = async (loadedPdf: PDFDocumentProxy) => {
    setPdf(loadedPdf);
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
                const newScale = Math.min(containerWidth / pageOriginalWidth, MAX_ZOOM);
                setScale(newScale);
            } else {
                setScale(1); // Set to 100% on desktop
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
    const scrollElement = containerRef.current;
    if (!scrollElement || !rowVirtualizer) return;
    
    const handleScroll = () => {
        if (!userHasScrolled) setUserHasScrolled(true);

        const virtualItems = rowVirtualizer.getVirtualItems();
        if (virtualItems.length > 0) {
            const firstVisibleItem = virtualItems.find(item => item.start >= scrollElement.scrollTop);
            if(firstVisibleItem) {
                setPageNumber(firstVisibleItem.index + 1);
            } else {
                 const lastItem = virtualItems[virtualItems.length - 1];
                 if (lastItem) setPageNumber(lastItem.index + 1);
            }
        }
    };
    
    scrollElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollElement.removeEventListener('scroll', handleScroll);
}, [rowVirtualizer, userHasScrolled]);


  const goToPage = (page: number) => {
    const targetPage = Math.max(1, Math.min(page, numPages || 1));
    rowVirtualizer.scrollToIndex(targetPage - 1, { align: 'start' });
    setPageNumber(targetPage);
  }
  
  const zoomIn = () => setScale(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  const zoomOut = () => setScale(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM));

  const virtualItems = rowVirtualizer.getVirtualItems();
  
  const getControlsPosition = () => {
    if (!previewContainerRef.current) return { left: '50%', transform: 'translateX(-50%)' };
    const { left, width } = previewContainerRef.current.getBoundingClientRect();
    return {
        left: `${left + width / 2}px`,
        transform: 'translateX(-50%)',
    };
  };

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

      <AnimatePresence>
        {numPages && isControlsVisible && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-4 z-20 flex items-center justify-center"
            style={isMobile ? { left: '50%', transform: 'translateX(-50%)' } : getControlsPosition()}
          >
            <div className="flex items-center gap-0 md:gap-1 bg-black/50 text-white rounded-full p-1 shadow-lg backdrop-blur-sm border border-white/20">
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

              <span className='text-xs w-12 text-center font-mono'>
                  {`${Math.round(scale * 100)}%`}
              </span>

              <Button variant="ghost" size="icon" className="rounded-full w-8 h-8" onClick={zoomIn} disabled={scale >= MAX_ZOOM}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PdfViewer;
