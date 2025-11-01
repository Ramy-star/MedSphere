
'use client';

import { useSearchParams } from 'next/navigation';
import React, { useEffect, useState, Suspense, useCallback } from 'react';
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
import { useCollection } from '@/firebase/firestore/use-collection';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuthStore } from '@/stores/auth-store';
import { ChangeIconDialog } from '@/components/ChangeIconDialog';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SearchX } from 'lucide-react';
import { useRouter } from 'next/navigation';

function SearchResults() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const query = searchParams.get('q');
    const [results, setResults] = useState<Content[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const isMobile = useIsMobile();
    const { studentId, isSuperAdmin } = useAuthStore();
    
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
            // Filter results to only include files and links
            const fileResults = searchResults.filter(item => item.type === 'FILE' || item.type === 'LINK' || item.type === 'INTERACTIVE_QUIZ' || item.type === 'INTERACTIVE_EXAM' || item.type === 'INTERACTIVE_FLASHCARD');
            setResults(fileResults);
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
        setPreviewFile(item);
    };

    const handleFolderClick = (item: Content) => {
        router.push(`/folder/${item.id}`);
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
        <>
            <h2 className="text-2xl font-bold text-white mt-6 mb-4">
                {loading && !results.length ? 'Searching...' : `Found ${results.length} results for "${query}"`}
            </h2>

            <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                {(loading && !results.length) ? (
                    null
                ) : (
                    <div className="flex flex-col h-full">
                        {results.length > 0 ? (
                            results.map((item, index) => (
                                 <div
                                    key={item.id}
                                    className={cn("border-white/10", index !== results.length - 1 && "border-b")}
                                >
                                    {(item.type === 'FILE' || item.type === 'LINK' || item.type === 'INTERACTIVE_QUIZ' || item.type === 'INTERACTIVE_EXAM' || item.type === 'INTERACTIVE_FLASHCARD') && (
                                         <FileCard
                                            item={item}
                                            onFileClick={() => handleFileClick(item)}
                                            onRename={() => setItemToRename(item)}
                                            onDelete={() => setItemToDelete(item)}
                                            onMove={() => {}}
                                            onCopy={() => {}}
                                            onToggleVisibility={() => {}}
                                         />
                                    )}
                                    {item.type === 'FOLDER' && (
                                         <FolderCard 
                                            item={item}
                                            onRename={() => setItemToRename(item)}
                                            onDelete={() => setItemToDelete(item)}
                                            onIconChange={() => setItemForIconChange(item)}
                                            onClick={handleFolderClick}
                                            displayAs='list'
                                            onMove={() => {}}
                                            onCopy={() => {}}
                                            onToggleVisibility={() => {}}
                                        />
                                    )}
                                    {item.type === 'SUBJECT' && (
                                        <div className="py-2">
                                            <SubjectCard 
                                              subject={item} 
                                              onRename={() => setItemToRename(item)}
                                              onDelete={() => setItemToDelete(item)}
                                              onIconChange={() => setItemForIconChange(item)}
                                            />
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
                            !loading && query && (
                                <div className="text-center flex flex-col items-center h-full pt-16">
                                    <SearchX className="mx-auto h-20 w-20 text-slate-500" />
                                    <h3 className="mt-4 text-lg font-semibold text-white">No Results Found</h3>
                                    <p className="mt-2 text-sm text-slate-400">
                                        Your search for "{query}" did not return any results. Try a different keyword.
                                    </p>
                                </div>
                            )
                        )}
                    </div>
                )}
            </div>
             <FilePreviewModal
                item={previewFile}
                onOpenChange={(isOpen) => !isOpen && setPreviewFile(null)}
              />
              
              {isSuperAdmin && (
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
                    <AlertDialogContent className="w-[70vw] sm:max-w-[425px] p-0 border-slate-700 rounded-2xl bg-slate-900/80 backdrop-blur-xl shadow-lg text-white">
                      <AlertDialogHeader className="p-6 pb-0">
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete "{itemToDelete?.name}" and all its contents. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="p-6 pt-4 sm:justify-center">
                        <AlertDialogCancel asChild><Button variant="outline" className="rounded-xl flex-1 sm:flex-none">Cancel</Button></AlertDialogCancel>
                        <AlertDialogAction asChild><Button variant="destructive" className="flex-1 sm:flex-none" onClick={handleDelete}>Delete</Button></AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
        </>
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
