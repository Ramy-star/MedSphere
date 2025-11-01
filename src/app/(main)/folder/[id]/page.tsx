'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { FolderGrid } from '@/components/FolderGrid';
import type { Content } from '@/lib/contentService';
import { contentService } from '@/lib/contentService';
import { notFound } from 'next/navigation';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useToast } from '@/hooks/use-toast';
import { UploadingFile, UploadCallbacks } from '@/components/UploadProgress';
import FileExplorerHeader from '@/components/FileExplorerHeader';
import { motion } from 'framer-motion';

export default function FolderPage({ params }: { params: { id: string } }) {
  const { id } = params;
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

  const handleUpdateFile = useCallback(async (itemToUpdate: Content, newFile: File) => {
    const tempId = `update_${Date.now()}_${itemToUpdate.id}`;

    const callbacks: UploadCallbacks = {
        onProgress: (progress) => {
            setUploadingFiles(prev => prev.map(f => f.id === tempId ? { ...f, progress, status: 'uploading' } : f));
        },
        onSuccess: (content) => {
             // The main collection re-render will handle showing the new file.
             // After a delay, we clean up the uploadingFiles state.
             setTimeout(() => setUploadingFiles(prev => prev.filter(f => f.id !== tempId)), 500);
             toast({ title: "File Updated", description: `"${newFile.name}" has been uploaded.` });
        },
        onError: (error) => {
            console.error("Update failed in component:", error);
            // On error, we remove the uploading indicator to allow retry
            setUploadingFiles(prev => prev.filter(f => f.id !== tempId));
            toast({
                variant: 'destructive',
                title: 'Update Failed',
                description: error.message || `Could not update ${itemToUpdate.name}. Please try again.`
            });
        }
    };
    
    const uploadingFile: UploadingFile = {
      id: tempId,
      name: newFile.name,
      size: newFile.size,
      progress: 0,
      status: 'uploading',
      file: newFile,
      isUpdate: true,
      originalId: itemToUpdate.id,
      xhr: undefined
    };
    
    // Add to state immediately to show progress bar
    setUploadingFiles(prev => [...prev, uploadingFile]);
    
    // Start the update process, which will eventually use the callbacks
    await contentService.updateFile(itemToUpdate, newFile, callbacks);

  }, [toast]);


  const handleRetryUpload = useCallback(async (fileId: string) => {
    const fileToRetry = uploadingFiles.find(f => f.id === fileId);
    if (fileToRetry && fileToRetry.file && id) {
      setUploadingFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'uploading', progress: 0 } : f));

      const callbacks: UploadCallbacks = {
        onProgress: (progress) => {
            setUploadingFiles(prev => prev.map(f => f.id === fileId ? { ...f, progress } : f));
        },
        onSuccess: (content) => {
            setUploadingFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'success', xhr: undefined } : f));
            setTimeout(() => setUploadingFiles(prev => prev.filter(f => f.id !== fileId)), 2000);
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
    <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, transition: { duration: 0.1 } }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="flex flex-col flex-1 overflow-hidden"
    >
        <FileExplorerHeader onFileSelected={processFileUpload} />
        <div className="relative flex-1 overflow-y-auto mt-4 pr-2 -mr-2">
            <FolderGrid 
                parentId={id} 
                uploadingFiles={uploadingFiles} 
                onFileSelected={processFileUpload}
                onUpdateFile={handleUpdateFile}
                onRetry={handleRetryUpload}
                onRemove={handleRemoveUpload}
            />
        </div>
    </motion.div>
  );
}
