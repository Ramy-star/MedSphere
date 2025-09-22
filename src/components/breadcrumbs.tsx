
'use client';
import Link from 'next/link';
import { HomeIcon, ChevronRight } from 'lucide-react';
import type { Content } from '@/lib/contentService';

function getLink(item: Content): string {
  switch (item.type) {
    case 'LEVEL':
      return `/level/${encodeURIComponent(item.name)}`;
    case 'SEMESTER':
        // This requires finding the level parent, which is complex here.
        // A simpler approach is to have a generic folder page.
        return `/folder/${item.id}`;
    case 'SUBJECT':
    case 'FOLDER':
      return `/folder/${item.id}`;
    default:
      return '#';
  }
}

export function Breadcrumbs({ ancestors, current }: { ancestors?: Content[], current?: Content }) {

  const homeElement = (
    <div className="flex items-center">
      <Link href="/" className="flex items-center gap-1 hover:text-white">
        <HomeIcon size={14}/> 
        <span>Home</span>
      </Link>
    </div>
  );

  const pathToShow = ancestors || [];
  
  return (
     <nav className="flex items-center gap-2 text-sm text-slate-300 flex-wrap">
      {homeElement}
      
      {pathToShow.map((node) => (
        <span key={node.id} className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 opacity-60" />
            <Link 
              href={getLink(node)} 
              className="hover:text-white"
            >
              {node.name} 
            </Link>
        </span>
      ))}

      {current && (
        <span className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 opacity-60" />
            <span className="font-semibold text-white">{current.name}</span>
        </span>
      )}

    </nav>
  )
}
