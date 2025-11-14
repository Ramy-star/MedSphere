'use client';
import { ArrowRight, ArrowLeft, Plus, CheckSquare } from 'lucide-react';
import { AddContentMenu } from './AddContentMenu';
import { useAuthStore } from '@/stores/auth-store';
import Image from 'next/image';
import { allSubjectIcons } from '@/lib/file-data';
import { usePathname } from 'next/navigation';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemo, useState } from 'react';
import { Button } from './ui/button';
import { Content } from '@/lib/contentService';
import { LucideIcon, Folder, Layers, Calendar, Inbox } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';


export default function FileExplorerHeader({ onFileSelected, isSelectMode, onToggleSelectMode }: { onFileSelected?: (file: File) => void, isSelectMode?: boolean, onToggleSelectMode?: () => void }) {
  const { canAddContent, can } = useAuthStore();
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const [popoverOpen, setPopoverOpen] = useState(false);
  
  const { data: allItems } = useCollection<Content>('content');

  const { currentFolder } = useMemo(() => {
    if (!allItems) return { currentFolder: null };

    const itemMap = new Map<string, Content>(allItems.map(item => [item.id, item]));
    const pathSegments = pathname.split('/').filter(Boolean);
    let folder: Content | undefined | null = null;
  
    if (pathSegments[0] === 'folder' && pathSegments[1]) {
      folder = itemMap.get(pathSegments[1]);
    } else if (pathSegments[0] === 'level' && pathSegments[1]) {
      const levelName = decodeURIComponent(pathSegments[1]);
      folder = allItems.find(item => item.type === 'LEVEL' && item.name === levelName);
    }
    
    return { currentFolder: folder };

  }, [allItems, pathname]);


  const renderIcon = () => {
    if (!currentFolder) {
      return null;
    }

    if (currentFolder.metadata?.iconURL) {
      return (
        <div className="relative w-7 h-7 sm:w-8 sm:h-8">
          <Image
            src={currentFolder.metadata.iconURL}
            alt={currentFolder.name}
            fill
            className="object-cover rounded-md pointer-events-none select-none"
            sizes="(max-width: 640px) 28px, 32px"
            draggable={false}
          />
        </div>
      );
    }
    
    if (currentFolder.id === 'telegram-inbox-folder') {
        return <Inbox className="w-7 h-7 sm:w-8 sm:h-8 text-blue-400" />;
    }

    let Icon: LucideIcon = Folder;
    let iconColor = 'text-yellow-400';

    switch (currentFolder.type) {
      case 'LEVEL':
        Icon = Layers;
        iconColor = 'text-blue-400';
        break;
      case 'SEMESTER':
        Icon = Calendar;
        iconColor = 'text-green-400';
        break;
      case 'SUBJECT':
        Icon = (currentFolder.iconName && allSubjectIcons[currentFolder.iconName]) || Folder;
        iconColor = currentFolder.color || 'text-yellow-400';
        break;
      case 'FOLDER':
      default:
        Icon = Folder;
        iconColor = 'text-yellow-400';
        break;
    }

    return <Icon className={`w-7 h-7 sm:w-8 sm:h-8 ${iconColor}`} />;
  };
  
  const showSelectButton = currentFolder?.type !== 'LEVEL';


  return (
    <div className="flex items-center justify-between min-h-[40px] flex-wrap gap-4">
      <div className="flex items-center gap-3">
        {renderIcon()}
        <h1 className="text-lg sm:text-xl font-bold text-white">
          {currentFolder ? currentFolder.name : ''}
        </h1>
      </div>
      <div className="flex gap-2">
         {showSelectButton && can('canSelectItem', null) && onToggleSelectMode && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                  <Button 
                      variant={isSelectMode ? "secondary" : "outline"} 
                      onClick={onToggleSelectMode} 
                      size={isMobile ? "icon" : "sm"}
                      className={cn("rounded-2xl active:scale-95 transition-transform", isMobile && "w-9 h-9")}
                  >
                      <CheckSquare className="h-4 w-4" />
                      {!isMobile && <span className="ml-2">Select Items</span>}
                  </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Select multiple items</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {canAddContent(currentFolder?.id || null) && currentFolder && onFileSelected && currentFolder.type !== 'LEVEL' && (
           <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                       <Button size={isMobile ? "icon" : "sm"} className="rounded-2xl active:scale-95 transition-transform">
                          <Plus className={cn("h-4 w-4", !isMobile && "mr-2")} />
                          {!isMobile && <span>Add Content</span>}
                       </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                       <p>Add new content</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </PopoverTrigger>
              <AddContentMenu parentId={currentFolder.id} onFileSelected={onFileSelected} setPopoverOpen={setPopoverOpen} />
            </Popover>
        )}
        <div className="hidden md:flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={() => window.history.back()} variant="ghost" size="icon" className="w-8 h-8 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white"><ArrowLeft size={16} /></Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Back</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={() => window.history.forward()} variant="ghost" size="icon" className="w-8 h-8 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white"><ArrowRight size={16} /></Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Forward</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
