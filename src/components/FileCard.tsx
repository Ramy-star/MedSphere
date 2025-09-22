'use client';
import { File } from 'lucide-react';
import type { ContentItem } from '@/lib/contentService';

export function FileCard({ item, onFileClick }: { item: ContentItem, onFileClick: (item: ContentItem) => void }) {
    return (
        <div 
            onClick={() => onFileClick(item)}
            className="glass-card p-4 rounded-xl group hover:bg-white/10 transition-colors cursor-pointer"
        >
            <div className="flex items-center gap-3">
                <File className="w-6 h-6 text-blue-400" />
                <h3 className="text-lg font-semibold text-white truncate">{item.name}</h3>
            </div>
             <p className="text-xs text-slate-400 mt-1 truncate">
                {item.metadata?.size ? `${(item.metadata.size / 1024).toFixed(1)} KB` : ''}
             </p>
        </div>
    );
}
