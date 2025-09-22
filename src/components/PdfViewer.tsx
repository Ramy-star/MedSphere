
'use client';
import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { Button } from './ui/button';
import { Minus, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;


const options = {
  cMapUrl: '/cmaps/',
  standardFontDataUrl: '/standard_fonts/',
};

const MAX_ZOOM = 3;
const MIN_ZOOM = 0.2;
const ZOOM_STEP = 0.05;

export default function PdfViewer({ file }: { file: string }) {
  const [numPages, setNumPages] = useState<number>();
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(0.6);
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);


  function onDocumentLoadSuccess({ numPages: nextNumPages }: { numPages: number }): void {
    setNumPages(nextNumPages);
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
  
  const zoomIn = () => setScale(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  const zoomOut = () => setScale(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
  
  const devicePixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio : 1;


  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <div className="flex-1 w-full overflow-auto">
        <div className="flex justify-center items-center p-4 min-h-full">
            <Document
              file={file}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              options={options}
              className="flex justify-center"
            >
              <div
                  className="transition-transform duration-300 ease-in-out"
                  style={{ transform: `scale(${scale})` }}
              >
                  <Page 
                    pageNumber={pageNumber} 
                    scale={MAX_ZOOM * devicePixelRatio}
                    renderTextLayer={true}
                  />
              </div>
            </Document>
        </div>
      </div>

      {numPages && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center">
           <div className="flex items-center gap-2 bg-black/80 text-white rounded-full p-2 shadow-lg">
            
            <Button variant="ghost" size="icon" className="rounded-full w-8 h-8" onClick={() => setPageNumber(p => Math.max(p - 1, 1))} disabled={pageNumber <= 1}>
                <span className="sr-only">Previous Page</span>
            </Button>
            
            <span className="text-sm px-3 tabular-nums">Page {pageNumber} / {numPages ?? '--'}</span>
            
            <Button variant="ghost" size="icon" className="rounded-full w-8 h-8" onClick={() => setPageNumber(p => Math.min(p + 1, numPages))} disabled={pageNumber >= numPages}>
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
}
