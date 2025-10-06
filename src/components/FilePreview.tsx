'use client';

import { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import dynamic from 'next/dynamic';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import PdfViewer, { type PdfViewerRef } from './PdfViewer'; // Direct import and import type


// Import react-pdf styles here to ensure they are loaded
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

type FilePreviewProps = {
  url: string;
  mime: string;
  itemName: string;
  onPdfLoadSuccess?: (pdf: PDFDocumentProxy) => void;
  pdfScale: number;
  onPageChange?: (page: number) => void;
  scrollListenerEnabled: boolean;
  setScrollListenerEnabled: (enabled: boolean) => void;
};

// Define the type for the ref handle
export type FilePreviewRef = PdfViewerRef;

const FilePreview = forwardRef<FilePreviewRef, FilePreviewProps>(({ url, mime, itemName, onPdfLoadSuccess, pdfScale, onPageChange, scrollListenerEnabled, setScrollListenerEnabled }, ref) => {
  const [htmlContentUrl, setHtmlContentUrl] = useState<string | null>(null);
  const [isLoadingHtml, setIsLoadingHtml] = useState(false);
  

  useEffect(() => {
    let objectUrl: string | null = null;
    if (mime === 'text/html') {
      setIsLoadingHtml(true);
      fetch(url)
        .then(response => response.text())
        .then(text => {
          const blob = new Blob([text], { type: 'text/html' });
          objectUrl = URL.createObjectURL(blob);
          setHtmlContentUrl(objectUrl);
        })
        .catch(error => {
          console.error("Error fetching HTML for preview:", error);
          setHtmlContentUrl(null); // Fallback
        })
        .finally(() => {
            setIsLoadingHtml(false);
        });

      // Cleanup function to revoke the object URL
      return () => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, mime]);
  

  if (mime.startsWith('image/')) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={itemName} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />;
  }
  
  if (mime === 'application/pdf') {
    return <PdfViewer ref={ref} file={url} onLoadSuccess={onPdfLoadSuccess} scale={pdfScale} onPageChange={onPageChange} scrollListenerEnabled={scrollListenerEnabled} setScrollListenerEnabled={setScrollListenerEnabled} />;
  }
  
  if (mime.startsWith('audio/')) {
    return <div className="w-full h-full flex items-center justify-center p-4"><audio controls src={url} className="w-full max-w-lg" /></div>;
  }
  
  if (mime.startsWith('video/')) {
    return <div className="w-full h-full flex items-center justify-center bg-black"><video controls src={url} className="max-w-full max-h-full" /></div>;
  }

  if (mime === 'text/html') {
    if(isLoadingHtml) {
        return <div className="text-white">Loading HTML preview...</div>
    }
    if (htmlContentUrl) {
        return <iframe src={htmlContentUrl} className="w-full h-full border-2 border-slate-700 rounded-lg bg-white text-black shadow-lg" title={itemName} sandbox="allow-scripts" />;
    }
  }

  if (mime.startsWith('text/')) {
    return <iframe src={url} className="w-full h-full border-2 border-slate-700 rounded-lg bg-slate-800 text-white shadow-lg" title={itemName} />
  }

  // Use Office viewer for docx, xlsx, pptx if it's a public URL (won't work for blob URLs from local storage)
  if (!url.startsWith('blob:') && (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation')) {
    return <iframe src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`} className="w-full h-full border-0 rounded-lg shadow-2xl" title={itemName} />
  }
  
  return (
    <div className="flex flex-col items-center justify-center h-full text-center text-slate-300 bg-slate-800/50 rounded-lg p-8">
        <p className="text-xl font-semibold mb-3">⚠️ Preview not available</p>
        <p className="text-base mb-4 text-slate-400">Unsupported file type: <code className='bg-slate-900 px-2 py-1 rounded-md text-slate-300'>{mime}</code></p>
        <a href={url} download={itemName} className="mt-4 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">Download File</a>
    </div>
  );
});

FilePreview.displayName = 'FilePreview';

export default FilePreview;
