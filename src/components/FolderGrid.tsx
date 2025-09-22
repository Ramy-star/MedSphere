
'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
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
import { Folder as FolderIcon, FolderPlus, Plus, Upload, UploadCloud, GripVertical } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { NewFolderDialog } from './new-folder-dialog';
import { saveFile as saveFileToDb, getFile } from '@/lib/indexedDBService';
import { cn } from '@/lib/utils';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


type AddContentMenuProps = {
  parentId: string | null;
  onContentAdded: () => void;
  trigger: React.ReactNode;
}

function AddContentMenu({ parentId, onContentAdded, trigger }: AddContentMenuProps) {
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleAddFolder = async (folderName: string) => {
    await contentService.createFolder(parentId, folderName);
    onContentAdded();
    setPopoverOpen(false);
  };

  const handleUploadFile = async (file: File) => {
    const newFileItem = await contentService.uploadFile(parentId, { name: file.name, size: file.size, mime: file.type });
    await saveFileToDb(newFileItem.id, file);
    onContentAdded();
    setPopoverOpen(false);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleUploadFile(file);
    }
  };

  const menuItems = [
      {
          label: "New Folder",
          icon: FolderPlus,
          action: () => setShowNewFolderDialog(true),
      },
      {
          label: "Upload File",
          icon: Upload,
          action: handleUploadClick,
      }
  ]

  return (
    <>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange}
        className="hidden" 
      />
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          {trigger}
        </PopoverTrigger>
        <PopoverContent 
          className="w-56 p-0 border-slate-700 rounded-2xl bg-gradient-to-b from-slate-800/80 to-slate-900/70 backdrop-blur-lg shadow-lg shadow-blue-500/10" 
          align="end"
        >
            <div className="p-2 space-y-1">
              <p className="px-2 py-1 text-sm font-semibold text-slate-300">Create New</p>
              {menuItems.map((item) => (
                  <div 
                      key={item.label}
                      onClick={item.action}
                      className="flex items-center gap-3 p-2 rounded-lg text-sm text-slate-200 hover:bg-white/10 cursor-pointer transition-colors"
                  >
                      <item.icon className="h-4 w-4 text-slate-400" />
                      <span>{item.label}</span>
                  </div>
              ))}
          </div>
        </PopoverContent>
      </Popover>
      <NewFolderDialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog} onAddFolder={handleAddFolder} />
    </>
  );
}

function DropZone({ isVisible }: { isVisible: boolean }) {
  if (!isVisible) return null;
  return (
    <div className="absolute inset-0 bg-blue-900/10 backdrop-blur-sm flex items-center justify-center border-4 border-dashed border-blue-500 rounded-2xl z-10 pointer-events-none">
        <div className="text-center text-white">
            <UploadCloud className="mx-auto h-16 w-16 mb-4" />
            <h3 className="text-2xl font-bold">Drop files to upload</h3>
            <p className="text-blue-200">Release to start uploading your files</p>
        </div>
    </div>
  );
}

const SortableItemWrapper = ({ id, children }: { id: string, children: React.ReactNode }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="flex items-center w-full">
        <GripVertical className="h-5 w-5 text-slate-500 mr-2 shrink-0 cursor-grab touch-none" />
        <div className="flex-1">
            {children}
        </div>
    </div>
  );
};

