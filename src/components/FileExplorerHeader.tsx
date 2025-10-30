'use client';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { AddContentMenu } from './AddContentMenu';
import { useAuthStore } from '@/stores/auth-store';
import Image from 'next/image';
import { allSubjectIcons } from '@/lib/file-data';
import { usePathname } from 'next/navigation';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemo } from 'react';
import { Button } from './ui/button';
import { Content } from '@/lib/contentService';
import { LucideIcon, Folder, Layers, Calendar, Inbox } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';


export default function FileExplorerHeader({ onFileSelected }: { onFileSelected?: (file: File) => void }) {
  const { canAddContent } = useAuthStore();
  const pathname = usePathname();
  
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
        return <Inbox className="w-7 h-7 sm:w-8 sm:h-8 text-yellow-400" />;
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

  return (
    <div className="flex items-center justify-between min-h-[40px] flex-wrap gap-4">
      <div className="flex items-center gap-3">
        {renderIcon()}
        <h1 className="text-lg sm:text-xl font-bold text-white">
          {currentFolder ? currentFolder.name : ''}
        </h1>
      </div>
      <div className="flex gap-2">
        {canAddContent(currentFolder?.id || null) && currentFolder && onFileSelected && currentFolder.type !== 'LEVEL' && (
          <div>
            <AddContentMenu parentId={currentFolder.id} onFileSelected={onFileSelected} />
          </div>
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
