
'use client';
import { MoreVertical, Edit, Trash2, GripVertical, Image as ImageIcon, Folder, Copy, Move, EyeOff } from 'lucide-react';
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
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { prefetcher } from '@/lib/prefetchService';
import { useRouter } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';


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
    const { isSuperAdmin } = useAuthStore();
    const router = useRouter();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    
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

    const DropdownContent = () => (
      <DropdownMenuContent 
          className="w-48 p-2"
          align="end"
      >
          <DropdownMenuItem onSelect={(e) => handleAction(e, onRename)} onClick={(e) => e.stopPropagation()}>
              <Edit className="mr-2 h-4 w-4" />
              <span>Rename</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={(e) => handleAction(e, () => onIconChange(item))} onClick={(e) => e.stopPropagation()}>
              <ImageIcon className="mr-2 h-4 w-4" />
              <span>Change Icon</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={(e) => handleAction(e, onMove)}>
            <Move className="mr-2 h-4 w-4" />
            <span>Move</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={(e) => handleAction(e, onCopy)}>
            <Copy className="mr-2 h-4 w-4" />
            <span>Copy</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={(e) => handleAction(e, onToggleVisibility)}>
            <EyeOff className="mr-2 h-4 w-4" />
            <span>{item.metadata?.isHidden ? 'Show' : 'Hide'}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={(e) => handleAction(e, onDelete)} className="text-red-400 focus:text-red-400 focus:bg-red-500/10" onClick={(e) => e.stopPropagation()}>
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Delete</span>
          </DropdownMenuItem>
      </DropdownMenuContent>
    );
    
    const handleCardClick = (e: React.MouseEvent) => {
        // Prevent click from propagating to parent elements
        e.stopPropagation();
        
        // Check if the click target is the trigger or inside the menu content
        if (e.target instanceof Element && (e.target.closest('[data-radix-dropdown-menu-trigger]') || e.target.closest('[role="menuitem"]'))) {
            return;
        }
        
        // If not, proceed with the folder click action
        onClick(item);
    }

    if (displayAs === 'list') {
        return (
             <div 
                onClick={handleCardClick}
                className={cn("relative group flex items-center w-full p-2 md:p-2 md:hover:bg-white/10 transition-colors md:rounded-2xl cursor-pointer my-1.5", item.metadata?.isHidden && "opacity-60 bg-white/5")}
                onMouseEnter={() => prefetcher.prefetchChildren(item.id)}
             >
                {!isMobile && isSuperAdmin && <GripVertical className="h-5 w-5 text-slate-500 mr-2 shrink-0 cursor-grab touch-none" />}
                <div className="flex items-center gap-3 overflow-hidden flex-1">
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
                
                 <div className="flex items-center gap-2 sm:gap-4 shrink-0 ml-2 sm:ml-4">
                    <p className="text-xs text-slate-400 hidden lg:block w-24 text-right font-ubuntu">
                        {createdAt}
                    </p>
                    
                    {isSuperAdmin && (
                        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <DropdownMenuTrigger asChild>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="w-8 h-8 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 focus-visible:ring-0 focus-visible:ring-offset-0"
                                            >
                                                <MoreVertical className="w-5 h-5" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>More options</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
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
        onMouseEnter={() => prefetcher.prefetchChildren(item.id)}
        onClick={handleCardClick}
        className={cn("relative group glass-card p-4 rounded-[1.25rem] group hover:bg-white/10 transition-colors cursor-pointer", item.metadata?.isHidden && "opacity-60 bg-white/5")}
      >
          <div className="flex justify-between items-start mb-4">
              {renderIcon()}
              {isSuperAdmin && (
                  <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                       <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DropdownMenuTrigger asChild>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="absolute top-2 right-2 w-8 h-8 rounded-full text-slate-400 hover:text-white hover:bg-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity focus-visible:ring-0 focus-visible:ring-offset-0"
                                        >
                                            <MoreVertical className="w-5 h-5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>More options</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                      <DropdownContent />
                  </DropdownMenu>
              )}
          </div>
          <h3 className="text-lg font-semibold text-white">{item.name}</h3>
      </div>
    );
});
