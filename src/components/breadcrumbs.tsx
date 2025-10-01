
'use client';
import Link from 'next/link';
import { HomeIcon, ChevronRight } from 'lucide-react';
import type { Content } from '@/lib/contentService';
import { useEffect, useState, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { Skeleton } from './ui/skeleton';

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

// Cache to store fetched ancestor paths to avoid re-fetching
const ancestorCache = new Map<string, Content[]>();

async function fetchAncestorsWithCache(db: any, currentId: string): Promise<Content[]> {
    if (currentId === 'root' || !db) return [];
    if (ancestorCache.has(currentId)) {
        return ancestorCache.get(currentId)!;
    }

    const ancestors: Content[] = [];
    let parentId: string | null = null;

    const currentDocRef = doc(db, 'content', currentId);
    const currentDoc = await getDoc(currentDocRef);
    if (currentDoc.exists()) {
        parentId = (currentDoc.data() as Content).parentId;
    }

    while (parentId) {
        const parentDocRef = doc(db, 'content', parentId);
        const parentDoc = await getDoc(parentDocRef);
        if (parentDoc.exists()) {
            const parentData = { id: parentDoc.id, ...parentDoc.data() } as Content;
            ancestors.unshift(parentData);
            
            // Cache the sub-path for the parent to speed up future lookups
            if (!ancestorCache.has(parentId)) {
                 ancestorCache.set(parentId, ancestors.slice(0, -1));
            }
            parentId = parentData.parentId;
        } else {
            break;
        }
    }
    
    ancestorCache.set(currentId, ancestors);
    return ancestors;
}


export function Breadcrumbs({ current }: { current?: Content }) {
  const { db } = useFirebase();
  const [ancestors, setAncestors] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Use a ref to keep the previous ancestors during loading of new ones
  const previousAncestorsRef = useRef<Content[]>([]);
  if (!loading) {
    previousAncestorsRef.current = ancestors;
  }

  useEffect(() => {
    if (current && current.id !== 'root') {
        setLoading(true);
        fetchAncestorsWithCache(db, current.id).then(fetchedAncestors => {
            setAncestors(fetchedAncestors);
            setLoading(false);
        });
    } else {
        setAncestors([]);
        setLoading(false);
    }
  }, [current, db]);

  const homeElement = (
    <div className="flex items-center">
      <Link href="/" className="flex items-center gap-1 hover:text-white">
        <HomeIcon size={14}/> 
        <span>Home</span>
      </Link>
    </div>
  );
  
  // Use previous ancestors for skeleton to prevent flicker and show context
  const skeletonPath = previousAncestorsRef.current;

  return (
     <nav className="flex items-center gap-2 text-sm text-slate-300 flex-wrap min-h-[20px]">
      {homeElement}
      
      {loading && current && (
         <>
          {skeletonPath.map(node => (
            <span key={`skel-anc-${node.id}`} className="flex items-center gap-2">
                <ChevronRight className="w-4 h-4 opacity-60" />
                 <Link href={getLink(node)} className="hover:text-white">
                    {node.name}
                 </Link>
            </span>
          ))}
          {/* Skeleton for the part that is currently loading */}
          <span className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 opacity-60" />
            <Skeleton className="h-4 w-24" />
          </span>
         </>
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
