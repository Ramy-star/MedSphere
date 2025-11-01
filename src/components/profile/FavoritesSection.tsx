'use client';

import React, { useMemo, useState } from 'react';
import type { UserProfile } from '@/stores/auth-store';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { Content } from '@/lib/contentService';
import { FileCard } from '@/components/FileCard';
import { FolderCard } from '@/components/FolderCard';
import { Star, Folder as FolderIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { contentService } from '@/lib/contentService';
import { RenameDialog } from '../RenameDialog';
import { ChangeIconDialog } from '../ChangeIconDialog';
import { FolderSelectorDialog } from '../FolderSelectorDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '../ui/button';

export const FavoritesSection = ({ user, onFileClick }: { user: UserProfile, onFileClick: (item: Content) => void }) => {
  const router = useRouter();
  const { toast } = useToast();
  const favoriteIds = useMemo(() => user.favorites || [], [user.favorites]);

  const { data: allContent, loading } = useCollection<Content>('content');

  const [itemToRename, setItemToRename] = useState<Content | null>(null);
  const [itemToDelete, setItemToDelete] = useState<Content | null>(null);
  const [itemForIconChange, setItemForIconChange] = useState<Content | null>(null);
  const [itemToMove, setItemToMove] = useState<Content | null>(null);
  const [itemToCopy, setItemToCopy] = useState<Content | null>(null);
  const [showFolderSelector, setShowFolderSelector] = useState(false);
  const [currentAction, setCurrentAction] = useState<'move' | 'copy' | null>(null);


  const favoriteItems = useMemo(() => {
    if (!allContent || favoriteIds.length === 0) {
      return [];
    }
    const favoriteMap = new Set(favoriteIds);
    const sortedFavorites = [...allContent]
      .filter(item => favoriteMap.has(item.id))
      .sort((a, b) => {
        const aIndex = favoriteIds.indexOf(a.id);
        const bIndex = favoriteIds.indexOf(b.id);
        return bIndex - aIndex; // Newest first
      });
    return sortedFavorites;
  }, [allContent, favoriteIds]);

  const handleFolderClick = (item: Content) => {
    const path = item.type === 'LEVEL' ? `/level/${encodeURIComponent(item.name)}` : `/folder/${item.id}`;
    router.push(path);
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
  
  const handleToggleVisibility = async (item: Content) => {
      await contentService.toggleVisibility(item.id);
      const isHidden = !item.metadata?.isHidden;
      toast({
          title: `Item ${isHidden ? 'Hidden' : 'Visible'}`,
          description: `"${item.name}" is now ${isHidden ? 'hidden from other users' : 'visible to everyone'}.`
      });
  };

  const handleFolderSelect = async (folder: Content) => {
    const itemToProcess = currentAction === 'move' ? itemToMove : itemToCopy;
    if (!itemToProcess || !currentAction) return;

    try {
        if (currentAction === 'move') {
            await contentService.move(itemToProcess.id, folder.id);
            toast({ title: "Item Moved", description: `Moved "${itemToProcess.name}" successfully.` });
        } else {
            await contentService.copy(itemToProcess, folder.id);
            toast({ title: "Item Copied", description: `Copied "${itemToProcess.name}" successfully.` });
        }
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: `Error ${currentAction === 'move' ? 'Moving' : 'Copying'} Item`,
            description: error.message || 'An unknown error occurred.',
        });
    } finally {
        setShowFolderSelector(false);
        setItemToMove(null);
        setItemToCopy(null);
        setCurrentAction(null);
    }
  };


  return (
    <>
      {loading && (
        <div className="space-y-2">
            <div className="h-12 w-full rounded-lg bg-slate-800/50 animate-pulse" />
            <div className="h-12 w-full rounded-lg bg-slate-800/50 animate-pulse" />
        </div>
      )}

      {!loading && favoriteItems.length === 0 && (
         <div className="text-center py-8 sm:py-10 border-2 border-dashed border-slate-800 rounded-2xl">
              <FolderIcon className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-slate-600" />
              <h3 className="mt-4 text-base sm:text-lg font-semibold text-white">No Favorites Yet</h3>
              <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-slate-400">Click the star icon on any file or folder to add it here.</p>
          </div>
      )}

      {!loading && favoriteItems.length > 0 && (
        <div className="flex flex-col gap-1 glass-card p-1.5 sm:p-2">
          {favoriteItems.map((item) => {
            if (item.type === 'FOLDER' || item.type === 'SUBJECT' || item.type === 'SEMESTER' || item.type === 'LEVEL') {
              return (
                <FolderCard
                  key={item.id}
                  item={item}
                  onClick={() => handleFolderClick(item)}
                  displayAs="list"
                  onRename={() => setItemToRename(item)}
                  onDelete={() => setItemToDelete(item)}
                  onIconChange={() => setItemForIconChange(item)}
                  onMove={() => { setItemToMove(item); setCurrentAction('move'); setShowFolderSelector(true); }}
                  onCopy={() => { setItemToCopy(item); setCurrentAction('copy'); setShowFolderSelector(true); }}
                  onToggleVisibility={() => handleToggleVisibility(item)}
                />
              );
            }
            if (item.type === 'FILE' || item.type === 'LINK' || item.type === 'INTERACTIVE_QUIZ' || item.type === 'INTERACTIVE_EXAM' || item.type === 'INTERACTIVE_FLASHCARD') {
              return (
                <FileCard
                  key={item.id}
                  item={item}
                  onFileClick={() => onFileClick(item)}
                  showDragHandle={false}
                  onRename={() => setItemToRename(item)}
                  onDelete={() => setItemToDelete(item)}
                  onMove={() => { setItemToMove(item); setCurrentAction('move'); setShowFolderSelector(true); }}
                  onCopy={() => { setItemToCopy(item); setCurrentAction('copy'); setShowFolderSelector(true); }}
                  onToggleVisibility={() => handleToggleVisibility(item)}
                />
              );
            }
            return null;
          })}
        </div>
      )}
      
      <RenameDialog
        item={itemToRename}
        onOpenChange={(isOpen) => !isOpen && setItemToRename(null)}
        onRename={handleRename}
      />
      <ChangeIconDialog 
        item={itemForIconChange}
        onOpenChange={(isOpen) => !isOpen && setItemForIconChange(null)}
      />
      <FolderSelectorDialog
          open={showFolderSelector}
          onOpenChange={setShowFolderSelector}
          onSelect={handleFolderSelect}
          actionType={currentAction}
          currentItemId={itemToMove?.id || itemToCopy?.id}
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
    </>
  );
};
