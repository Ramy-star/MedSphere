
'use client';
import { useEffect, useState, useRef, useCallback, Dispatch, SetStateAction } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { contentService, Content } from '@/lib/contentService';
import { FolderCard } from './FolderCard';
import { FileCard } from './FileCard';
import { SubjectCard } from './subject-card';
import { FilePreviewModal } from './FilePreviewModal';
import { RenameDialog } from './RenameDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { Folder as FolderIcon, Plus, UploadCloud, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { UploadingFile, UploadProgress, UploadCallbacks } from './UploadProgress';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useToast } from '@/hooks/use-toast';
import { AddContentMenu } from './AddContentMenu';
import { useIsMobile } from '@/hooks/use-mobile';
import { v4 as uuidv4 } from 'uuid';

function DropZone({ isVisible }: { isVisible: boolean }) {
  if (!isVisible) return null;
  return (
    <div className="absolute inset-0 bg-blue-900/10 backdrop-blur-sm flex items-center justify-center border-4 border-dashed border-blue-500 rounded-2xl z-10 pointer-events-none">
        <div className="text-center text-white">
            <UploadCloud className="mx-auto h-16 w-16 mb-4" />
            <h3 className="text-2xl font-bold">Drop files to upload</h3>
            <p className="text-blue-200">Release to start uploading files</p>
        </div>
    </div>
  );
}

const SortableItemWrapper = ({ id, children }: { id: string, children: React.ReactNode }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
    transition,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="flex items-center w-full">
        {children}
    </div>
  );
};

type FolderGridProps = {
    parentId: string | null;
};


