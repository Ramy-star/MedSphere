'use client';
import { MoreVertical, Edit, Trash2, Image as ImageIcon, Folder, Copy, Move, Eye, EyeOff, Star, StarOff, CheckSquare, Square } from 'lucide-react';
import type { Content } from '@/lib/contentService';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Button } from './ui/button';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuthStore } from '@/stores/auth-store';
import Image from 'next/image';
import React, { useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { prefetcher } from '@/lib/prefetchService';
import { contentService } from '@/lib/contentService';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';


export const FolderCard = React.memo(function FolderCard({ 
    item, 
    onRename, 
    onDelete, 
    onIconChange, 
    onMove,
    onCopy,
    onToggleVisibility,
    onClick,
    displayAs = 'grid',
    isSelectMode,
    isSelected,
    onToggleSelect,
}: { 
    item: Content, 
    onRename: () => void, 
    onDelete: () => void, 
    onIconChange: (item: Content) => void,
    onMove: () => void;
    onCopy: () => void;
    onToggleVisibility: () => void;
    onClick: (item: Content) => void,
    displayAs?: 'grid' | 'list',
    isSelectMode?: boolean;
    isSelected?: boolean;
    onToggleSelect?: (itemId: string, selected: boolean) => void;
}) {
    const createdAt = item.createdAt ? format(new Date(item.createdAt), 'MMM dd, yyyy') : 'N/A';
    const isMobile = useIsMobile();
    const { user, can } = useAuthStore();
    const { toast } = useToast();

    const isFavorited = user?.favorites?.includes(item.id) || false;
    
    const renderIcon = () => {
      const iconClasses = "w-8 h-8 transition-transform duration-200 ease-out group-hover:scale-[1.07]";
      if (item.metadata?.iconURL) {
        return (
          <div className={cn("relative", iconClasses)}>
            <Image 
              src={item.metadata.iconURL} 
              alt={item.name} 
              fill
              className="object-cover rounded-md pointer-events-none select-none"
              sizes="32px"
              draggable={false}
            />
          </div>
        )
      }
      return <Folder className={cn(iconClasses, "text-yellow-400")} />;
    }

    const handleClick = useCallback((e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button, [role="menuitem"]')) {
          e.stopPropagation();
          return;
        }

        if (isSelectMode) {
            onToggleSelect?.(item.id, !isSelected);
        } else {
            onClick(item);
        }
    }, [onClick, item, isSelectMode, isSelected, onToggleSelect]);

    const handleToggleFavorite = async () => {
        if (!user) return;
        try {
            await contentService.toggleFavorite(user.id, item.id);
            toast({
                title: isFavorited ? 'Removed from Favorites' : 'Added to Favorites',
                description: `"${item.name}" has been ${isFavorited ? 'removed from' : 'added to'} your favorites.`
            });
        } catch(error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        }
    };

    const VisibilityIcon = item.metadata?.isHidden ? Eye : EyeOff;
    const FavoriteIcon = isFavorited ? StarOff : Star;

    const hasAnyPermission = 
      can('canRename', item.id) ||
      can('canDelete', item.id) ||
      can('canChangeIcon', item.id) ||
      can('canMove', item.id) ||
      can('canCopy', item.id) ||
      can('canToggleVisibility', item.id) ||
      !!user;


    const DropdownContent = () => (
      <DropdownMenuContent 
          className="w-48 p-2"
          align="end"
      >
          {user && (
            <DropdownMenuItem onSelect={handleToggleFavorite}>
                <FavoriteIcon className="mr-2 h-4 w-4" />
                <span>{isFavorited ? 'Remove from Favorite' : 'Add to Favorite'}</span>
            </DropdownMenuItem>
          )}

          {(can('canRename', item.id) || can('canDelete', item.id) || can('canChangeIcon', item.id)) && <DropdownMenuSeparator />}
          
          {can('canRename', item.id) && (
            <DropdownMenuItem onSelect={onRename}>
                <Edit className="mr-2 h-4 w-4" />
                <span>Rename</span>
            </DropdownMenuItem>
          )}
          {can('canChangeIcon', item.id) && (
            <DropdownMenuItem onSelect={() => onIconChange(item)}>
                <ImageIcon className="mr-2 h-4 w-4" />
                <span>Change Icon</span>
            </DropdownMenuItem>
          )}
          {can('canMove', item.id) && (
            <DropdownMenuItem onSelect={onMove}>
              <Move className="mr-2 h-4 w-4" />
              <span>Move</span>
            </DropdownMenuItem>
          )}
          {can('canCopy', item.id) && (
            <DropdownMenuItem onSelect={onCopy}>
              <Copy className="mr-2 h-4 w-4" />
              <span>Copy</span>
            </DropdownMenuItem>
          )}
          {can('canToggleVisibility', item.id) && (
            <DropdownMenuItem onSelect={onToggleVisibility}>
              <VisibilityIcon className="mr-2 h-4 w-4" />
              <span>{item.metadata?.isHidden ? 'Show' : 'Hide'}</span>
            </DropdownMenuItem>
          )}

          {can('canDelete', item.id) && (
            <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={onDelete} className="text-red-400 focus:text-red-400 focus:bg-red-500/10">
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete</span>
                </DropdownMenuItem>
            </>
          )}
      </DropdownMenuContent>
    );

    if (displayAs === 'list') {
        return (
             <div 
                onClick={handleClick}
                className={cn(
                    "relative group flex items-center w-full p-2 md:p-2 transition-colors duration-200 md:rounded-2xl my-1.5",
                    item.metadata?.isHidden && "opacity-60 bg-white/5",
                    isSelectMode && 'cursor-pointer',
                    isSelected && 'bg-blue-900/50 md:hover:bg-blue-900/70',
                    !isSelected && isSelectMode && 'md:hover:bg-slate-800/60',
                    !isSelectMode && 'cursor-pointer md:hover:bg-white/10'
                )}
                onMouseEnter={() => prefetcher.prefetchChildren(item.id)}
             >
                <div className="flex items-center gap-3 overflow-hidden flex-1">
                    {item.metadata?.iconURL ? (
                       <div className="relative w-6 h-6 shrink-0 transition-transform duration-200 ease-out group-hover:scale-[1.07]">
                            <Image 
                              src={item.metadata.iconURL} 
                              alt={item.name} 
                              fill
                              className="object-cover rounded-sm pointer-events-none select-none"
                              sizes="24px"
                              draggable={false}
                            />
                       </div>
                    ) : (
                       <Folder className="w-6 h-6 text-yellow-400 shrink-0 transition-transform duration-200 ease-out group-hover:scale-[1.07]" />
                    )}
                    <h3 className="text-sm font-medium text-white/90 break-words flex-1 transition-transform duration-200 ease-out group-hover:scale-[1.07] origin-left">{item.name}</h3>
                </div>
                
                 <div className="flex items-center shrink-0 ml-2 sm:ml-4 gap-2 sm:gap-4">
                    <p className="text-xs text-slate-400 hidden lg:block w-24 text-right font-ubuntu">
                        {createdAt}
                    </p>
                    
                    <div className="relative flex items-center justify-center w-8 h-8">
                       <AnimatePresence>
                           {isSelectMode ? (
                                <motion.div
                                    key="select-button"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute inset-0 flex items-center justify-center"
                                >
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="w-8 h-8 rounded-full"
                                    >
                                        {isSelected ? <CheckSquare className="text-blue-400" /> : <Square className="text-slate-500" />}
                                    </Button>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="more-button"
                                    initial={false}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100"
                                >
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="w-8 h-8 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 focus-visible:ring-0 focus-visible:ring-offset-0"
                                            >
                                                <MoreVertical className="w-5 h-5" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownContent />
                                    </DropdownMenu>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                 </div>
            </div>
        )
    }

    // Grid view (default)
    return (
      <div 
        onClick={handleClick}
        onMouseEnter={() => prefetcher.prefetchChildren(item.id)}
        className={cn(
            "relative group glass-card p-4 rounded-[1.25rem] transition-all duration-200 h-full flex flex-col justify-between",
            item.metadata?.isHidden && "opacity-60 bg-white/5",
            isSelectMode && 'cursor-pointer',
            isSelected && 'bg-blue-900/50 ring-2 ring-blue-500 hover:bg-blue-900/70',
            !isSelected && isSelectMode && 'hover:bg-slate-800/60',
            !isSelectMode && 'cursor-pointer hover:bg-white/10'
        )}
      >
        <div className="flex justify-between items-start mb-4">
            {renderIcon()}
            <div className="relative flex items-center justify-center w-8 h-8">
               <AnimatePresence>
                    {isSelectMode ? (
                        <motion.div
                            key="select-button-grid"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.2 }}
                            className="absolute inset-0 flex items-center justify-center"
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-8 h-8 rounded-full"
                          >
                            {isSelected ? <CheckSquare className="text-blue-300" /> : <Square className="text-slate-600" />}
                          </Button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="more-button-grid"
                            initial={false}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100"
                        >
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="w-8 h-8 rounded-full text-slate-400 hover:text-white hover:bg-slate-700/50"
                                    >
                                        <MoreVertical className="w-5 h-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownContent />
                            </DropdownMenu>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
        <h3 className="text-lg font-semibold text-white transition-transform duration-200 ease-out group-hover:scale-[1.07] origin-left">{item.name}</h3>
      </div>
    );
});
