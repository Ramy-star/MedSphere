
'use client';

import { useEffect, useState, useCallback, Suspense, use } from 'react';
import { FolderGrid } from '@/components/FolderGrid';
import FileExplorerHeader from '@/components/FileExplorerHeader';
import type { Content } from '@/lib/contentService';
import { contentService } from '@/lib/contentService';
import { notFound } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useToast } from '@/hooks/use-toast';
import { UploadingFile, UploadCallbacks } from '@/components/UploadProgress';

function FolderPageContent({ id }: { id: string }) {
  const { data: current, loading: loadingCurrent } = useDoc<Content>('content', id);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const { toast } = useToast();
  
  useEffect(() => {
    if (!loadingCurrent && !current) {
        notFound();
    }
  }, [loadingCurrent, current]);

  const processFileUpload = useCallback(async (file: File) => {
    if (!id) return;

    const tempId = `upload_${Date.now()}_${file.name}`;

    const callbacks: UploadCallbacks = {
        onProgress: (progress) => {
            setUploadingFiles(prev => prev.map(f => f.id === tempId ? { ...f, progress, status: 'uploading' } : f));
        },
        onSuccess: (content) => {
             setUploadingFiles(prev => prev.map(f => f.id === tempId ? { ...f, status: 'success', xhr: undefined } : f));
             setTimeout(() => setUploadingFiles(prev => prev.filter(f => f.id !== tempId)), 2000); // Remove after 2s
             toast({ title: "File Uploaded", description: `"${content.name}" has been uploaded.` });
        },
        onError: (error) => {
            console.error("Upload failed in component:", error);
            setUploadingFiles(prev => prev.map(f => f.id === tempId ? { ...f, status: 'error', xhr: undefined } : f));
            toast({
                variant: 'destructive',
                title: 'Upload Failed',
                description: error.message || `Could not upload ${file.name}. Please try again.`
            })
        }
    };
    
    const xhr = await contentService.createFile(id, file, callbacks);
    setUploadingFiles(prev => [...prev, { id: tempId, name: file.name, size: file.size, progress: 0, status: 'uploading', file: file, xhr }]);

  }, [id, toast]);

  const handleRetryUpload = useCallback(async (fileId: string) => {
    const fileToRetry = uploadingFiles.find(f => f.id === fileId);
    if (fileToRetry && fileToRetry.file && id) {
      // Optimistically set status to uploading
      setUploadingFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'uploading', progress: 0 } : f));

      const callbacks: UploadCallbacks = {
        onProgress: (progress) => {
            setUploadingFiles(prev => prev.map(f => f.id === fileId ? { ...f, progress } : f));
        },
        onSuccess: (content) => {
            setUploadingFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'success', xhr: undefined } : f));
            setTimeout(() => setUploading_Files(prev => prev.filter(f => f.id !== fileId)), 2000);
            toast({ title: "File Uploaded", description: `"${content.name}" has been uploaded.` });
        },
        onError: (error) => {
            setUploadingFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'error', xhr: undefined } : f));
            toast({
                variant: 'destructive',
                title: 'Upload Failed',
                description: error.message || `Could not upload ${fileToRetry.name}. Please try again.`
            });
        }
      };

      const newXhr = await contentService.createFile(id, fileToRetry.file, callbacks);
      setUploadingFiles(prev => prev.map(f => f.id === fileId ? { ...f, xhr: newXhr } : f));
    }
  }, [uploadingFiles, id, toast]);

  const handleRemoveUpload = (fileId: string) => {
      const fileToRemove = uploadingFiles.find(f => f.id === fileId);
      if (fileToRemove && fileToRemove.xhr) {
          fileToRemove.xhr.abort();
      }
      setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
  };
  
  return (
    <main className="flex-1 p-4 md:p-6 glass-card flex flex-col h-full overflow-hidden">
       <FileExplorerHeader currentFolder={current} onFileSelected={processFileUpload} />
       <div className="relative flex-1 overflow-y-auto mt-4 pr-2 -mr-2">
          <FolderGrid 
            parentId={id} 
            uploadingFiles={uploadingFiles} 
            onFileSelected={processFileUpload}
            onRetry={handleRetryUpload}
            onRemove={handleRemoveUpload}
          />
       </div>
    </main>
  );
}


function FolderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <Suspense fallback={
        <main className="flex-1 p-4 md:p-6 glass-card flex flex-col h-full overflow-hidden">
            <div className="mb-6 space-y-4">
                <Skeleton className="h-5 w-1/3" />
                <div className="flex items-center justify-between min-h-[40px]">
                    <div className="flex items-center gap-4">
                        <Skeleton className="w-10 h-10 rounded-lg" />
                        <Skeleton className="h-8 w-48" />
                    </div>
                </div>
            </div>
            <div className="relative flex-1 overflow-y-auto mt-4 pr-2 -mr-2 space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
            </div>
        </main>
    }>
        <FolderPageContent id={id} />
    </Suspense>
  );
}


export default FolderPage;
