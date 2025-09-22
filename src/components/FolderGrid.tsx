
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
import { Folder as FolderIcon, FolderPlus, Plus, Upload } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { NewFolderDialog } from './new-folder-dialog';
import { saveFile as saveFileToDb } from '@/lib/indexedDBService';


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


export function FolderGrid({ parentId }: { parentId: string | null }) {
  const [items, setItems] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<Content | null>(null);
  const [itemToRename, setItemToRename] = useState<Content | null>(null);
  const [itemToDelete, setItemToDelete] = useState<Content | null>(null);

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

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 border-2 border-dashed border-slate-700 rounded-xl animate-fade-in flex flex-col items-center justify-center" style={{ animationDelay: '0.15s' }}>
          <FolderIcon className="mx-auto h-12 w-12 text-slate-500" />
          <h3 className="mt-4 text-lg font-semibold text-white">This folder is empty</h3>
          <p className="mt-2 text-sm text-slate-400">Get started by adding folders or files.</p>
          <AddContentMenu 
            parentId={parentId}
            onContentAdded={fetchItems}
            trigger={
              <Button className="mt-6 rounded-xl">
                <Plus className="mr-2 h-4 w-4" />
                Add Content
              </Button>
            }
          />
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <AnimatePresence>
          {items.map((it: Content, index) => (
            <motion.div key={it.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.15, delay: index * 0.02 }}
            >
              {it.type === 'SUBJECT' ? (
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
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
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
