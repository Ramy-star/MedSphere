'use client';
import { MoreVertical, Edit, Trash2, GripVertical, Image as ImageIcon, Folder, Copy, Move, Eye, EyeOff, Star, StarOff } from 'lucide-react';
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
import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { prefetcher } from '@/lib/prefetchService';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { contentService } from '@/lib/contentService';
import { useToast } from '@/hooks/use-toast';


export const FolderCard = React.memo(function FolderCard({ 
    item, 
    onRename, 
    onDelete, 
    onIconChange, 
    onMove,
    onCopy,
    onToggleVisibility,
    onClick,
    displayAs = 'grid' 
}: { 
    item: Content, 
    onRename: () => void, 
    onDelete: () => void, 
    onIconChange: (item: Content) => void,
    onMove: () => void;
    onCopy: () => void;
    onToggleVisibility: () => void;
    onClick: (item: Content) => void,
    displayAs?: 'grid' | 'list' 
}) {
    const createdAt = item.createdAt ? format(new Date(item.createdAt), 'MMM dd, yyyy') : 'N/A';
    const isMobile = useIsMobile();
    const { user, can } = useAuthStore();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const { toast } = useToast();
    const dropdownTriggerRef = useRef<HTMLButtonElement>(null);

    const isFavorited = user?.favorites?.includes(item.id) || false;
    
    const renderIcon = () => {
      if (item.metadata?.iconURL) {
        return (
          <div className="relative w-8 h-8">
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
      return <Folder className="w-8 h-8 text-yellow-400" />;
    }
    
    const handleAction = (e: Event, action: () => void) => {
        e.preventDefault();
        e.stopPropagation();
        action();
        setDropdownOpen(false);
    };

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
          onPointerDownOutside={(e) => {
            if (e.target instanceof HTMLElement && dropdownTriggerRef.current?.contains(e.target)) return;
            e.preventDefault();
          }}
      >
          {user && (
            <DropdownMenuItem onSelect={(e) => handleAction(e, handleToggleFavorite)}>
                <FavoriteIcon className="mr-2 h-4 w-4" />
                <span>{isFavorited ? 'Remove from Favorite' : 'Add to Favorite'}</span>
            </DropdownMenuItem>
          )}

          {(can('canRename', item.id) || can('canDelete', item.id) || can('canChangeIcon', item.id)) && <DropdownMenuSeparator />}
          
          {can('canRename', item.id) && (
            <DropdownMenuItem onSelect={(e) => handleAction(e, onRename)}>
                <Edit className="mr-2 h-4 w-4" />
                <span>Rename</span>
            </DropdownMenuItem>
          )}
          {can('canChangeIcon', item.id) && (
            <DropdownMenuItem onSelect={(e) => handleAction(e, () => onIconChange(item))}>
                <ImageIcon className="mr-2 h-4 w-4" />
                <span>Change Icon</span>
            </DropdownMenuItem>
          )}
          {can('canMove', item.id) && (
            <DropdownMenuItem onSelect={(e) => handleAction(e, onMove)}>
              <Move className="mr-2 h-4 w-4" />
              <span>Move</span>
            </DropdownMenuItem>
          )}
          {can('canCopy', item.id) && (
            <DropdownMenuItem onSelect={(e) => handleAction(e, onCopy)}>
              <Copy className="mr-2 h-4 w-4" />
              <span>Copy</span>
            </DropdownMenuItem>
          )}
          {can('canToggleVisibility', item.id) && (
            <DropdownMenuItem onSelect={(e) => handleAction(e, onToggleVisibility)}>
              <VisibilityIcon className="mr-2 h-4 w-4" />
              <span>{item.metadata?.isHidden ? 'Show' : 'Hide'}</span>
            </DropdownMenuItem>
          )}

          {can('canDelete', item.id) && (
            <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={(e) => handleAction(e, onDelete)} className="text-red-400 focus:text-red-400 focus:bg-red-500/10">
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
                onClick={() => onClick(item)}
                className={cn("relative group flex items-center w-full p-2 md:p-2 md:hover:bg-white/10 transition-colors duration-200 md:rounded-2xl cursor-pointer my-1.5", item.metadata?.isHidden && "opacity-60 bg-white/5")}
                onMouseEnter={() => prefetcher.prefetchChildren(item.id)}
             >
                <div className="flex items-center gap-3 overflow-hidden flex-1 transition-transform duration-200 group-hover:scale-[1.01]">
                    {item.metadata?.iconURL ? (
                       <Image 
                          src={item.metadata.iconURL} 
                          alt={item.name} 
                          width={24}
                          height={24}
                          className="w-6 h-6 object-cover rounded-sm shrink-0 pointer-events-none select-none"
                          draggable={false}
                        />
                    ) : (
                       <Folder className="w-6 h-6 text-yellow-400 shrink-0" />
                    )}
                    <h3 className="text-sm font-medium text-white/90 break-words flex-1">{item.name}</h3>
                </div>
                
                 <div className="flex items-center gap-2 sm:gap-4 shrink-0 ml-2 sm:ml-4 transition-transform duration-200 group-hover:scale-[1.01]">
                    <p className="text-xs text-slate-400 hidden lg:block w-24 text-right font-ubuntu">
                        {createdAt}
                    </p>
                    
                    {hasAnyPermission && (
                        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                            <DropdownMenuTrigger asChild>
                                <Button 
                                    ref={dropdownTriggerRef}
                                    variant="ghost" 
                                    size="icon" 
                                    className="w-8 h-8 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 focus-visible:ring-0 focus-visible:ring-offset-0"
                                    onClick={(e) => { e.stopPropagation(); setDropdownOpen(true); }} // Stop propagation here
                                >
                                    <MoreVertical className="w-5 h-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownContent />
                        </DropdownMenu>
                    )}
                 </div>
            </div>
        )
    }

    // Grid view (default)
    return (
      <div 
        onClick={() => onClick(item)}
        onMouseEnter={() => prefetcher.prefetchChildren(item.id)}
        className={cn("relative group glass-card p-4 rounded-[1.25rem] group hover:bg-white/10 transition-all duration-200 cursor-pointer", item.metadata?.isHidden && "opacity-60 bg-white/5")}
      >
        <div className="transition-transform duration-200 group-hover:scale-[1.01]">
          <div className="flex justify-between items-start mb-4">
              {renderIcon()}
              {hasAnyPermission && (
                  <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                       <DropdownMenuTrigger asChild>
                            <Button 
                                ref={dropdownTriggerRef}
                                variant="ghost" 
                                size="icon" 
                                className="absolute top-2 right-2 w-8 h-8 rounded-full text-slate-400 hover:text-white hover:bg-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity focus-visible:ring-0 focus-visible:ring-offset-0"
                                onClick={(e) => { e.stopPropagation(); setDropdownOpen(true); }} // Stop propagation here
                            >
                                <MoreVertical className="w-5 h-5" />
                            </Button>
                        </DropdownMenuTrigger>
                      <DropdownContent />
                  </DropdownMenu>
              )}
          </div>
          <h3 className="text-lg font-semibold text-white">{item.name}</h3>
        </div>
      </div>
    );
});
