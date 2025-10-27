
'use client';
import { 
    MoreVertical, Edit, Trash2, Download, ExternalLink, RefreshCw,
    File as FileIcon, FileText, FileImage, FileVideo, Music, FileSpreadsheet, Presentation, FileCode, GripVertical, Wand2, Eye, Lightbulb, HelpCircle, FileCheck, Copy, Move, EyeOff
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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
import React, { useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Link2Icon } from './icons/Link2Icon';
import { useAuthStore } from '@/stores/auth-store';
import { useQuestionGenerationStore } from '@/stores/question-gen-store';
import { useRouter, usePathname } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { UploadProgress, UploadingFile } from './UploadProgress';
import { FileQuestion } from './icons/FileQuestion';
import { InteractiveExamIcon } from './icons/InteractiveExamIcon';
import { FlashcardIcon } from './icons/FlashcardIcon';

const getIconForFileType = (item: Content): { Icon: LucideIcon | React.FC<any>, color: string, isImage?: boolean } => {
    if (item.type === 'LINK') {
        return { Icon: Link2Icon, color: 'text-cyan-400' };
    }
    
    if (item.type === 'INTERACTIVE_QUIZ') {
        return { Icon: Lightbulb, color: 'text-yellow-400' };
    }

    if (item.type === 'INTERACTIVE_EXAM') {
        return { Icon: InteractiveExamIcon, color: '' };
    }

    if (item.type === 'INTERACTIVE_FLASHCARD') {
        return { Icon: FlashcardIcon, color: '', isImage: true };
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
        case 'md':
            return { Icon: HelpCircle, color: 'text-red-400' };
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
    onUpdate,
    onMove,
    onCopy,
    onToggleVisibility,
    showDragHandle = true,
    uploadingFile,
    onRemoveUpload,
    onRetryUpload,
}: { 
    item: Content, 
    onFileClick: (item: Content) => void, 
    onRename: () => void, 
    onDelete: () => void,
    onUpdate?: (file: File) => void,
    onMove: () => void;
    onCopy: () => void;
    onToggleVisibility: () => void;
    showDragHandle?: boolean,
    uploadingFile?: UploadingFile,
    onRemoveUpload?: (id: string) => void,
    onRetryUpload?: (id: string) => void,
}) {
    const isMobile = useIsMobile();
    const router = useRouter();
    const pathname = usePathname();
    const { can } = useAuthStore();
    const { initiateGeneration } = useQuestionGenerationStore();
    const updateFileInputRef = useRef<HTMLInputElement>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const sizeInKB = item.metadata?.size ? (item.metadata.size / 1024) : 0;
    const displaySize = (() => {
        if (item.type === 'LINK') return 'Link';
        if (item.type === 'INTERACTIVE_QUIZ') return 'Quiz';
        if (item.type === 'INTERACTIVE_EXAM') return 'Exam';
        if (item.type === 'INTERACTIVE_FLASHCARD') return 'Flashcard';
        if (item.metadata?.size) {
            const sizeInKB = item.metadata.size / 1024;
            return sizeInKB < 1024
                ? `${sizeInKB.toFixed(1)} KB`
                : `${(sizeInKB / 1024).toFixed(1)} MB`;
        }
        return '--';
    })();

    const createdAt = item.createdAt ? format(new Date(item.createdAt), 'MMM dd, yyyy') : 'N/A';
    const displayName = item.name.replace(/\.[^/.]+$/, "");
    
    const { Icon, color } = getIconForFileType(item);
    
    const isLink = item.type === 'LINK';
    const linkUrl = item.metadata?.url;
    const storagePath = item.metadata?.storagePath;
    const browserUrl = isLink ? linkUrl : storagePath;

    const handleClick = (e: React.MouseEvent) => {
      if (uploadingFile) return; // Prevent clicks during update
      // Ignore clicks on interactive elements within the card
      if (e.target instanceof HTMLElement && e.target.closest('button, a, input, [role="menuitem"], [data-radix-dropdown-menu-trigger]')) {
          return;
      }
      onFileClick(item);
    };

    const handleCreateQuestions = () => {
        if (item.metadata?.storagePath) {
            initiateGeneration({
                id: item.id,
                fileName: item.name,
                fileUrl: item.metadata.storagePath,
            });
            router.push('/questions-creator');
        }
    };
    
    const handleFileUpdate = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && onUpdate) {
            onUpdate(file);
        }
        // Reset the input value to allow selecting the same file again
        if(event.target) {
            event.target.value = '';
        }
    };

    const handleUpdateClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        updateFileInputRef.current?.click();
    };
    
    const handleAction = (e: Event, action: () => void) => {
        e.preventDefault();
        e.stopPropagation();
        action();
        setDropdownOpen(false);
    };

    if (uploadingFile) {
        return (
            <div className={cn("relative group flex items-center w-full my-1.5 p-2 md:p-2")}>
                <UploadProgress
                    file={uploadingFile}
                    onRetry={() => onRetryUpload?.(uploadingFile.id)}
                    onRemove={() => onRemoveUpload?.(uploadingFile.id)}
                />
            </div>
        )
    }

    const VisibilityIcon = item.metadata?.isHidden ? Eye : EyeOff;

    return (
        <div 
            className={cn("relative group flex items-center w-full p-2 md:p-2 md:hover:bg-white/10 transition-colors md:rounded-2xl cursor-pointer my-1.5", item.metadata?.isHidden && "opacity-60 bg-white/5")}
            onClick={handleClick}
        >
             <input
                type="file"
                ref={updateFileInputRef}
                className="hidden"
                onChange={handleFileUpdate}
            />
            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -left-5 h-full flex items-center">
                {showDragHandle && !isMobile && can('canMove', pathname) && <GripVertical className="h-5 w-5 text-slate-500 cursor-grab touch-none" />}
            </div>

            <div className="flex items-center gap-3 overflow-hidden flex-1">
                <Icon className={`w-6 h-6 ${color} shrink-0`} />
                <div className="flex-1 overflow-hidden">
                    <h3 className={cn("text-sm font-medium text-white/90 break-words", isMobile && "whitespace-nowrap overflow-hidden text-ellipsis")}>
                        {displayName}
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
                    <DropdownMenuContent 
                        className="w-48 p-2"
                        align="end"
                    >
                         <DropdownMenuItem onSelect={(e) => handleAction(e, () => onFileClick(item))}>
                            <Eye className="mr-2 h-4 w-4" />
                            <span>Open</span>
                        </DropdownMenuItem>
                        {browserUrl && (
                        <DropdownMenuItem onSelect={(e) => handleAction(e, () => window.open(browserUrl, '_blank'))} disabled={!browserUrl}>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            <span>Open in browser</span>
                        </DropdownMenuItem>
                        )}
                        {!isLink && item.type !== 'INTERACTIVE_QUIZ' && item.type !== 'INTERACTIVE_EXAM' && item.type !== 'INTERACTIVE_FLASHCARD' &&(
                            <DropdownMenuItem 
                                onSelect={(e) => handleAction(e, () => { if (storagePath) handleForceDownload(storagePath, item.name); })}
                                disabled={!storagePath}
                            >
                                <Download className="mr-2 h-4 w-4" />
                                <span>Download</span>
                            </DropdownMenuItem>
                        )}
                        
                        {(can('canRename', pathname) || can('canDelete', pathname)) && <DropdownMenuSeparator />}

                        {item.type === 'FILE' && item.metadata?.mime === 'application/pdf' && can('canCreateQuestions', pathname) && (
                            <DropdownMenuItem onSelect={(e) => handleAction(e, handleCreateQuestions)}>
                                <Wand2 className="mr-2 h-4 w-4 text-yellow-400" />
                                <span>Create Questions</span>
                            </DropdownMenuItem>
                        )}
                        {!isLink && onUpdate && item.type !== 'INTERACTIVE_QUIZ' && item.type !== 'INTERACTIVE_EXAM' && item.type !== 'INTERACTIVE_FLASHCARD' && can('canUpdateFile', pathname) && (
                            <DropdownMenuItem onSelect={handleUpdateClick}>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              <span>Update</span>
                            </DropdownMenuItem>
                        )}
                        {can('canRename', pathname) && (
                            <DropdownMenuItem onSelect={(e) => handleAction(e, onRename)}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Rename</span>
                            </DropdownMenuItem>
                        )}
                        {can('canMove', pathname) && (
                            <DropdownMenuItem onSelect={(e) => handleAction(e, onMove)}>
                                <Move className="mr-2 h-4 w-4" />
                                <span>Move</span>
                            </DropdownMenuItem>
                        )}
                        {can('canCopy', pathname) && (
                            <DropdownMenuItem onSelect={(e) => handleAction(e, onCopy)}>
                                <Copy className="mr-2 h-4 w-4" />
                                <span>Copy</span>
                            </DropdownMenuItem>
                        )}
                        {can('canToggleVisibility', pathname) && (
                             <DropdownMenuItem onSelect={(e) => handleAction(e, onToggleVisibility)}>
                                <VisibilityIcon className="mr-2 h-4 w-4" />
                                <span>{item.metadata?.isHidden ? 'Show' : 'Hide'}</span>
                            </DropdownMenuItem>
                        )}
                        
                        {can('canDelete', pathname) && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={(e) => handleAction(e, onDelete)} className="text-red-400 focus:text-red-400 focus:bg-red-500/10">
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
