
'use client';
import { MoreVertical, Edit, Trash2, Download, Upload } from 'lucide-react';
import type { Content } from '@/lib/contentService';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from './ui/button';
import { format } from 'date-fns';
import Image from 'next/image';

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

const getThumbnail = (item: Content): string => {
    const mime = item.metadata?.mime || '';
    const publicId = item.metadata?.cloudinaryPublicId;
    const url = item.metadata?.storagePath;

    if (mime.startsWith('image/') && url) {
        return url;
    }
    if (mime === 'application/pdf' && publicId && cloudName) {
        return `https://res.cloudinary.com/${cloudName}/image/upload/pg_1/${publicId}.jpg`;
    }
    return '/icons/file-icon.svg';
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
    onUpdate
}: { 
    item: Content, 
    onFileClick: (item: Content) => void, 
    onRename: () => void, 
    onDelete: () => void,
    onUpdate: () => void
}) {

    const sizeInKB = item.metadata?.size ? (item.metadata.size / 1024) : 0;
    const displaySize = sizeInKB < 1024 
        ? `${sizeInKB.toFixed(1)} KB` 
        : `${(sizeInKB / 1024).toFixed(1)} MB`;

    const createdAt = item.createdAt ? format(new Date(item.createdAt), 'MMM dd, yyyy') : 'N/A';
    
    const thumbnailUrl = getThumbnail(item);

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
                 <Image 
                    src={thumbnailUrl} 
                    alt={item.name} 
                    width={24} 
                    height={24} 
                    className="w-6 h-6 object-cover rounded-sm shrink-0 bg-slate-700" 
                    // Handle image loading errors by falling back to the default icon
                    onError={(e) => (e.currentTarget.src = '/icons/file-icon.svg')}
                />
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
           <DropdownMenuItem onClick={onUpdate} className="cursor-pointer">
            <Upload className="mr-2 h-4 w-4" />
            <span>Update File</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="cursor-pointer text-red-400 focus:text-red-400 focus:bg-red-500/10">
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
}
