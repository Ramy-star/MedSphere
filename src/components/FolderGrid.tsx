'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { contentService, ContentItem } from '@/lib/contentService';
import { FolderCard } from './FolderCard';
import { FileCard } from './FileCard';
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
import { Folder as FolderIcon, Plus } from 'lucide-react';

export function FolderGrid({ parentId, onAddContentClick }: { parentId: string | null, onAddContentClick?: () => void }) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<ContentItem | null>(null);
  const [itemToRename, setItemToRename] = useState<ContentItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<ContentItem | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    const fetchedItems = await contentService.getChildren(parentId);
    setItems(fetchedItems);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, [parentId]);

  const handleFileClick = (file: ContentItem) => {
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
          {onAddContentClick && (
            <Button onClick={onAddContentClick} className="mt-6 rounded-xl">
              <Plus className="mr-2 h-4 w-4" />
              Add Content
            </Button>
          )}
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <AnimatePresence>
          {items.map((it: ContentItem, index) => (
            <motion.div key={it.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.15, delay: index * 0.02 }}
            >
              {it.type === 'FOLDER' ? (
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
