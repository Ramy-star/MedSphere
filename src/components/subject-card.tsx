
'use client';

import { LucideIcon, MoreVertical, Edit, Trash2, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { allSubjectIcons } from '@/lib/file-data';
import type { Content } from '@/lib/contentService';
import { Folder } from 'lucide-react';
import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Button } from './ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { usePathname } from 'next/navigation';


export const SubjectCard = React.memo(function SubjectCard({ 
    subject,
    onRename,
    onDelete,
    onIconChange
}: { 
    subject: Content,
    onRename: () => void;
    onDelete: () => void;
    onIconChange: (item: Content) => void;
}) {
  const { id, name, iconName, color } = subject;
  const subjectPath = `/folder/${id}`;
  const Icon = (iconName && allSubjectIcons[iconName]) || Folder;
  const { can } = useAuthStore();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.target instanceof Element && (e.target.closest('[data-radix-dropdown-menu-trigger]') || e.target.closest('[role="menuitem"]'))) {
        return;
    }
  };
  
  const handleAction = (e: Event, action: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    action();
    setDropdownOpen(false);
  };


  return (
    <Link href={subjectPath} className="block h-full" onClick={handleCardClick}>
        <div className="relative group glass-card p-4 rounded-[1.25rem] group hover:bg-white/10 transition-colors h-full flex flex-col justify-between">
            <div>
                <div className="flex justify-between items-start mb-4">
                    <Icon className={`w-8 h-8 ${color}`} />
                    {can('canRename', pathname) && (
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
                            <DropdownMenuContent 
                                className="w-48 p-2"
                                align="end"
                            >
                                {can('canRename', pathname) && (
                                <DropdownMenuItem onSelect={(e) => handleAction(e, onRename)} onClick={(e) => e.stopPropagation()}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    <span>Rename</span>
                                </DropdownMenuItem>
                                )}
                                {can('canChangeIcon', pathname) && (
                                <DropdownMenuItem onSelect={(e) => handleAction(e, () => onIconChange(subject))} onClick={(e) => e.stopPropagation()}>
                                    <ImageIcon className="mr-2 h-4 w-4" />
                                    <span>Change Icon</span>
                                </DropdownMenuItem>
                                )}
                                {can('canDelete', pathname) && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onSelect={(e) => handleAction(e, onDelete)} className="text-red-400 focus:text-red-400 focus:bg-red-500/10" onClick={(e) => e.stopPropagation()}>
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            <span>Delete</span>
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
                <h3 className="text-lg font-semibold text-white">{name}</h3>
            </div>
        </div>
    </Link>
  );
});
