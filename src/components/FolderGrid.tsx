
'use client';
import { useEffect, useState, useRef, Dispatch, SetStateAction, useMemo, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { contentService, Content } from '@/lib/contentService';
import { FolderCard } from './FolderCard';
import { FileCard } from './FileCard';
import { SubjectCard } from './subject-card';
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
import { Folder as FolderIcon, Plus, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { UploadingFile, UploadProgress } from './UploadProgress';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useToast } from '@/hooks/use-toast';
import { AddContentMenu } from './AddContentMenu';
import { useIsMobile } from '@/hooks/use-mobile';
import React, { useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { ChangeIconDialog } from './ChangeIconDialog';
import { useRouter } from 'next/navigation';
import { FolderSelectorDialog } from './FolderSelectorDialog';
import dynamic from 'next/dynamic';
import { Skeleton, SkeletonCard } from './ui/skeleton';
import { useVirtualizer } from '@tanstack/react-virtual';


const FilePreviewModal = dynamic(() => import('./FilePreviewModal').then(mod => mod.FilePreviewModal), {
    loading: () => <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><SkeletonCard /></div>,
    ssr: false
});

const RenameDialog = dynamic(() => import('./RenameDialog').then(mod => mod.RenameDialog), { ssr: false });

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

const listVariants = {
  visible: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
  hidden: {},
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
      type: 'spring',
      stiffness: 400,
      damping: 40,
    },
  }),
  exit: {
    opacity: 0,
    y: 5,
    transition: {
      duration: 0.1,
    },
  },
};

const SortableItemWrapper = ({ id, children, isSubjectView }: { id: string, children: React.ReactNode, isSubjectView: boolean }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  
  const style = isSubjectView ? {
      transform: CSS.Transform.toString(transform),
      transition,
      zIndex: isDragging ? 1 : 'auto',
  } : {
      transform: CSS.Transform.toString(transform),
      transition,
  };

  const { can } = useAuthStore();
  
  if (!children) {
    return null;
  }
  
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...(can('canReorder', id) ? listeners : {})}>
      {children}
    </div>
  );
};

