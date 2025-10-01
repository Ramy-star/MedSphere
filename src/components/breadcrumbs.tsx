
'use client';
import Link from 'next/link';
import { HomeIcon, ChevronRight } from 'lucide-react';
import type { Content } from '@/lib/contentService';
import { useEffect, useState, useMemo } from 'react';
import { useCollection } from '@/firebase/firestore/use-collection';

function getLink(item: Content): string {
  switch (item.type) {
    case 'LEVEL':
      return `/level/${encodeURIComponent(item.name)}`;
    case 'SEMESTER':
    case 'SUBJECT':
    case 'FOLDER':
      return `/folder/${item.id}`;
    default:
      return '#';
  }
}

export function Breadcrumbs({ current }: { current?: Content }) {
  const { data: allItems, loading: loadingAllItems } = useCollection<Content>('content');
  const [ancestors, setAncestors] = useState<Content[]>([]);

  const itemsMap = useMemo(() => {
    if (!allItems) return new Map<string, Content>();
    const map = new Map<string, Content>();
    allItems.forEach(item => map.set(item.id, item));
    return map;
  }, [allItems]);

  useEffect(() => {
    if (!current || !allItems || itemsMap.size === 0) {
      setAncestors([]);
      return;
    }

    const buildAncestors = () => {
      const path: Content[] = [];
      let parentId = current.parentId;
      while (parentId && itemsMap.has(parentId)) {
        const parent = itemsMap.get(parentId)!;
        path.unshift(parent);
        parentId = parent.parentId;
      }
      setAncestors(path);
    };

    buildAncestors();
  }, [current, allItems, itemsMap]);

  const homeElement = (
    <div className="flex items-center">
      <Link href="/" className="flex items-center gap-1 hover:text-white">
        <HomeIcon size={14}/> 
        <span>Home</span>
      </Link>
    </div>
  );
  
  const loading = loadingAllItems && !current;

  return (
     <nav className="flex items-center gap-2 text-sm text-slate-300 flex-wrap min-h-[20px]">
      {homeElement}
      
      {loading && (
        <span className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 opacity-60" />
            <div className="h-4 w-24 bg-muted animate-pulse rounded-md" />
        </span>
      )}

      {!loading && ancestors.map((node) => (
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

      {!loading && current && current.id !== 'root' && (
        <span className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 opacity-60" />
            <span className="font-semibold text-white">{current.name}</span>
        </span>
      )}
    </nav>
  )
}
