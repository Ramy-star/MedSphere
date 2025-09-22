'use client';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { contentService, ContentItem } from '@/lib/contentService';
import { FolderCard } from './FolderCard';
import { FileCard } from './FileCard';
import { Button } from './ui/button';
import { Plus } from 'lucide-react';
import { NewFolderDialog } from './new-folder-dialog';

export function FolderGrid({ parentId }: { parentId: string | null }) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);

  useEffect(() => {
    async function fetchItems() {
      setLoading(true);
      const fetchedItems = await contentService.getChildren(parentId);
      setItems(fetchedItems);
      setLoading(false);
    }
    fetchItems();
  }, [parentId]);

  const handleAddFolder = async (folderName: string) => {
    setLoading(true);
    await contentService.createFolder(parentId, folderName);
    const fetchedItems = await contentService.getChildren(parentId);
    setItems(fetchedItems);
    setLoading(false);
  };

  if (loading && items.length === 0) return <div className="text-center text-slate-400">Loading...</div>;

  return (
    <div>
      <div className="flex justify-end items-center mb-4">
        <Button onClick={() => setShowNewFolderDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Content
        </Button>
      </div>

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
                <FolderCard item={it} />
              ) : (
                <FileCard item={it} />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

       {items.length === 0 && !loading && (
        <div className="text-center py-16 border-2 border-dashed border-slate-700 rounded-xl">
          <h3 className="text-lg font-semibold text-white">This folder is empty</h3>
          <p className="mt-2 text-sm text-slate-400">Get started by adding a new folder or file.</p>
        </div>
      )}

      <NewFolderDialog 
        open={showNewFolderDialog} 
        onOpenChange={setShowNewFolderDialog} 
        onAddFolder={handleAddFolder} 
      />
    </div>
  );
}
