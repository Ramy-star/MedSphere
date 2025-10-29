
'use client';

import React, { useMemo } from 'react';
import type { UserProfile } from '@/stores/auth-store';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { Content } from '@/lib/contentService';
import { FileCard } from '@/components/FileCard';
import { FolderCard } from '@/components/FolderCard';
import { Star, Folder as FolderIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { contentService } from '@/lib/contentService';

export const FavoritesSection = ({ user, onFileClick }: { user: UserProfile, onFileClick: (item: Content) => void }) => {
  const router = useRouter();
  const { toast } = useToast();
  const favoriteIds = useMemo(() => user.favorites || [], [user.favorites]);

  const { data: allContent, loading } = useCollection<Content>('content');

  const favoriteItems = useMemo(() => {
    if (!allContent || favoriteIds.length === 0) {
      return [];
    }
    const favoriteMap = new Set(favoriteIds);
    // Sort favorites to show most recently added first
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
    router.push(`/folder/${item.id}`);
  };

  const handleToggleFavorite = async (item: Content) => {
    try {
      await contentService.toggleFavorite(user.id, item.id);
      const isFavorited = favoriteIds.includes(item.id);
      toast({
        title: isFavorited ? "Removed from Favorites" : "Added to Favorites",
        description: `"${item.name}" has been ${isFavorited ? "removed from" : "added to"} your favorites.`,
      });
    } catch (error) {
      console.error("Failed to toggle favorite", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not update your favorites.",
      });
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
                  onRename={() => {}}
                  onDelete={() => {}}
                  onIconChange={() => {}}
                  onMove={() => {}}
                  onCopy={() => {}}
                  onToggleVisibility={() => {}}
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
                  onRename={() => {}}
                  onDelete={() => {}}
                  onMove={() => {}}
                  onCopy={() => {}}
                  onToggleVisibility={() => {}}
                />
              );
            }
            return null;
          })}
        </div>
      )}
    </>
  );
};
