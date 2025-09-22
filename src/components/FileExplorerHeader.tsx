
'use client';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { Breadcrumbs } from './breadcrumbs';
import type { ContentItem } from '@/lib/contentService';
import { Folder as FolderIcon } from 'lucide-react';


export default function FileExplorerHeader({ currentFolder, ancestors, children }: { currentFolder?: ContentItem, ancestors?: ContentItem[], children?: React.ReactNode }) {
  
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <Breadcrumbs ancestors={ancestors} />
        <div className="flex items-center gap-3">
          {children}
          <div className="flex items-center gap-3">
            <button onClick={() => window.history.back()} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"><ArrowLeft size={16} /></button>
            <button onClick={() => window.history.forward()} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"><ArrowRight size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
