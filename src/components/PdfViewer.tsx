
'use client';
import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight, Minus, Plus, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

pdfjs.GlobalWorkerOptions.workerSrc = '//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';


const options = {
  cMapUrl: '/cmaps/',
  standardFontDataUrl: '/standard_fonts/',
};

const MAX_ZOOM = 3;
const MIN_ZOOM = 0.5;
const ZOOM_STEP = 0.2;

export default function PdfViewer({ file }: { file: string }) {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.5);
  const { toast } = useToast();

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
    setPageNumber(1);
  }

  function onDocumentLoadError(error: Error) {
    console.error('Error loading PDF:', error);
    toast({
      variant: 'destructive',
      title: 'Error loading PDF',
      description: 'The file could not be loaded. It may be corrupted or in an unsupported format.',
    });
  }

  const goToPrevPage = () => setPageNumber(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages ?? 1));
  
  const zoomIn = () => setScale(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  const zoomOut = () => setScale(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM));

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 w-full overflow-auto">
        <div className="flex justify-center items-start p-4 min-h-full">
          <Document
            file={file}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            options={options}
            className="flex justify-center"
          >
            <div 
              style={{ transform: `scale(${scale})` }}
              className="transition-transform duration-300 ease-in-out"
            >
              <Page 
                pageNumber={pageNumber} 
                scale={1.5}
                renderTextLayer={true}
              />
            </div>
          </Document>
        </div>
      </div>

      {numPages && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute left-[-100px] top-1/2 -translate-y-1/2 rounded-full bg-black/40 text-white/80 hover:bg-black/60 hover:text-white"
            onClick={goToPrevPage}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-[-100px] top-1/2 -translate-y-1/2 rounded-full bg-black/40 text-white/80 hover:bg-black/60 hover:text-white"
            onClick={goToNextPage}
            disabled={pageNumber >= (numPages ?? 0)}
          >
            <ChevronRight className="w-6 h-6" />
          </Button>

          <div className="flex items-center gap-2 bg-black/40 text-white rounded-full p-2 shadow-lg">
            <span className="text-sm px-3">Page {pageNumber} / {numPages ?? '--'}</span>
            <div className="h-6 w-px bg-white/20"></div>
            <Button variant="ghost" size="icon" className="rounded-full w-8 h-8" onClick={zoomOut} disabled={scale <= MIN_ZOOM}>
              <Minus className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full w-8 h-8" disabled>
              <Search className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full w-8 h-8" onClick={zoomIn} disabled={scale >= MAX_ZOOM}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
