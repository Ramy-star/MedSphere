'use client';
import Link from 'next/link';
import { MoreVertical, Edit, Trash2, GripVertical, Image as ImageIcon, Folder } from 'lucide-react';
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
import { useUser } from '@/firebase/auth/use-user';
import Image from 'next/image';
import React from 'react';
import { cn } from '@/lib/utils';
import { prefetcher } from '@/lib/prefetchService';


export const FolderCard = React.memo(function FolderCard({ item, onRename, onDelete, onIconChange, displayAs = 'grid' }: { item: Content, onRename: () => void, onDelete: () => void, onIconChange: (item: Content) => void, displayAs?: 'grid' | 'list' }) {
    const createdAt = item.createdAt ? format(new Date(item.createdAt), 'MMM dd, yyyy') : 'N/A';
    const isMobile = useIsMobile();
    const { user } = useUser();
    const isAdmin = user?.uid === process.env.NEXT_PUBLIC_ADMIN_UID;
    
    const renderIcon = () => {
      if (item.metadata?.iconURL) {
        return (
          <div className="relative w-8 h-8">
            <Image 
              src={item.metadata.iconURL} 
              alt={item.name} 
              fill
              className="object-cover rounded-md"
              sizes="32px"
            />
          </div>
        )
      }
      return <Folder className="w-8 h-8 text-yellow-400" />;
    }
    
    const DropdownContent = () => (
      <DropdownMenuContent 
          className="w-48 border-slate-700 rounded-xl bg-gradient-to-b from-slate-800/80 to-slate-900/70 backdrop-blur-lg shadow-lg shadow-blue-500/10 text-white"
          align="end"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
      >
          <DropdownMenuItem onClick={onRename} className="cursor-pointer">
              <Edit className="mr-2 h-4 w-4" />
              <span>Rename</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onIconChange(item)} className="cursor-pointer">
              <ImageIcon className="mr-2 h-4 w-4" />
              <span>Change Icon</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDelete} className="cursor-pointer text-red-400 focus:text-red-400 focus:bg-red-500/10">
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Delete</span>
          </DropdownMenuItem>
      </DropdownMenuContent>
    );

    if (displayAs === 'list') {
        return (
             <Link 
                href={`/folder/${item.id}`}
                className="relative group flex items-center w-full p-3 md:p-3 md:hover:bg-white/10 transition-colors md:rounded-lg cursor-pointer"
                onMouseEnter={() => prefetcher.prefetchChildren(item.id)}
             >
                {!isMobile && isAdmin && <GripVertical className="h-5 w-5 text-slate-500 mr-2 shrink-0 cursor-grab touch-none" />}
                <div className="flex items-center gap-3 overflow-hidden flex-1">
                    {item.metadata?.iconURL ? (
                       <Image 
                          src={item.metadata.iconURL} 
                          alt={item.name} 
                          width={24}
                          height={24}
                          className="w-6 h-6 object-cover rounded-sm shrink-0"
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
                    
                    {isAdmin && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="w-8 h-8 rounded-full text-slate-400 hover:text-white hover:bg-slate-700"
                                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                                >
                                    <MoreVertical className="w-5 h-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownContent />
                        </DropdownMenu>
                    )}
                 </div>
            </Link>
        )
    }

    // Grid view (default)
    return (
      <div onMouseEnter={() => prefetcher.prefetchChildren(item.id)}>
        <Link href={`/folder/${item.id}`} className="block">
          <div className="relative group glass-card p-4 rounded-xl group hover:bg-white/10 transition-colors cursor-pointer">
              <div className="flex justify-between items-start mb-4">
                  {renderIcon()}
                  {isAdmin && (
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="absolute top-2 right-2 w-8 h-8 rounded-full text-slate-400 hover:text-white hover:bg-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
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
        </Link>
      </div>
    );
});