export function FolderGrid({ parentId, onContentAdded }: { parentId: string | null, onContentAdded: () => void }) {
  const [items, setItems] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<Content | null>(null);
  const [itemToRename, setItemToRename] = useState<Content | null>(null);
  const [itemToUpdate, setItemToUpdate] = useState<Content | null>(null);
  const [itemToDelete, setItemToDelete] = useState<Content | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const updateFileRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const fetchedItems = await contentService.getChildren(parentId);
    setItems(fetchedItems);
    setLoading(false);
  }, [parentId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleFileClick = (file: Content) => {
    setPreviewFile(file);
  };

  const handleRename = async (newName: string) => {
    if (!itemToRename) return;
    await contentService.rename(itemToRename.id, newName);
    setItemToRename(null);
    await fetchItems();
  };
  
  const handleDelete = async () => {
    if (!itemToDelete) return;
    await contentService.delete(itemToDelete.id);
    setItemToDelete(null);
    await fetchItems();
  };
  
  const handleUpdateClick = (item: Content) => {
    setItemToUpdate(item);
    updateFileRef.current?.click();
  };
  
  const handleDownloadClick = async (item: Content) => {
    if (item.type !== 'FILE') return;
    const file = await getFile(item.id);
    if (file) {
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = item.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // Fallback for seeded images or if not in IndexedDB
      if (item.metadata?.mime?.startsWith('image/')) {
        const url = `https://picsum.photos/seed/${item.id}/1280/720`;
        const link = document.createElement('a');
        link.href = url;
        link.download = item.name;
        link.target = '_blank'; // Might be needed for cross-origin
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  }


  const handleFileUpdate = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && itemToUpdate) {
      await contentService.updateFileContent(itemToUpdate.id, { name: file.name, size: file.size, mime: file.type });
      await saveFileToDb(itemToUpdate.id, file);
      setItemToUpdate(null);
      await fetchItems();
    }
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
    // Check if the leave event is heading outside the drop zone area
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
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
      setLoading(true);
      for (const file of Array.from(files)) {
        const newFileItem = await contentService.uploadFile(parentId, { name: file.name, size: file.size, mime: file.type });
        await saveFileToDb(newFileItem.id, file);
      }
      await fetchItems(); // This already sets loading to false
    }
  };
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setItems((currentItems) => {
        const oldIndex = currentItems.findIndex((item) => item.id === active.id);
        const newIndex = currentItems.findIndex((item) => item.id === over?.id);
        if (oldIndex === -1 || newIndex === -1) return currentItems;
        return arrayMove(currentItems, oldIndex, newIndex);
      });
      // Here you would typically call a service to persist the new order.
      // e.g., contentService.updateOrder(newlyOrderedItems);
    }
  };

  const isSubjectView = items.length > 0 && items.every(it => it.type === 'SUBJECT');

  const containerClasses = isSubjectView 
    ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
    : "flex flex-col gap-2";

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
      <input type="file" ref={updateFileRef} className="hidden" onChange={handleFileUpdate} />
      
      {loading && (
        <div className={isSubjectView ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" : "space-y-2"}>
          {[...Array(isSubjectView ? 4 : 3)].map((_, i) => (
            <Skeleton key={i} className={`${isSubjectView ? "h-28" : "h-14"} w-full rounded-xl`} />
          ))}
        </div>
      )}

      {!loading && items.length === 0 && (
         <div className="text-center py-16 border-2 border-dashed border-slate-700 rounded-xl animate-fade-in flex flex-col items-center justify-center h-full" style={{ animationDelay: '0.15s' }}>
              <FolderIcon className="mx-auto h-12 w-12 text-slate-500" />
              <h3 className="mt-4 text-lg font-semibold text-white">This folder is empty</h3>
              <p className="mt-2 text-sm text-slate-400">Drag and drop files here, or use the button to add content.</p>
              <AddContentMenu 
                parentId={parentId}
                onContentAdded={onContentAdded}
                trigger={
                  <Button className="mt-6 rounded-xl">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Content
                  </Button>
                }
              />
          </div>
      )}
      
      {!loading && items.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <div className={containerClasses}>
                <AnimatePresence>
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
                        onDownload={() => handleDownloadClick(it)}
                      />
                    );

                    return (
                        <motion.div key={it.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            transition={{ duration: 0.15, delay: index * 0.02 }}
                        >
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
              This will permanently delete "{itemToDelete?.name}" and all its contents. This action cannot be undone.
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