export function FolderGrid({ parentId }: FolderGridProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [orderedItems, setOrderedItems] = useState<Content[] | null>(null);
  const { data: fetchedItems, loading } = useCollection<Content>('content', {
      where: ['parentId', '==', parentId],
      orderBy: ['order', 'asc']
  });
  
  const [previewFile, setPreviewFile] = useState<Content | null>(null);
  const [itemToRename, setItemToRename] = useState<Content | null>(null);
  const [itemToDelete, setItemToDelete] = useState<Content | null>(null);
  const [itemToUpdate, setItemToUpdate] = useState<Content | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (fetchedItems) {
      setOrderedItems(fetchedItems);
    }
  }, [fetchedItems]);
  
  const items = orderedItems || [];

  const handleUpdateClick = (item: Content) => {
    setItemToUpdate(item);
    fileInputRef.current?.click();
  };

  const processFileUpload = useCallback(async (file: File) => {
    if (itemToUpdate) {
        // This is an update operation
        const callbacks: UploadCallbacks = {
            onStart: (id) => {
                setUploadingFiles(prev => [...prev, { id, name: `Updating ${itemToUpdate.name}...`, size: file.size, progress: 0, status: 'uploading' }]);
            },
            onProgress: (id, progress) => {
                setUploadingFiles(prev => prev.map(f => f.id === id ? { ...f, progress } : f));
            },
            onSuccess: (id, content) => {
                setUploadingFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'success', name: `Updated: ${content.name}` } : f));
                setTimeout(() => setUploadingFiles(prev => prev.filter(f => f.id !== id)), 2000);
                toast({ title: "File Updated", description: `"${content.name}" has been updated successfully.` });
                setItemToUpdate(null); // Reset after success
            },
            onError: (id, error) => {
                setUploadingFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'error' } : f));
                toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
                setItemToUpdate(null); // Reset after error
            }
        };
        await contentService.updateFile(itemToUpdate.id, file, callbacks);

    } else {
        // This is a create operation
        const callbacks: UploadCallbacks = {
            onStart: (id) => {
                 setUploadingFiles(prev => [...prev, { id, name: file.name, size: file.size, progress: 0, status: 'uploading' }]);
            },
            onProgress: (id, progress) => {
                setUploadingFiles(prev => prev.map(f => f.id === id ? { ...f, progress } : f));
            },
            onSuccess: (id, content) => {
                 setUploadingFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'success' } : f));
                 setTimeout(() => setUploadingFiles(prev => prev.filter(f => f.id !== id)), 2000); // Remove after 2s
                 toast({ title: "File Uploaded", description: `"${content.name}" has been uploaded.` });
            },
            onError: (id, error) => {
                console.error("Upload failed in component:", error);
                setUploadingFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'error' } : f));
                toast({
                    variant: 'destructive',
                    title: 'Upload Failed',
                    description: error.message || `Could not upload ${file.name}. Please try again.`
                })
            }
        };
        await contentService.createFile(parentId, file, callbacks);
    }
  }, [itemToUpdate, parentId, toast]);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFileUpload(file);
    }
    if(event.target) {
        event.target.value = '';
    }
  };

  const handleFileClick = (file: Content) => {
    if (isMobile) {
      if (file.metadata?.storagePath) {
        window.open(file.metadata.storagePath, '_blank');
      }
    } else {
      setPreviewFile(file);
    }
  };

  const handleRename = async (newName: string) => {
    if (!itemToRename) return;
    await contentService.rename(itemToRename.id, newName);
    setItemToRename(null);
  };
  
  const handleDelete = async () => {
    if (!itemToDelete) return;
    await contentService.delete(itemToDelete.id);
    setItemToDelete(null);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const dropZoneNode = dropZoneRef.current;
    if (dropZoneNode && !dropZoneNode.contains(e.relatedTarget as Node)) {
        setIsDraggingOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      for (const file of Array.from(files)) {
        processFileUpload(file);
      }
    }
  };
  
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
        setOrderedItems(currentItems => {
            if (!currentItems) return null;
            const oldIndex = currentItems.findIndex((item) => item.id === active.id);
            const newIndex = currentItems.findIndex((item) => item.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return currentItems;

            const newOrderedItems = arrayMove(currentItems, oldIndex, newIndex);
            
            const orderedIds = newOrderedItems.map(item => item.id);
            contentService.updateOrder(parentId, orderedIds);
            
            return newOrderedItems;
        });
    }
  };

  const isSubjectView = items.length > 0 && items.every(it => it.type === 'SUBJECT');

  const containerClasses = isSubjectView 
    ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
    : cn("flex flex-col", isMobile ? "" : "gap-2");


  return (
    <div 
        ref={dropZoneRef}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn("h-full", isDraggingOver && "opacity-50")}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange}
        className="hidden" 
      />
      <DropZone isVisible={isDraggingOver} />
      
      {loading && (
        <div className={isSubjectView ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" : "space-y-2"}>
          {[...Array(isSubjectView ? 4 : 3)].map((_, i) => (
            <Skeleton key={i} className={`${isSubjectView ? "h-28" : "h-14"} w-full rounded-xl`} />
          ))}
        </div>
      )}

      {!loading && items.length === 0 && uploadingFiles.length === 0 && (
         <div className="text-center py-16 border-2 border-dashed border-slate-700 rounded-xl animate-fade-in flex flex-col items-center justify-center h-full" style={{ animationDelay: '0.15s' }}>
              <FolderIcon className="mx-auto h-12 w-12 text-slate-500" />
              <h3 className="mt-4 text-lg font-semibold text-white">This folder is empty</h3>
              <p className="mt-2 text-sm text-slate-400">Drag and drop files here, or use the button to add content.</p>
              <AddContentMenu 
                parentId={parentId}
                onFileSelected={processFileUpload}
                trigger={
                  <Button className="mt-6 rounded-xl">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Content
                  </Button>
                }
              />
          </div>
      )}
      
      {(!loading || items.length > 0 || uploadingFiles.length > 0) && items && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <div className={containerClasses}>
                <AnimatePresence>
                  {uploadingFiles.map(file => (
                    <motion.div
                       key={file.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.15 }}
                        className={cn(isMobile ? "px-4" : "")}
                    >
                        <UploadProgress file={file} />
                    </motion.div>
                  ))}
                  {items.map((it: Content, index) => {
                    const content = it.type === 'SUBJECT' ? (
                      <SubjectCard subject={it} />
                    ) : it.type === 'FOLDER' ? (
                      <FolderCard 
                        item={it} 
                        onRename={() => setItemToRename(it)}
                        onDelete={() => setItemToDelete(it)}
                      />
                    ) : (
                      <FileCard 
                        item={it} 
                        onFileClick={handleFileClick} 
                        onRename={() => setItemToRename(it)}
                        onDelete={() => setItemToDelete(it)}
                        onUpdate={() => handleUpdateClick(it)}
                        showDragHandle={!isMobile}
                      />
                    );

                    const motionProps = {
                        key:it.id,
                        initial:{ opacity: 0, y: 8 },
                        animate:{ opacity: 1, y: 0 },
                        exit:{ opacity: 0, y: 8 },
                        transition:{ duration: 0.15, delay: (uploadingFiles.length * 0.02) + (index * 0.02) },
                    };

                    if (isMobile) {
                        return <motion.div {...motionProps} className="px-4">{content}</motion.div>
                    }

                    return (
                        <motion.div {...motionProps}>
                            {isSubjectView ? content : <SortableItemWrapper id={it.id}>{content}</SortableItemWrapper>}
                        </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>
            </SortableContext>
          </DndContext>
      )}
      
      <FilePreviewModal
        item={previewFile}
        onOpenChange={(isOpen) => !isOpen && setPreviewFile(null)}
      />

      <RenameDialog 
        item={itemToRename} 
        onOpenChange={(isOpen) => !isOpen && setItemToRename(null)} 
        onRename={handleRename}
      />

      <AlertDialog open={!!itemToDelete} onOpenChange={(isOpen) => !isOpen && setItemToDelete(null)}>
        <AlertDialogContent className="sm:max-w-[425px] p-0 border-slate-700 rounded-2xl bg-gradient-to-b from-slate-800/80 to-slate-900/70 backdrop-blur-lg shadow-lg shadow-blue-500/10 text-white">
          <AlertDialogHeader className="p-6 pb-0">
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{itemToDelete?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="p-6 pt-4">
            <AlertDialogCancel asChild><Button variant="ghost">Cancel</Button></AlertDialogCancel>
            <AlertDialogAction asChild><Button variant="destructive" onClick={handleDelete}>Delete</Button></AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    
