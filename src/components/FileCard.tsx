'use client';
import { File, MoreVertical, Edit, Trash2 } from 'lucide-react';
import type { ContentItem } from '@/lib/contentService';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from './ui/button';

export function FileCard({ item, onFileClick, onRename, onDelete }: { item: ContentItem, onFileClick: (item: ContentItem) => void, onRename: () => void, onDelete: () => void }) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div 
              onClick={() => onFileClick(item)}
              className="relative group glass-card p-4 rounded-xl hover:bg-white/10 transition-colors cursor-pointer h-full"
          >
              <div className="flex items-center gap-3">
                  <File className="w-6 h-6 text-blue-400" />
                  <h3 className="text-lg font-semibold text-white truncate">{item.name}</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1 truncate">
                  {item.metadata?.size ? `${(item.metadata.size / 1024).toFixed(1)} KB` : ''}
              </p>

              <div className="absolute top-2 right-2">
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-8 h-8 text-slate-400 hover:text-white hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()} // prevent card click
                  >
                      <MoreVertical className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
            </div>

          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          className="w-48 border-slate-700 rounded-xl bg-gradient-to-b from-slate-800/80 to-slate-900/70 backdrop-blur-lg shadow-lg shadow-blue-500/10 text-white"
          align="start"
        >
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(); }} className="cursor-pointer">
            <Edit className="mr-2 h-4 w-4" />
            <span>Rename</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="cursor-pointer text-red-400 focus:text-red-400 focus:bg-red-500/10">
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
}
