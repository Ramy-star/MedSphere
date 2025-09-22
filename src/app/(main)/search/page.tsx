
'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense, useCallback } from 'react';
import { search } from '@/ai/flows/search-flow';
import { Skeleton } from '@/components/ui/skeleton';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { motion } from 'framer-motion';
import { FileCard } from '@/components/FileCard';
import { FolderCard } from '@/components/FolderCard';
import { SubjectCard } from '@/components/subject-card';
import { contentService, Content } from '@/lib/contentService';
import Link from 'next/link';
import { FilePreviewModal } from '@/components/FilePreviewModal';
import { RenameDialog } from '@/components/RenameDialog';
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
import { Button } from '@/components/ui/button';
import { saveFile as saveFileToDb, getFile } from '@/lib/indexedDBService';
import React from 'react';

function SearchResults() {
    const searchParams = useSearchParams();
    const query = searchParams.get('q');
    const [results, setResults] = useState<Content[]>([]);
    const [loading, setLoading] = useState(false);
    const [allItems, setAllItems] = useState<Content[]>([]);

    const [previewFile, setPreviewFile] = useState<Content | null>(null);
    const [itemToRename, setItemToRename] = useState<Content | null>(null);
    const [itemToUpdate, setItemToUpdate] = useState<Content | null>(null);
    const [itemToDelete, setItemToDelete] = useState<Content | null>(null);
    const updateFileRef = React.useRef<HTMLInputElement>(null);

    const performSearch = useCallback(async () => {
        if (!query || allItems.length === 0) {
            setResults([]);
            return;
        }
        setLoading(true);
        try {
            const searchResults = await search(query, allItems);
            setResults(searchResults);
        } catch (error) {
            console.error("Search failed:", error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, [query, allItems]);
    
    const reloadAllContent = useCallback(async () => {
        setLoading(true);
        const allContent = await contentService.getAll();
        setAllItems(allContent);
    }, []);

    useEffect(() => {
        reloadAllContent();
    }, [reloadAllContent]);

    useEffect(() => {
        performSearch();
    }, [performSearch]);

    const handleAction = useCallback(() => {
      reloadAllContent().then(() => {
        // The search will be re-triggered by the useEffect watching allItems
      });
    }, [reloadAllContent]);
    
    const handleRename = async (newName: string) => {
        if (!itemToRename) return;
        await contentService.rename(itemToRename.id, newName);
        setItemToRename(null);
        handleAction();
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        await contentService.delete(itemToDelete.id);
        setItemToDelete(null);
        handleAction();
    };

    const handleUpdateClick = (item: Content) => {
        setItemToUpdate(item);
        updateFileRef.current?.click();
    };

    const handleFileUpdate = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && itemToUpdate) {
            await contentService.updateFileContent(itemToUpdate.id, { name: file.name, size: file.size, mime: file.type });
            await saveFileToDb(itemToUpdate.id, file);
            setItemToUpdate(null);
            handleAction();
        }
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


    return (
        <main className="flex-1 p-6 space-y-6 animate-fade-in flex flex-col">
            <input type="file" ref={updateFileRef} className="hidden" onChange={handleFileUpdate} />
            <Breadcrumbs current={{ id: 'search', name: `Search: "${query}"`, type: 'FOLDER', parentId: 'root' }} ancestors={[{ id: 'root', name: 'Home', type: 'FOLDER', parentId: null }]} />

            <h2 className="text-2xl font-bold text-white">
                {loading && !results.length ? 'Searching...' : `Found ${results.length} results for "${query}"`}
            </h2>

            {loading && !results.length ? (
                <div className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                </div>
            ) : (
                <div className="space-y-3">
                    {results.length > 0 ? (
                        results.map((item, index) => (
                             <motion.div
                                key={`${item.id}-${index}`}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.15, delay: index * 0.03 }}
                            >
                                {item.type === 'FILE' && (
                                     <FileCard
                                        item={item}
                                        onFileClick={() => setPreviewFile(item)}
                                        onRename={() => setItemToRename(item)}
                                        onDelete={() => setItemToDelete(item)}
                                        onUpdate={() => handleUpdateClick(item)}
                                        onDownload={() => handleDownloadClick(item)}
                                     />
                                )}
                                {item.type === 'FOLDER' && (
                                     <FolderCard 
                                        item={item}
                                        onRename={() => setItemToRename(item)}
                                        onDelete={() => setItemToDelete(item)}
                                    />
                                )}
                                {item.type === 'SUBJECT' && (
                                     <SubjectCard subject={item} />
                                )}
                                 {item.type === 'SEMESTER' && (
                                     <Link href={`/folder/${item.id}`}>
                                        <div className="glass-card p-4 group hover:bg-white/10 transition-colors cursor-pointer">
                                            <h3 className="text-lg font-semibold text-white">{item.name}</h3>
                                        </div>
                                    </Link>
                                )}
                                {item.type === 'LEVEL' && (
                                     <Link href={`/level/${encodeURIComponent(item.name)}`}>
                                        <div className="glass-card p-4 group hover:bg-white/10 transition-colors cursor-pointer">
                                            <h3 className="text-lg font-semibold text-white">{item.name}</h3>
                                        </div>
                                    </Link>
                                )}
                            </motion.div>
                        ))
                    ) : (
                        !loading && query && <p className="text-slate-400">No results found.</p>
                    )}
                </div>
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
        </main>
    );
}

// Need to wrap with suspense for useSearchParams
export default function SearchPage() {
    return (
        <Suspense fallback={<div className="flex-1 p-6"><Skeleton className="h-8 w-48 mb-6" /><Skeleton className="h-40 w-full" /></div>}>
            <SearchResults />
        </Suspense>
    )
}

    