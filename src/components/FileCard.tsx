
'use client';
import { File, MoreVertical, Edit, Trash2, Replace, MoreHorizontal } from 'lucide-react';
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

export function FileCard({ 
    item, 
    onFileClick, 
    onRename, 
    onDelete, 
    onUpdate 
}: { 
    item: Content, 
    onFileClick: (item: Content) => void, 
    onRename: () => void, 
    onDelete: () => void,
    onUpdate: () => void,
}) {

    const sizeInKB = item.metadata?.size ? (item.metadata.size / 1024) : 0;
    const displaySize = sizeInKB < 1024 
        ? `${sizeInKB.toFixed(1)} KB` 
        : `${(sizeInKB / 1024).toFixed(1)} MB`;

    const createdAt = item.createdAt ? format(new Date(item.createdAt), 'MMM dd, yyyy') : 'N/A';

    return (
      <DropdownMenu>
        <div 
            onClick={() => onFileClick(item)}
            className="relative group glass-card p-3 rounded-lg hover:bg-white/10 transition-colors cursor-pointer flex items-center justify-between"
        >
            <div className="flex items-center gap-3 overflow-hidden">
                <File className="w-6 h-6 text-blue-400 shrink-0" />
                <h3 className="text-sm font-medium text-white/90 whitespace-nowrap overflow-hidden text-ellipsis">{item.name}</h3>
            </div>
            
            <div className="flex items-center gap-4 shrink-0 ml-4">
                 <p className="text-xs text-slate-400 hidden md:block w-24 text-right">
                    {createdAt}
                </p>
                <p className="text-xs text-slate-400 hidden sm:block w-20 text-right">
                    {item.metadata?.size ? displaySize : ''}
                </p>

                <DropdownMenuTrigger asChild>
                    <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-8 h-8 text-slate-400 hover:text-white hover:bg-slate-700"
                    onClick={(e) => e.stopPropagation()} // prevent card click
                    >
                        <MoreVertical className="w-5 h-5" />
                    </Button>
                </DropdownMenuTrigger>
            </div>
        </div>
        <DropdownMenuContent 
          className="w-48 border-slate-700 rounded-xl bg-gradient-to-b from-slate-800/80 to-slate-900/70 backdrop-blur-lg shadow-lg shadow-blue-500/10 text-white"
          align="end"
        >
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(); }} className="cursor-pointer">
            <Edit className="mr-2 h-4 w-4" />
            <span>Rename</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onUpdate(); }} className="cursor-pointer">
            <Replace className="mr-2 h-4 w-4" />
            <span>Update File</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="cursor-pointer text-red-400 focus:text-red-400 focus:bg-red-500/10">
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-white/10" />
           <DropdownMenuItem disabled className="cursor-not-allowed">
            <MoreHorizontal className="mr-2 h-4 w-4" />
            <span>More actions</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
}
