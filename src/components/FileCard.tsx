
'use client';
import { File, MoreVertical, Edit, Trash2, Replace, Download, FileText, Image, Presentation, Sheet, AudioWaveform, Video, LucideIcon } from 'lucide-react';
import type { Content } from '@/lib/contentService';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from './ui/button';
import { format } from 'date-fns';

const getIconForFileMime = (mimeType?: string): { Icon: LucideIcon; color: string } => {
    if (!mimeType) return { Icon: File, color: 'text-slate-400' };

    if (mimeType.startsWith('image/')) return { Icon: Image, color: 'text-purple-400' };
    if (mimeType.startsWith('audio/')) return { Icon: AudioWaveform, color: 'text-orange-400' };
    if (mimeType.startsWith('video/')) return { Icon: Video, color: 'text-red-400' };
    if (mimeType === 'application/pdf') return { Icon: FileText, color: 'text-red-500' };
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return { Icon: FileText, color: 'text-blue-500' };
    if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') return { Icon: Presentation, color: 'text-orange-500' };
    if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return { Icon: Sheet, color: 'text-green-500' };
    if (mimeType.startsWith('text/')) return { Icon: FileText, color: 'text-gray-400' };

    return { Icon: File, color: 'text-slate-400' };
};


export function FileCard({ 
    item, 
    onFileClick, 
    onRename, 
    onDelete, 
    onUpdate,
    onDownload
}: { 
    item: Content, 
    onFileClick: (item: Content) => void, 
    onRename: () => void, 
    onDelete: () => void,
    onUpdate: () => void,
    onDownload: () => void,
}) {

    const sizeInKB = item.metadata?.size ? (item.metadata.size / 1024) : 0;
    const displaySize = sizeInKB < 1024 
        ? `${sizeInKB.toFixed(1)} KB` 
        : `${(sizeInKB / 1024).toFixed(1)} MB`;

    const createdAt = item.createdAt ? format(new Date(item.createdAt), 'MMM dd, yyyy') : 'N/A';
    
    const { Icon, color } = getIconForFileMime(item.metadata?.mime);

    return (
      <DropdownMenu>
        <div 
            onClick={() => onFileClick(item)}
            className="relative group glass-card p-3 rounded-lg hover:bg-white/10 transition-colors cursor-pointer flex items-center justify-between"
        >
            <div className="flex items-center gap-3 overflow-hidden flex-1">
                <Icon className={`w-6 h-6 ${color} shrink-0`} />
                <h3 className="text-sm font-medium text-white/90 break-words flex-1">{item.name}</h3>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4 shrink-0 ml-2 sm:ml-4">
                 <p className="text-xs text-slate-400 hidden lg:block w-24 text-right">
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
           <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDownload(); }} className="cursor-pointer">
            <Download className="mr-2 h-4 w-4" />
            <span>Download</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="cursor-pointer text-red-400 focus:text-red-400 focus:bg-red-500/10">
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
}
