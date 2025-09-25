
'use client';
import Link from 'next/link';
import { HomeIcon, ChevronRight } from 'lucide-react';
import type { Content } from '@/lib/contentService';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useEffect, useState } from 'react';
import { db } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';

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


async function fetchAncestors(currentId: string): Promise<Content[]> {
    if (currentId === 'root' || !db) return [];
    
    const ancestors: Content[] = [];
    let parentId: string | null = null;
    
    const currentDoc = await getDoc(doc(db, 'content', currentId));
    if (currentDoc.exists()) {
        parentId = (currentDoc.data() as Content).parentId;
    }

    while (parentId) {
        const parentDoc = await getDoc(doc(db, 'content', parentId));
        if (parentDoc.exists()) {
            const parentData = parentDoc.data() as Content;
            ancestors.unshift(parentData);
            parentId = parentData.parentId;
        } else {
            break;
        }
    }
    return ancestors;
}


export function Breadcrumbs({ current }: { current?: Content }) {
  const [ancestors, setAncestors] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (current && current.id !== 'root') {
        setLoading(true);
        fetchAncestors(current.id).then(fetchedAncestors => {
            setAncestors(fetchedAncestors);
            setLoading(false);
        });
    } else {
        setAncestors([]);
        setLoading(false);
    }
  }, [current]);

  const homeElement = (
    <div className="flex items-center">
      <Link href="/" className="flex items-center gap-1 hover:text-white">
        <HomeIcon size={14}/> 
        <span>Home</span>
      </Link>
    </div>
  );
  
  return (
     <nav className="flex items-center gap-2 text-sm text-slate-300 flex-wrap">
      {homeElement}
      
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

      {current && current.id !== 'root' && (
        <span className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 opacity-60" />
            <span className="font-semibold text-white">{current.name}</span>
        </span>
      )}

    </nav>
  )
}
