
'use client';
import Link from 'next/link';
import { Folder, MoreVertical, Edit, Trash2 } from 'lucide-react';
import type { Content } from '@/lib/contentService';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from './ui/button';
import { format } from 'date-fns';


export function FolderCard({ item, onRename, onDelete }: { item: Content, onRename: () => void, onDelete: () => void }) {
    const createdAt = item.createdAt ? format(new Date(item.createdAt), 'MMM dd, yyyy') : 'N/A';
    
    return (
      <DropdownMenu>
        <div className="relative group glass-card p-3 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-between">
            <Link href={`/folder/${item.id}`} className="flex items-center gap-3 overflow-hidden flex-1">
                <Folder className="w-6 h-6 text-yellow-400 shrink-0" />
                <h3 className="text-sm font-medium text-white/90 break-words flex-1">{item.name}</h3>
            </Link>
            
            <div className="flex items-center gap-2 sm:gap-4 shrink-0 ml-2 sm:ml-4">
                <p className="text-xs text-slate-400 hidden lg:block w-24 text-right">
                    {createdAt}
                </p>
                <p className="text-xs text-slate-400 hidden sm:block w-20 text-right">
                    --
                </p>
                 <DropdownMenuTrigger asChild>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="w-8 h-8 text-slate-400 hover:text-white hover:bg-slate-700"
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                        }}
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
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRename(); }} className="cursor-pointer">
                <Edit className="mr-2 h-4 w-4" />
                <span>Rename</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(); }} className="cursor-pointer text-red-400 focus:text-red-400 focus:bg-red-500/10">
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete</span>
            </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
}
