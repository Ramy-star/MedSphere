
'use client';
import { 
    MoreVertical, Edit, Trash2, Download, ExternalLink,
    File as FileIcon, FileText, FileImage, FileVideo, Music, FileSpreadsheet, Presentation, FileCode, GripVertical
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
import React from 'react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Link2Icon } from './icons/Link2Icon';
import { useUser } from '@/firebase/auth/use-user';
import { DropdownMenuSeparator } from './ui/dropdown-menu';

const getIconForFileType = (item: Content): { Icon: LucideIcon, color: string } => {
    if (item.type === 'LINK') {
        return { Icon: Link2Icon, color: 'text-cyan-400' };
    }

    const fileName = item.name;
    const mimeType = item.metadata?.mime;
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
        window.open(url, '_blank');
    }
}


export const FileCard = React.memo(function FileCard({ 
    item, 
    onFileClick, 
    onRename, 
    onDelete, 
    showDragHandle = true,
}: { 
    item: Content, 
    onFileClick: (item: Content) => void, 
    onRename: () => void, 
    onDelete: () => void,
    showDragHandle?: boolean,
}) {
    const isMobile = useIsMobile();
    const { user } = useUser();
    const isAdmin = user?.uid === process.env.NEXT_PUBLIC_ADMIN_UID;

    const sizeInKB = item.metadata?.size ? (item.metadata.size / 1024) : 0;
    const displaySize = item.type === 'LINK' 
        ? 'Link'
        : item.metadata?.size 
            ? sizeInKB < 1024 
                ? `${sizeInKB.toFixed(1)} KB` 
                : `${(sizeInKB / 1024).toFixed(1)} MB`
            : '--';

    const createdAt = item.createdAt ? format(new Date(item.createdAt), 'MMM dd, yyyy') : 'N/A';
    
    const { Icon, color } = getIconForFileType(item);
    
    const isLink = item.type === 'LINK';
    const linkUrl = item.metadata?.url;
    const storagePath = item.metadata?.storagePath;
    const openUrl = isLink ? linkUrl : storagePath;

    const handleClick = (e: React.MouseEvent) => {
      // Prevent dropdown trigger from also triggering this
      if (e.target instanceof HTMLElement && (e.target.closest('[data-radix-collection-item]') || e.target.closest('button'))) {
          return;
      }
      if (isLink && linkUrl) {
          window.open(linkUrl, '_blank');
      } else {
          onFileClick(item);
      }
    };
    
    return (
        <div 
            className="relative group flex items-center w-full p-3 md:p-3 md:hover:bg-white/10 transition-colors md:rounded-lg md:px-3 px-4 cursor-pointer"
            onClick={handleClick}
        >
            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -left-5 h-full flex items-center">
                {showDragHandle && !isMobile && isAdmin && <GripVertical className="h-5 w-5 text-slate-500 cursor-grab touch-none" />}
            </div>

            <div className="flex items-center gap-3 overflow-hidden flex-1">
                <Icon className={`w-6 h-6 ${color} shrink-0`} />
                <div className="flex-1 overflow-hidden">
                    <h3 className={cn("text-sm font-medium text-white/90 break-words", isMobile && "whitespace-nowrap overflow-hidden text-ellipsis")}>
                        {item.name}
                    </h3>
                    {isMobile && (
                        <p className="text-xs text-slate-400 mt-0.5">
                            <span className="font-ubuntu">{displaySize}</span> • <span className="font-ubuntu">{createdAt}</span>
                        </p>
                    )}
                </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4 shrink-0 ml-2 sm:ml-4">
                <p className="text-xs text-slate-400 hidden lg:block w-24 text-right font-ubuntu">
                    {createdAt}
                </p>
                <p className="text-xs text-slate-400 hidden sm:block w-20 text-right font-ubuntu">
                    {displaySize}
                </p>
                
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-8 h-8 rounded-full text-slate-400 hover:text-white hover:bg-slate-700"
                        >
                            <MoreVertical className="w-5 h-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                        className="w-48 border-slate-700 rounded-xl bg-gradient-to-b from-slate-800/80 to-slate-900/70 backdrop-blur-lg shadow-lg shadow-blue-500/10 text-white"
                        align="end"
                    >
                        {isAdmin && (
                            <DropdownMenuItem onClick={onRename} className="cursor-pointer">
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Rename</span>
                            </DropdownMenuItem>
                        )}
                        {!isLink && (
                            <DropdownMenuItem 
                                onClick={() => storagePath && handleForceDownload(storagePath, item.name)} 
                                disabled={!storagePath}
                                className="cursor-pointer"
                            >
                                <Download className="mr-2 h-4 w-4" />
                                <span>Download</span>
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => window.open(openUrl, '_blank')} disabled={!openUrl} className="cursor-pointer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            <span>Open in new tab</span>
                        </DropdownMenuItem>
                        {isAdmin && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={onDelete} className="cursor-pointer text-red-400 focus:text-red-400 focus:bg-red-500/10">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Delete</span>
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    )
});
