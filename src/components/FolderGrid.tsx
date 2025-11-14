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
import { Folder as FolderIcon, Plus, UploadCloud, CheckSquare, Square, X as XIcon, Trash2, Move, Copy, Eye, EyeOff, Star, StarOff, MoreHorizontal } from 'lucide-react';
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
import { Skeleton } from './ui/skeleton';
import { where } from 'firebase/firestore';


const FilePreviewModal = dynamic(() => import('./FilePreviewModal').then(mod => mod.FilePreviewModal), {
    loading: () => <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><Skeleton className="w-3/4 h-3/4 rounded-lg bg-slate-800" /></div>,
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
  
  const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      zIndex: isDragging ? 1 : 'auto',
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

const BulkActionBar = ({ selectedItems, onClear, onBulkDelete, onBulkMove, onBulkCopy, onBulkToggleVisibility, onBulkToggleFavorite }: {
    selectedItems: Content[],
    onClear: () => void;
    onBulkDelete: () => void;
    onBulkMove: () => void;
    onBulkCopy: () => void;
    onBulkToggleVisibility: () => void;
    onBulkToggleFavorite: () => void;
}) => {
    const { can } = useAuthStore();

    const canDelete = selectedItems.every(item => can('canDelete', item.id));
    const canMove = selectedItems.every(item => can('canMove', item.id));
    const canCopy = selectedItems.every(item => can('canCopy', item.id));
    const canToggleVisibility = selectedItems.every(item => can('canToggleVisibility', item.id));

    return (
        <AnimatePresence>
            {selectedItems.length > 0 && (
                <motion.div
                    initial={{ y: '110%' }}
                    animate={{ y: '0%' }}
                    exit={{ y: '110%' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] md:w-auto z-20"
                >
                    <div className="glass-card p-2 flex items-center justify-between gap-2 rounded-2xl shadow-lg border-2 border-blue-500/50">
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-slate-300" onClick={onClear}>
                                <XIcon size={20} />
                            </Button>
                            <p className="text-sm font-semibold text-white">{selectedItems.length} selected</p>
                        </div>
                        <div className="flex items-center gap-1">
                            {canDelete && <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-red-400" onClick={onBulkDelete}><Trash2 size={18} /></Button>}
                            {canMove && <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={onBulkMove}><Move size={18} /></Button>}
                            {canCopy && <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={onBulkCopy}><Copy size={18} /></Button>}
                            {canToggleVisibility && <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={onBulkToggleVisibility}><Eye size={18} /></Button>}
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={onBulkToggleFavorite}><Star size={18} /></Button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

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
  const { can, user } = useAuthStore();
  const canReorder = can('canReorder', parentId);

  const { data: fetchedItems, loading } = useCollection<Content>('content', {
      where: where('parentId', '==', parentId),
      orderBy: ['order', 'asc']
  });
  
  const [hasInitialDataLoaded, setHasInitialDataLoaded] = useState(false);
  useEffect(() => {
    if (!loading) {
      setHasInitialDataLoaded(true);
    }
  }, [loading]);


  const [previewFile, setPreviewFile] = useState<Content | null>(null);
  const [itemToRename, setItemToRename] = useState<Content | null>(null);
  const [itemToMove, setItemToMove] = useState<Content | null>(null);
  const [itemToCopy, setItemToCopy] = useState<Content | null>(null);
  const [itemToDelete, setItemToDelete] = useState<Content | null>(null);
  const [itemsToDelete, setItemsToDelete] = useState<Content[]>([]);
  const [itemForIconChange, setItemForIconChange] = useState<Content | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [showFolderSelector, setShowFolderSelector] = useState(false);
  const [currentAction, setCurrentAction] = useState<'move' | 'copy' | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const dropZoneRef = useRef<HTMLDivElement>(null);
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
    const itemsToProcess = [...selectedItems].map(id => sortedItems.find(item => item.id === id)).filter(Boolean) as Content[];
    if (itemsToProcess.length === 0 || !currentAction) return;
    
    try {
        await Promise.all(itemsToProcess.map(item => {
            if (currentAction === 'move') return contentService.move(item.id, folder.id);
            return contentService.copy(item, folder.id);
        }));
        
        toast({ title: `Items ${currentAction === 'move' ? 'Moved' : 'Copied'}`, description: `${itemsToProcess.length} items have been processed.` });

    } catch (error: any) {
        console.error(`Failed to ${currentAction} items:`, error);
        toast({ variant: 'destructive', title: `Error`, description: error.message || 'An unknown error occurred.' });
    } finally {
        setShowFolderSelector(false);
        setCurrentAction(null);
        setSelectedItems(new Set());
        setIsSelectMode(false);
    }
  }, [currentAction, selectedItems, sortedItems, toast]);

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

  // Bulk actions
  const handleBulkDelete = () => {
    const toDelete = [...selectedItems].map(id => sortedItems.find(item => item.id === id)).filter(Boolean) as Content[];
    setItemsToDelete(toDelete);
  };
  
  const confirmBulkDelete = async () => {
    try {
      await Promise.all(itemsToDelete.map(item => contentService.delete(item.id)));
      toast({ title: 'Items Deleted', description: `${itemsToDelete.length} items have been deleted.` });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message || "Failed to delete some items." });
    } finally {
      setItemsToDelete([]);
      setSelectedItems(new Set());
      setIsSelectMode(false);
    }
  };

  const handleBulkToggleVisibility = async () => {
    const items = [...selectedItems].map(id => sortedItems.find(item => item.id === id)).filter(Boolean) as Content[];
    try {
      await Promise.all(items.map(item => contentService.toggleVisibility(item.id)));
      toast({ title: 'Visibility Updated', description: `Visibility for ${items.length} items has been toggled.` });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message || "Failed to update visibility." });
    } finally {
      setSelectedItems(new Set());
      setIsSelectMode(false);
    }
  };

  const handleBulkToggleFavorite = async () => {
    if (!user) return;
    const items = [...selectedItems].map(id => sortedItems.find(item => item.id === id)).filter(Boolean) as Content[];
    try {
      await Promise.all(items.map(item => contentService.toggleFavorite(user.id, item.id)));
      toast({ title: 'Favorites Updated', description: `Favorites for ${items.length} items have been updated.` });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message || "Failed to update favorites." });
    } finally {
      setSelectedItems(new Set());
      setIsSelectMode(false);
    }
  };
  

  const handleToggleSelectItem = useCallback((itemId: string, selected: boolean) => {
    setSelectedItems(prev => {
        const newSet = new Set(prev);
        if (selected) {
            newSet.add(itemId);
        } else {
            newSet.delete(itemId);
        }
        return newSet;
    });
  }, []);

  if (!hasInitialDataLoaded) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-2xl bg-slate-800/50" />
            ))}
        </div>
    );
  }
  
  if (itemsToRender.length === 0 && newUploads.length === 0) {
      return (
         <div 
            className="text-center py-16 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center h-full"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
             <FolderIcon className="mx-auto h-12 w-12 text-slate-500" />
             <h3 className="mt-4 text-lg font-semibold text-white">This folder is empty</h3>
             <p className="mt-2 text-sm text-slate-400">
               Drag and drop files here, or use the button to add content.
             </p>
             {can('canAddFolder', parentId) && (
               <div className="mt-6 flex items-center gap-4">
                  <AddContentMenu
                    parentId={parentId}
                    onFileSelected={onFileSelected}
                    trigger={
                      <Button className="rounded-2xl active:scale-95 transition-transform">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Content
                      </Button>
                    }
                  />
                  {can('canSelectItem', null) && (
                    <Button variant="outline" onClick={() => setIsSelectMode(true)}>
                        <CheckSquare className="mr-2 h-4 w-4" />
                        Select Items
                    </Button>
                  )}
                </div>
             )}
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

      {can('canSelectItem', null) && (
        <div className="flex justify-end mb-4 pr-1">
          <Button variant="outline" onClick={() => setIsSelectMode(!isSelectMode)} size="sm" className="rounded-full">
              {isSelectMode ? (
                  <>
                      <XIcon className="mr-2 h-4 w-4"/>
                      Cancel Selection
                  </>
              ) : (
                  <>
                      <CheckSquare className="mr-2 h-4 w-4" />
                      Select Items
                  </>
              )}
          </Button>
        </div>
      )}
       
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

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sortedItems.map(i => i.id)} strategy={isSubjectView ? rectSortingStrategy : verticalListSortingStrategy} disabled={!canReorder}>
          <motion.div 
            className={cn(isSubjectView ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" : "flex flex-col")}
            variants={listVariants}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence>
              {itemsToRender.map(({ item, uploadingFile }, index) => (
                <motion.div
                  key={item.id}
                  variants={itemVariants}
                  custom={index}
                   className={cn(!isSubjectView && "border-b border-white/10 last:border-b-0", isSelectMode && 'pr-8')}
                >
                  <SortableItemWrapper id={item.id} isSubjectView={isSubjectView}>
                     <div className="relative flex items-center gap-2">
                        {isSelectMode && (
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10">
                              <Button
                                  variant="ghost"
                                  size="icon"
                                  className="w-8 h-8 rounded-full"
                                  onClick={() => handleToggleSelectItem(item.id, !selectedItems.has(item.id))}
                              >
                                  {selectedItems.has(item.id) ? <CheckSquare className="text-blue-400" /> : <Square className="text-slate-500" />}
                              </Button>
                          </div>
                        )}
                        {(() => {
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
                                        isSelectMode={isSelectMode}
                                        isSelected={selectedItems.has(item.id)}
                                        onToggleSelect={handleToggleSelectItem}
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
                                        isSelectMode={isSelectMode}
                                        isSelected={selectedItems.has(item.id)}
                                        onToggleSelect={handleToggleSelectItem}
                                    />
                                );
                          }
                        })()}
                    </div>
                  </SortableItemWrapper>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </SortableContext>
      </DndContext>

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

        <AlertDialog open={itemsToDelete.length > 0} onOpenChange={(isOpen) => !isOpen && setItemsToDelete([])}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete {itemsToDelete.length} selected item(s). This cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmBulkDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

         <BulkActionBar
            selectedItems={sortedItems.filter(item => selectedItems.has(item.id))}
            onClear={() => { setSelectedItems(new Set()); setIsSelectMode(false); }}
            onBulkDelete={handleBulkDelete}
            onBulkMove={() => { setCurrentAction('move'); setShowFolderSelector(true); }}
            onBulkCopy={() => { setCurrentAction('copy'); setShowFolderSelector(true); }}
            onBulkToggleVisibility={handleBulkToggleVisibility}
            onBulkToggleFavorite={handleBulkToggleFavorite}
        />
    </div>
  );
}
