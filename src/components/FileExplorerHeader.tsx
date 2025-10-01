
'use client';
import { ArrowRight, ArrowLeft, Plus, Folder, Layers, Calendar } from 'lucide-react';
import { Breadcrumbs } from './breadcrumbs';
import type { Content } from '@/lib/contentService';
import { LucideIcon } from 'lucide-react';
import { AddContentMenu } from './AddContentMenu';
import { useUser } from '@/firebase/auth/use-user';
import Image from 'next/image';
import { allSubjectIcons } from '@/lib/file-data';
import { Skeleton } from './ui/skeleton';

export default function FileExplorerHeader({ currentFolder }: { currentFolder?: Content | null }) {
  const { user } = useUser();
  const isAdmin = user?.uid === process.env.NEXT_PUBLIC_ADMIN_UID;
  
  const renderIcon = () => {
    if (!currentFolder) {
      return <Skeleton className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg" />
    }

    if (currentFolder.metadata?.iconURL) {
      return (
        <div className="relative w-8 h-8 sm:w-10 sm:h-10">
          <Image
            src={currentFolder.metadata.iconURL}
            alt={currentFolder.name}
            fill
            className="object-cover rounded-md"
            sizes="(max-width: 640px) 32px, 40px"
          />
        </div>
      );
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

    return <Icon className={`w-8 h-8 sm:w-10 sm:h-10 ${iconColor}`} />;
  };

  return (
    <div className="mb-6 space-y-4">
      <div className="flex items-start justify-between">
        <Breadcrumbs />
        <div className="hidden md:flex items-center gap-3">
          <button onClick={() => window.history.back()} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"><ArrowLeft size={16} /></button>
          <button onClick={() => window.history.forward()} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"><ArrowRight size={16} /></button>
        </div>
      </div>
      
      <div className="flex items-center justify-between min-h-[40px] flex-wrap gap-4">
        <div className="flex items-center gap-4">
          {renderIcon()}
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            {currentFolder ? currentFolder.name : <Skeleton className="h-8 w-48" />}
          </h1>
        </div>
        {isAdmin && currentFolder && onFileSelected && currentFolder.type !== 'SEMESTER' && (
          <div>
            <AddContentMenu parentId={currentFolder.id} onFileSelected={onFileSelected} />
          </div>
        )}
      </div>

    </div>
  );
}
    

    