export function FolderGrid({ 
    parentId, 
    uploadingFiles, 
    onFileSelected,
    onUpdateFile,
    onRetry, 
    onRemove 
}: { 
    parentId: string, 
    uploadingFiles: UploadingFile[], 
    onFileSelected: (file: File) => void,
    onUpdateFile: (item: Content, file: File) => void,
    onRetry: (fileId: string) => void,
    onRemove: (fileId: string) => void,
}) {
  const { can } = useAuthStore();
  const canReorder = can('canReorder', parentId);

  const { data: fetchedItems, loading, offline } = useCollection<Content>('content', {
      where: ['parentId', '==', parentId],
      orderBy: ['order', 'asc']
  });

  const [previewFile, setPreviewFile] = useState<Content | null>(null);
  const [itemToRename, setItemToRename] = useState<Content | null>(null);
  const [itemToMove, setItemToMove] = useState<Content | null>(null);
  const [itemToCopy, setItemToCopy] = useState<Content | null>(null);
  const [itemToDelete, setItemToDelete] = useState<Content | null>(null);
  const [itemForIconChange, setItemForIconChange] = useState<Content | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [showFolderSelector, setShowFolderSelector] = useState(false);
  const [currentAction, setCurrentAction] = useState<'move' | 'copy' | null>(null);

  const dropZoneRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  
  const router = useRouter();

  const [sortedItems, setSortedItems] = useState<Content[]>([]);

  useEffect(() => {
      if (fetchedItems) {
          setSortedItems(fetchedItems);
      }
  }, [fetchedItems]);

  const handleFolderClick = useCallback((folder: Content) => {
    router.push(`/folder/${folder.id}`);
  }, [router]);

  const handleFileClick = useCallback((file: Content) => {
    if (file.type === 'LINK') {
        if(file.metadata?.url) {
            window.open(file.metadata.url, '_blank');
        }
        return;
    }
    setPreviewFile(file);
  }, []);

  const handleRename = useCallback(async (newName: string) => {
    if (!itemToRename) return;
    await contentService.rename(itemToRename.id, newName);
    toast({ title: "Renamed", description: `"${itemToRename.name}" was renamed to "${newName}".` });
    setItemToRename(null);
  }, [itemToRename, toast]);

  const handleDelete = useCallback(async () => {
    if (!itemToDelete) return;
    await contentService.delete(itemToDelete.id);
    toast({ title: "Deleted", description: `"${itemToDelete.name}" has been deleted.` });
    setItemToDelete(null);
  }, [itemToDelete, toast]);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!can('canUploadFile', parentId)) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOver(true);
    }
  }, [can, parentId]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!can('canUploadFile', parentId)) return;
    e.preventDefault();
    e.stopPropagation();
    const dropZoneNode = dropZoneRef.current;
    if (dropZoneNode && !dropZoneNode.contains(e.relatedTarget as Node)) {
        setIsDraggingOver(false);
    }
  }, [can, parentId]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!can('canUploadFile', parentId)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }, [can, parentId]);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    if (!can('canUploadFile', parentId)) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      for (const file of Array.from(files)) {
        onFileSelected(file);
      }
    }
  }, [can, onFileSelected, parentId]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    if (!canReorder) return;
    const { active, over } = event;
    if (over && active.id !== over.id) {
        setSortedItems(currentItems => {
            const oldIndex = currentItems.findIndex((item) => item.id === active.id);
            const newIndex = currentItems.findIndex((item) => item.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return currentItems;

            const newOrderedItems = arrayMove(currentItems, oldIndex, newIndex);
            
            contentService.updateOrder(parentId, newOrderedItems.map(item => item.id));

            return newOrderedItems;
        });
    }
  }, [canReorder, parentId]);

  const handleFolderSelect = useCallback(async (folder: Content) => {
    const itemToProcess = currentAction === 'move' ? itemToMove : itemToCopy;
    if (!itemToProcess || !currentAction) return;

    try {
        if (currentAction === 'move') {
            await contentService.move(itemToProcess.id, folder.id);
            toast({ title: "Item Moved", description: `Moved "${itemToProcess.name}" successfully.` });
        } else { // copy
            await contentService.copy(itemToProcess, folder.id);
            toast({ title: "Item Copied", description: `Copied "${itemToProcess.name}" successfully.` });
        }
    } catch (error: any) {
        console.error(`Failed to ${currentAction} item:`, error);
        toast({
            variant: 'destructive',
            title: `Error ${currentAction === 'move' ? 'Moving' : 'Copying'} Item`,
            description: error.message || 'An unknown error occurred.',
        });
    } finally {
        setShowFolderSelector(false);
        setItemToMove(null);
        setItemToCopy(null);
        setCurrentAction(null);
    }
  }, [currentAction, itemToCopy, itemToMove, toast]);

  const handleToggleVisibility = useCallback(async (item: Content) => {
      await contentService.toggleVisibility(item.id);
      const isHidden = !item.metadata?.isHidden;
      toast({
          title: `Item ${isHidden ? 'Hidden' : 'Visible'}`,
          description: `"${item.name}" is now ${isHidden ? 'hidden from other users' : 'visible to everyone'}.`
      });
  }, [toast]);
  
  const isSubjectView = useMemo(() => sortedItems.length > 0 && sortedItems.every(it => it.type === 'SUBJECT' || (it.type === 'FOLDER' && it.metadata?.isClassContainer)), [sortedItems]);
  
  const sensors = useSensors(
    canReorder
      ? useSensor(PointerSensor, { activationConstraint: { distance: 10 } })
      : undefined
  ) as ReturnType<typeof useSensors>;

  const rowVirtualizer = useVirtualizer({
    count: sortedItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => isSubjectView ? 160 : 60, // Estimate row height
    overscan: 10,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  const itemsToRender = useMemo(() => {
    const updatingMap = new Map(uploadingFiles.filter(f => f.isUpdate).map(f => [f.originalId, f]));
    const visibleItems = sortedItems.filter(item => !item.metadata?.isHidden || can('canToggleVisibility', item.id));

    return visibleItems.map(item => {
      return {
        item: item,
        uploadingFile: updatingMap.get(item.id),
      };
    });
  }, [sortedItems, uploadingFiles, can]);

  const newUploads = useMemo(() => uploadingFiles.filter(f => !f.isUpdate), [uploadingFiles]);

  if (loading && itemsToRender.length === 0 && newUploads.length === 0) {
      const skeletonCount = isSubjectView ? 8 : 10;
      return (
          <div className={cn(isSubjectView ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" : "space-y-2")}>
              {Array.from({ length: skeletonCount }).map((_, i) => (
                  isSubjectView ? <SkeletonCard key={i} /> : <Skeleton key={i} className="h-14 w-full" />
              ))}
          </div>
      );
  }


  return (
    <div
        ref={dropZoneRef}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn("relative h-full", isDraggingOver && "opacity-50")}
    >
      <DropZone isVisible={isDraggingOver} />
       
       {newUploads.length > 0 && (
         <div className="flex flex-col">
             <AnimatePresence>
                 {newUploads.map(file => (
                     <motion.div key={file.id} variants={itemVariants} initial="hidden" animate="visible" exit="exit" custom={0}>
                         <UploadProgress file={file} onRetry={onRetry} onRemove={onRemove} />
                     </motion.div>
                 ))}
             </AnimatePresence>
         </div>
       )}

      {!loading && itemsToRender.length === 0 && newUploads.length === 0 && (
         <div className="text-center py-16 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center h-full">
             <FolderIcon className="mx-auto h-12 w-12 text-slate-500" />
             <h3 className="mt-4 text-lg font-semibold text-white">This folder is empty</h3>
             <p className="mt-2 text-sm text-slate-400">
               Drag and drop files here, or use the button to add content.
             </p>
             {can('canAddFolder', parentId) && (
               <AddContentMenu
                 parentId={parentId}
                 onFileSelected={onFileSelected}
                 trigger={
                   <Button className="mt-6 rounded-2xl active:scale-95 transition-transform">
                     <Plus className="mr-2 h-4 w-4" />
                     Add Content
                   </Button>
                 }
               />
             )}
         </div>
      )}
      
      <div ref={parentRef} className="h-full overflow-y-auto no-scrollbar">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortedItems.map(i => i.id)} strategy={isSubjectView ? rectSortingStrategy : verticalListSortingStrategy} disabled={!canReorder}>
            <motion.div 
              style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }} 
              className={cn(isSubjectView && "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4")}
              variants={listVariants}
              initial="hidden"
              animate="visible"
            >
              <AnimatePresence>
                {virtualItems.map((virtualItem) => {
                    const { item, uploadingFile } = itemsToRender[virtualItem.index];
                    if (!item) return null;
                    
                    const isLastItem = virtualItem.index === itemsToRender.length - 1;
                    const itemKey = item.id;
                    
                    const renderedContent = () => {
                        switch (item.type) {
                            case 'SUBJECT':
                                return (
                                    <SubjectCard 
                                        subject={item}
                                        onRename={() => setItemToRename(item)}
                                        onDelete={() => setItemToDelete(item)}
                                        onIconChange={() => setItemForIconChange(item)}
                                    />
                                );
                            case 'FOLDER':
                            case 'SEMESTER':
                            case 'LEVEL':
                                 return (
                                    <FolderCard
                                        item={item}
                                        onRename={() => setItemToRename(item)}
                                        onDelete={() => setItemToDelete(item)}
                                        onIconChange={() => setItemForIconChange(item)}
                                        onMove={() => { setItemToMove(item); setCurrentAction('move'); setShowFolderSelector(true); }}
                                        onCopy={() => { setItemToCopy(item); setCurrentAction('copy'); setShowFolderSelector(true); }}
                                        onToggleVisibility={() => handleToggleVisibility(item)}
                                        onClick={handleFolderClick}
                                        displayAs={item.metadata?.isClassContainer || isSubjectView ? 'grid' : 'list'}
                                    />
                                );
                            default:
                                return (
                                    <FileCard
                                        item={item}
                                        uploadingFile={uploadingFile}
                                        onFileClick={handleFileClick}
                                        onRename={() => setItemToRename(item)}
                                        onDelete={() => setItemToDelete(item)}
                                        onUpdate={(file) => onUpdateFile(item, file)}
                                        onMove={() => { setItemToMove(item); setCurrentAction('move'); setShowFolderSelector(true); }}
                                        onCopy={() => { setItemToCopy(item); setCurrentAction('copy'); setShowFolderSelector(true); }}
                                        onToggleVisibility={() => handleToggleVisibility(item)}
                                        onRetryUpload={onRetry}
                                        onRemoveUpload={onRemove}
                                    />
                                );
                        }
                    };
                    
                     return (
                        <motion.div
                          key={itemKey}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: `${virtualItem.size}px`,
                            transform: `translateY(${virtualItem.start}px)`,
                          }}
                           className={cn(!isSubjectView && "border-white/10", !isSubjectView && !isLastItem && "border-b")}
                           variants={itemVariants}
                           custom={virtualItem.index}
                        >
                          <SortableItemWrapper id={item.id} isSubjectView={isSubjectView}>
                            {renderedContent()}
                          </SortableItemWrapper>
                        </motion.div>
                      );
                })}
              </AnimatePresence>
            </motion.div>
          </SortableContext>
        </DndContext>
      </div>

      <Suspense fallback={null}>
        <FilePreviewModal
            item={previewFile}
            onOpenChange={(isOpen) => !isOpen && setPreviewFile(null)}
        />
        <RenameDialog 
            item={itemToRename} 
            onOpenChange={(isOpen) => !isOpen && setItemToRename(null)} 
            onRename={handleRename}
        />
      </Suspense>
      
      <FolderSelectorDialog
          open={showFolderSelector}
          onOpenChange={setShowFolderSelector}
          onSelect={handleFolderSelect}
          actionType={currentAction}
          currentItemId={itemToMove?.id || itemToCopy?.id}
      />

      
      <ChangeIconDialog 
        item={itemForIconChange}
        onOpenChange={(isOpen) => !isOpen && setItemForIconChange(null)}
      />

      <AlertDialog open={!!itemToDelete} onOpenChange={(isOpen) => !isOpen && setItemToDelete(null)}>
        <AlertDialogContent className="w-[70vw] sm:max-w-[425px] p-0 border-slate-700 rounded-2xl bg-slate-900/70 backdrop-blur-xl shadow-lg text-white">
          <AlertDialogHeader className="p-6 pb-0">
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{itemToDelete?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="p-6 pt-4">
            <AlertDialogCancel asChild><Button variant="outline" className="rounded-xl">Cancel</Button></AlertDialogCancel>
            <AlertDialogAction asChild><Button variant="destructive" className="rounded-xl" onClick={handleDelete}>Delete</Button></AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
    </div>
  );
}
