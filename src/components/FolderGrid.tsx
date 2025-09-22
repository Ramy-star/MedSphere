'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { contentService, ContentItem } from '@/lib/contentService';
import { FolderCard } from './FolderCard';
import { FileCard } from './FileCard';
import { FilePreviewModal } from './FilePreviewModal';

export function FolderGrid({ parentId }: { parentId: string | null }) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<ContentItem | null>(null);

  useEffect(() => {
    async function fetchItems() {
      setLoading(true);
      const fetchedItems = await contentService.getChildren(parentId);
      setItems(fetchedItems);
      setLoading(false);
    }
    fetchItems();
  }, [parentId]);

  const handleFileClick = (file: ContentItem) => {
    setPreviewFile(file);
  };

  if (loading && items.length === 0) return <div className="text-center text-slate-400">Loading...</div>;

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
                <FolderCard item={it} />
              ) : (
                <FileCard item={it} onFileClick={handleFileClick} />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <FilePreviewModal
        item={previewFile}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setPreviewFile(null);
          }
        }}
      />
    </div>
  );
}
