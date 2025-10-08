
'use client';
import { useEffect, useState, useRef, Dispatch, SetStateAction } from 'react';
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
import { Folder as FolderIcon, Plus, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { UploadingFile, UploadProgress } from './UploadProgress';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useToast } from '@/hooks/use-toast';
import { AddContentMenu } from './AddContentMenu';
import { useIsMobile } from '@/hooks/use-mobile';
import React from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { ChangeIconDialog } from './ChangeIconDialog';


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

const listVariants = (isMobile: boolean) => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: isMobile ? undefined : 0.02,
    },
  },
});

const itemVariants = (isMobile: boolean) => ({
  hidden: { opacity: 0, y: isMobile ? 0 : 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15 } },
  exit: { opacity: 0, y: isMobile ? 0 : -8, transition: { duration: 0.15 } }
});

const SortableItemWrapper = ({ id, children }: { id: string, children: React.ReactNode }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
    transition,
    zIndex: isDragging ? 1 : 0,
    position: 'relative' as const,
  };
  const { user } = useUser();
  const isAdmin = user?.uid === process.env.NEXT_PUBLIC_ADMIN_UID;
  
  const isFolder = (children as React.ReactElement)?.props?.item?.type === 'FOLDER';

  const childrenWithProps = React.cloneElement(children as React.ReactElement, {
    ...((children as React.ReactElement).props),
    showDragHandle: !isFolder && isAdmin,
  });

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...(isAdmin ? listeners : {})}>
      {childrenWithProps}
    </div>
  );
};


