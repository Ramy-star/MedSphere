
'use client';
import { ArrowRight, ArrowLeft, Plus, Folder } from 'lucide-react';
import { Breadcrumbs } from './breadcrumbs';
import type { Content } from '@/lib/contentService';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';
import { AddContentMenu } from './AddContentMenu';

type ExtendedContent = Content & { icon?: LucideIcon, iconColor?: string };

export default function FileExplorerHeader({ currentFolder, onFileSelected }: { currentFolder?: ExtendedContent, onFileSelected?: (file: File) => void }) {
  const CurrentIcon = currentFolder?.icon || Folder;
  const iconColor = currentFolder?.iconColor || 'text-yellow-400';
  return (
    <div className="mb-6 space-y-4">
      <div className="flex items-start justify-between">
        <Breadcrumbs current={currentFolder} />
        <div className="hidden md:flex items-center gap-3">
          <button onClick={() => window.history.back()} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"><ArrowLeft size={16} /></button>
          <button onClick={() => window.history.forward()} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"><ArrowRight size={16} /></button>
        </div>
      </div>
      
      <div className="flex items-center justify-between min-h-[40px] flex-wrap gap-4">
        {currentFolder && (
             <div className="flex items-center gap-4">
                <CurrentIcon className={`w-8 h-8 sm:w-10 sm:h-10 ${iconColor}`} />
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                    {currentFolder?.name}
                </h1>
            </div>
        )}
        {onFileSelected && currentFolder && currentFolder.type !== 'SEMESTER' && (
          <div>
            <AddContentMenu parentId={currentFolder.id} onFileSelected={onFileSelected} />
          </div>
        )}
      </div>

    </div>
  );
}
    

    