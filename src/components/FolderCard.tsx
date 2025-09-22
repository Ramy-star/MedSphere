'use client';
import Link from 'next/link';
import { Folder } from 'lucide-react';
import type { ContentItem } from '@/lib/contentService';

export function FolderCard({ item }: { item: ContentItem }) {
    return (
        <Link href={`/folder/${item.id}`} className="block glass-card p-4 rounded-xl group hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-3">
                <Folder className="w-6 h-6 text-yellow-400" />
                <h3 className="text-lg font-semibold text-white truncate">{item.name}</h3>
            </div>
        </Link>
    );
}
