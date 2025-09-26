
'use client';
import { 
    MoreVertical, Edit, Trash2, Download, ExternalLink,
    File as FileIcon, FileText, FileImage, FileVideo, FileAudio, FileSpreadsheet, Presentation, FileCode, Music
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Content } from '@/lib/contentService';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from './ui/button';
import { format } from 'date-fns';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { contentService } from '@/lib/contentService';

const getIconForFileType = (fileName: string, mimeType?: string): { Icon: LucideIcon, color: string } => {
    const extension = fileName.split('.').pop()?.toLowerCase();

    if (mimeType?.startsWith('image/')) return { Icon: FileImage, color: 'text-purple-400' };
    if (mimeType?.startsWith('video/')) return { Icon: FileVideo, color: 'text-red-400' };
    if (mimeType?.startsWith('audio/')) return { Icon: Music, color: 'text-orange-400' };
    
    switch (extension) {
        case 'pdf':
            return { Icon: FileText, color: 'text-red-400' };
        case 'docx':
        case 'doc':
            return { Icon: FileText, color: 'text-blue-500' };
        case 'xlsx':
        case 'xls':
            return { Icon: FileSpreadsheet, color: 'text-green-500' };
        case 'pptx':
        case 'ppt':
            return { Icon: Presentation, color: 'text-orange-500' };
        case 'html':
        case 'js':
        case 'css':
        case 'tsx':
        case 'ts':
            return { Icon: FileCode, color: 'text-gray-400' };
        case 'txt':
             return { Icon: FileText, color: 'text-gray-400' };
        case 'mp3':
        case 'wav':
             return { Icon: Music, color: 'text-orange-400' };
        case 'mp4':
        case 'mov':
             return { Icon: FileVideo, color: 'text-red-400' };
        case 'png':
        case 'jpg':
        case 'jpeg':
        case 'gif':
        case 'svg':
             return { Icon: FileImage, color: 'text-purple-400' };
        default:
            return { Icon: FileIcon, color: 'text-gray-400' };
    }
};


const handleForceDownload = async (url: string, name: string) => {
    try {
        const res = await fetch(url);
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(blobUrl);
    } catch (error) {
        console.error("Download failed:", error);
        // Fallback to opening in new tab
        window.open(url, '_blank');
    }
}


export function FileCard({ 
    item, 
    onFileClick, 
    onRename, 
    onDelete, 
}: { 
    item: Content, 
    onFileClick: (item: Content) => void, 
    onRename: () => void, 
    onDelete: () => void,
}) {

    const sizeInKB = item.metadata?.size ? (item.metadata.size / 1024) : 0;
    const displaySize = sizeInKB < 1024 
        ? `${sizeInKB.toFixed(1)} KB` 
        : `${(sizeInKB / 1024).toFixed(1)} MB`;

    const createdAt = item.createdAt ? format(new Date(item.createdAt), 'MMM dd, yyyy') : 'N/A';
    
    const { Icon, color } = getIconForFileType(item.name, item.metadata?.mime);

    return (
      <DropdownMenu>
        <div 
            onClick={(e) => {
              if (!(e.target instanceof HTMLElement && e.target.closest('[data-radix-collection-item]'))) {
                onFileClick(item);
              }
            }}
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
          <DropdownMenuItem onClick={onRename} className="cursor-pointer">
            <Edit className="mr-2 h-4 w-4" />
            <span>Rename</span>
          </DropdownMenuItem>
           <DropdownMenuItem 
                onClick={() => item.metadata?.storagePath && handleForceDownload(item.metadata.storagePath, item.name)} 
                disabled={!item.metadata?.storagePath}
                className="cursor-pointer"
            >
            <Download className="mr-2 h-4 w-4" />
            <span>Download</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="cursor-pointer text-red-400 focus:text-red-400 focus:bg-red-500/10">
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
}

    