const SortableList = ({
    items,
    uploadingFiles,
    onItemClick,
    onRenameClick,
    onDeleteClick,
    onIconChangeClick,
    isSubjectView,
    isMobile,
    onDragEnd,
    onRetry,
    onRemove
}: {
    items: Content[];
    uploadingFiles: UploadingFile[];
    onItemClick: (item: Content) => void;
    onRenameClick: (item: Content) => void;
    onDeleteClick: (item: Content) => void;
    onIconChangeClick: (item: Content) => void;
    isSubjectView: boolean;
    isMobile: boolean;
    onDragEnd: (event: DragEndEvent) => void;
    onRetry: (fileId: string) => void;
    onRemove: (fileId: string) => void;
}) => {
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
    const containerClasses = isSubjectView
        ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
        : "flex flex-col";

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                <motion.div className={containerClasses} variants={listVariants(isMobile)} initial="hidden" animate="visible">
                    <AnimatePresence>
                        {uploadingFiles.map(file => (
                          <motion.div
                             key={file.id}
                              variants={itemVariants(isMobile)}
                              exit="exit"
                              className={cn(isMobile && "px-4")}
                          >
                              {/* This component is not sortable, so it's outside the SortableItemWrapper */}
                              <UploadProgress file={file} onRetry={onRetry} onRemove={onRemove} />
                          </motion.div>
                        ))}
                        {items.map((it: Content, index: number) => {
                            const itemKey = it.id;
                            const isLastItem = index === items.length - 1;

                            let content;
                            if (it.type === 'SUBJECT') {
                                content = <SubjectCard subject={it} />;
                            } else if (it.type === 'FOLDER') {
                                content = <FolderCard
                                    item={it}
                                    onRename={() => onRenameClick(it)}
                                    onDelete={() => onDeleteClick(it)}
                                    onIconChange={() => onIconChangeClick(it)}
                                    displayAs={isSubjectView ? 'grid' : 'list'}
                                />;
                            } else if (it.type === 'FILE' || it.type === 'LINK') {
                                content = <FileCard
                                    item={it}
                                    onFileClick={onItemClick}
                                    onRename={() => onRenameClick(it)}
                                    onDelete={() => onDeleteClick(it)}
                                    showDragHandle={!isMobile}
                                />;
                            } else {
                                content = null;
                            }
                            
                             if (isMobile) {
                                return (
                                   <div
                                      key={itemKey}
                                      className={cn("border-white/10", !isLastItem && "border-b")}
                                    >
                                      {content}
                                    </div>
                                );
                            }

                            return (
                                <motion.div
                                    key={itemKey}
                                    variants={itemVariants(isMobile)}
                                    exit="exit"
                                    className={cn(!isSubjectView && "border-white/10", !isSubjectView && !isLastItem && "border-b")}
                                >
                                    {isSubjectView ? <motion.div variants={itemVariants(isMobile)}>{content}</motion.div> : <SortableItemWrapper id={it.id}>{content}</SortableItemWrapper>}
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </motion.div>
            </SortableContext>
        </DndContext>
    )
}

const NonSortableList = ({
    items,
    uploadingFiles,
    onItemClick,
    onRenameClick,
    onDeleteClick,
    onIconChangeClick,
    isSubjectView,
    isMobile,
    onRetry,
    onRemove
}: {
    items: Content[];
    uploadingFiles: UploadingFile[];
    onItemClick: (item: Content) => void;
    onRenameClick: (item: Content) => void;
    onDeleteClick: (item: Content) => void;
    onIconChangeClick: (item: Content) => void;
    isSubjectView: boolean;
    isMobile: boolean;
    onRetry: (fileId: string) => void;
    onRemove: (fileId: string) => void;
}) => {
    const containerClasses = isSubjectView
        ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
        : "flex flex-col";
    
    return (
        <motion.div className={containerClasses} variants={listVariants(isMobile)} initial="hidden" animate="visible">
            <AnimatePresence>
                {uploadingFiles.map(file => (
                    <motion.div
                        key={file.id}
                        variants={itemVariants(isMobile)}
                        exit="exit"
                        // No extra padding on mobile for non-sortable list either
                    >
                        <UploadProgress file={file} onRetry={onRetry} onRemove={onRemove} />
                    </motion.div>
                ))}
                {items.map((it, index) => {
                     const itemKey = it.id;
                     const isLastItem = index === items.length - 1;
 
                     let content;
                     if (it.type === 'SUBJECT') {
                         content = <SubjectCard subject={it} />;
                     } else if (it.type === 'FOLDER') {
                         content = <FolderCard
                             item={it}
                             onRename={() => onRenameClick(it)}
                             onDelete={() => onDeleteClick(it)}
                             onIconChange={() => onIconChangeClick(it)}
                             displayAs={isSubjectView ? 'grid' : 'list'}
                         />;
                     } else if (it.type === 'FILE' || it.type === 'LINK') {
                         content = <FileCard
                             item={it}
                             onFileClick={onItemClick}
                             onRename={() => onRenameClick(it)}
                             onDelete={() => onDeleteClick(it)}
                             showDragHandle={false} // No drag handle for non-admins
                         />;
                     } else {
                         content = null;
                     }
 
                     return (
                         <motion.div
                             key={itemKey}
                             variants={itemVariants(isMobile)}
                             exit="exit"
                             // Add border here for mobile consistency
                             className={cn("border-white/10", !isSubjectView && !isLastItem && "border-b")}
                         >
                             {content}
                         </motion.div>
                     );
                })}
            </AnimatePresence>
        </motion.div>
    );
};


export function FolderGrid({ 
    parentId, 
    uploadingFiles, 
    onFileSelected, 
    onRetry, 
    onRemove 
}: { 
    parentId: string, 
    uploadingFiles: UploadingFile[], 
    onFileSelected: (file: File) => void,
    onRetry: (fileId: string) => void,
    onRemove: (fileId: string) => void,
}) {
  const { data: fetchedItems, loading } = useCollection<Content>('content', {
      where: ['parentId', '==', parentId],
      orderBy: ['order', 'asc']
  });
  const [items, setItems] = useState<Content[]>([]);

  const [previewFile, setPreviewFile] = useState<Content | null>(null);
  const [itemToRename, setItemToRename] = useState<Content | null>(null);
  const [itemToDelete, setItemToDelete] = useState<Content | null>(null);
  const [itemForIconChange, setItemForIconChange] = useState<Content | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { user } = useUser();
  const isAdmin = user?.uid === process.env.NEXT_PUBLIC_ADMIN_UID;

  useEffect(() => {
    if (fetchedItems) {
      setItems(fetchedItems);
    } else {
      setItems([]);
    }
  }, [fetchedItems]);

  const handleFileClick = (file: Content) => {
    if (file.type === 'LINK') {
        if(file.metadata?.url) {
            window.open(file.metadata.url, '_blank');
        }
        return;
    }
    // Always open in-app preview now
    setPreviewFile(file);
  };

  const handleRename = async (newName: string) => {
    if (!itemToRename) return;
    await contentService.rename(itemToRename.id, newName);
    toast({ title: "Renamed", description: `"${itemToRename.name}" was renamed to "${newName}".` });
    setItemToRename(null);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    await contentService.delete(itemToDelete.id);
    toast({ title: "Deleted", description: `"${itemToDelete.name}" has been deleted.` });
    setItemToDelete(null);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isAdmin) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isAdmin) return;
    e.preventDefault();
    e.stopPropagation();
    const dropZoneNode = dropZoneRef.current;
    if (dropZoneNode && !dropZoneNode.contains(e.relatedTarget as Node)) {
        setIsDraggingOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isAdmin) return;
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    if (!isAdmin) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      for (const file of Array.from(files)) {
        onFileSelected(file);
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!isAdmin) return;
    const { active, over } = event;
    if (over && active.id !== over.id) {
        setItems(currentItems => {
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
  
  const renderList = () => {
    const listProps = {
        items: items,
        uploadingFiles,
        onItemClick: handleFileClick,
        onRenameClick: (item: Content) => setItemToRename(item),
        onDeleteClick: (item: Content) => setItemToDelete(item),
        onIconChangeClick: (item: Content) => setItemForIconChange(item),
        isSubjectView,
        isMobile,
        onRetry,
        onRemove,
    };
    
    if (isAdmin) {
      return <SortableList {...listProps} onDragEnd={handleDragEnd} />;
    }
    return <NonSortableList {...listProps} />;
  }


  return (
    <div
        ref={dropZoneRef}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn("h-full", isDraggingOver && "opacity-50")}
    >
      <DropZone isVisible={isDraggingOver} />

      {loading && items.length === 0 && (
         <div className="text-center py-16">
            {/* No skeletons, just empty space while loading, content will pop in. */}
        </div>
      )}

      {!loading && items.length === 0 && uploadingFiles.length === 0 && (
         <div className="text-center py-16 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center h-full">
              <FolderIcon className="mx-auto h-12 w-12 text-slate-500" />
              <h3 className="mt-4 text-lg font-semibold text-white">This folder is empty</h3>
              <p className="mt-2 text-sm text-slate-400">
                {isAdmin ? "Drag and drop files here, or use the button to add content." : "No content has been added to this folder yet."}
              </p>
              {isAdmin && (
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

      {(items.length > 0 || uploadingFiles.length > 0) && renderList()}

      <FilePreviewModal
        item={previewFile}
        onOpenChange={(isOpen) => !isOpen && setPreviewFile(null)}
      />

      {isAdmin && (
        <>
          <RenameDialog
            item={itemToRename}
            onOpenChange={(isOpen) => !isOpen && setItemToRename(null)}
            onRename={handleRename}
          />

          <ChangeIconDialog 
            item={itemForIconChange}
            onOpenChange={(isOpen) => !isOpen && setItemForIconChange(null)}
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
        </>
      )}
    </div>
  );
}
