
'use client';

import { useEffect, useState, forwardRef } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import PdfViewer, { type PdfViewerRef } from './PdfViewer';
import { useIsMobile } from '@/hooks/use-mobile';
import { Skeleton } from './ui/skeleton';

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
  isFullscreen?: boolean;
  currentPage?: number;
};

// Define the type for the ref handle
export type FilePreviewRef = PdfViewerRef;

const FilePreview = forwardRef<FilePreviewRef, FilePreviewProps>(({ url, mime, itemName, onPdfLoadSuccess, pdfScale, onPageChange, isFullscreen, currentPage }, ref) => {
  const [contentUrl, setContentUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isMobile = useIsMobile();
  
  useEffect(() => {
    let objectUrl: string | null = null;
    const isHtml = mime === 'text/html';

    if (isHtml) {
      setIsLoading(true);
      fetch(url)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.statusText}`);
          }
          return response.blob();
        })
        .then(blob => {
          objectUrl = URL.createObjectURL(blob);
          setContentUrl(objectUrl);
        })
        .catch(error => {
          console.error("Error fetching content for preview:", error);
          setContentUrl(null); // Fallback to allow showing an error
        })
        .finally(() => {
            setIsLoading(false);
        });
    } else {
        // For other types, use the URL directly
        setContentUrl(url);
    }

    // Cleanup function to revoke the object URL
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [url, mime]);

  if (isLoading) {
      return (
          <div className="w-full h-full flex items-center justify-center">
              <Skeleton className="h-[90%] w-[90%] rounded-lg" />
          </div>
      );
  }
  
  if (!contentUrl) {
      // Handles the case where the fetch fails
       return (
        <div className="flex flex-col items-center justify-center h-full text-center text-slate-300 bg-slate-800/50 rounded-lg p-8">
            <p className="text-xl font-semibold mb-3">⚠️ Preview could not be loaded</p>
            <p className="text-base mb-4 text-slate-400">There was an error loading the file content.</p>
            <a href={url} download={itemName} className="mt-4 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">Download File</a>
        </div>
      );
  }

  if (mime.startsWith('image/')) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={contentUrl} alt={itemName} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />;
  }
  
  if (mime === 'application/pdf') {
    return <PdfViewer ref={ref} file={contentUrl} onLoadSuccess={onPdfLoadSuccess} scale={pdfScale} onPageChange={onPageChange} isFullscreen={isFullscreen} currentPage={currentPage} />;
  }
  
  if (mime.startsWith('audio/')) {
    return <div className="w-full h-full flex items-center justify-center p-4"><audio controls src={contentUrl} className="w-full max-w-lg" /></div>;
  }
  
  if (mime.startsWith('video/')) {
    return <div className="w-full h-full flex items-center justify-center bg-black"><video controls src={contentUrl} className="max-w-full max-h-full" /></div>;
  }

  if (mime === 'text/html') {
    return <iframe src={contentUrl} className="w-full h-full border-2 border-slate-700 rounded-lg bg-white text-black shadow-lg" title={itemName} sandbox="allow-scripts" />;
  }

  if (mime.startsWith('text/')) {
    return <iframe src={contentUrl} className="w-full h-full border-2 border-slate-700 rounded-lg bg-slate-800 text-white shadow-lg" title={itemName} />
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
