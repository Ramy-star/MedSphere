'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense, useCallback } from 'react';
import { search } from '@/ai/flows/search-flow';
import { Breadcrumbs } from '@/components/breadcrumbs';
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
import React from 'react';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUser } from '@/firebase/auth/use-user';
import { ChangeIconDialog } from '@/components/ChangeIconDialog';
import { motion } from 'framer-motion';

function SearchResults() {
    const searchParams = useSearchParams();
    const query = searchParams.get('q');
    const [results, setResults] = useState<Content[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const isMobile = useIsMobile();
    const { user } = useUser();
    const isAdmin = user?.uid === process.env.NEXT_PUBLIC_ADMIN_UID;
    
    const { data: allItems, loading: loadingAllItems } = useCollection<Content>('content');

    const [previewFile, setPreviewFile] = useState<Content | null>(null);
    const [itemToRename, setItemToRename] = useState<Content | null>(null);
    const [itemToDelete, setItemToDelete] = useState<Content | null>(null);
    const [itemForIconChange, setItemForIconChange] = useState<Content | null>(null);
    const { toast } = useToast();
    
    const performSearch = useCallback(async () => {
        if (!query || !allItems) {
            setResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const searchResults = await search(query, allItems);
            setResults(searchResults);
        } catch (error) {
            console.error("Search failed:", error);
            setResults([]);
        } finally {
            setIsSearching(false);
        }
    }, [query, allItems]);
    
    useEffect(() => {
        performSearch();
    }, [performSearch]);

    const handleFileClick = (item: Content) => {
        if (item.type === 'LINK') {
            if(item.metadata?.url) window.open(item.metadata.url, '_blank');
            return;
        }
        if (isMobile) {
            if(item.metadata?.storagePath) window.open(item.metadata.storagePath, '_blank');
        } else {
            setPreviewFile(item);
        }
    };
    
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

    const loading = isSearching || loadingAllItems;


    return (
        <motion.main 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1 p-6 flex flex-col overflow-hidden"
        >
            <Breadcrumbs />

            <h2 className="text-2xl font-bold text-white mt-6 mb-4">
                {loading ? 'Searching...' : `Found ${results.length} results for "${query}"`}
            </h2>

            <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                {loading && !results.length ? (
                    <div className="text-center text-slate-400">Searching...</div>
                ) : (
                    <div className="flex flex-col">
                        {results.length > 0 ? (
                            results.map((item) => (
                                 <div
                                    key={item.id}
                                    className="border-b border-white/10"
                                >
                                    {(item.type === 'FILE' || item.type === 'LINK') && (
                                         <FileCard
                                            item={item}
                                            onFileClick={() => handleFileClick(item)}
                                            onRename={() => setItemToRename(item)}
                                            onDelete={() => setItemToDelete(item)}
                                         />
                                    )}
                                    {item.type === 'FOLDER' && (
                                         <FolderCard 
                                            item={item}
                                            onRename={() => setItemToRename(item)}
                                            onDelete={() => setItemToDelete(item)}
                                            onIconChange={() => setItemForIconChange(item)}
                                            displayAs='list'
                                        />
                                    )}
                                    {item.type === 'SUBJECT' && (
                                        <div className="py-2">
                                            <SubjectCard subject={item} />
                                        </div>
                                    )}
                                     {item.type === 'SEMESTER' && (
                                         <Link href={`/folder/${item.id}`}>
                                            <div className="glass-card p-4 group hover:bg-white/10 transition-colors cursor-pointer my-1.5">
                                                <h3 className="text-lg font-semibold text-white">{item.name}</h3>
                                            </div>
                                        </Link>
                                    )}
                                     {item.type === 'LEVEL' && (
                                         <Link href={`/level/${encodeURIComponent(item.name)}`}>
                                            <div className="glass-card p-4 group hover:bg-white/10 transition-colors cursor-pointer my-1.5">
                                                <h3 className="text-lg font-semibold text-white">{item.name}</h3>
                                            </div>
                                        </Link>
                                    )}
                                </div>
                            ))
                        ) : (
                            !loading && query && <p className="text-slate-400">No results found.</p>
                        )}
                    </div>
                )}
            </div>
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
                          This will permanently delete "{itemToDelete?.name}" and all its contents. This action cannot be undone.
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
        </motion.main>
    );
}

// Need to wrap with suspense for useSearchParams
export default function SearchPage() {
    return (
        <Suspense fallback={null}>
            <SearchResults />
        </Suspense>
    )
}
