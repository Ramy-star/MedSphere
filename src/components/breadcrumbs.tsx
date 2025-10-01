
'use client';
import Link from 'next/link';
import { HomeIcon, ChevronRight } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useMemo, Fragment } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { Skeleton } from './ui/skeleton';

type Crumb = {
  name: string;
  path: string;
};

const nameCache = new Map<string, string>();

async function fetchName(db: any, id: string): Promise<string> {
  if (nameCache.has(id)) {
    return nameCache.get(id)!;
  }
  try {
    const docRef = doc(db, 'content', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const name = docSnap.data().name;
      nameCache.set(id, name);
      return name;
    }
  } catch (error) {
    console.error(`Failed to fetch name for ID ${id}:`, error);
  }
  return id; // Fallback to ID if name not found
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const { db } = useFirebase();
  const [crumbs, setCrumbs] = useState<Crumb[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateCrumbs = async () => {
      setLoading(true);
      const pathSegments = pathname.split('/').filter(Boolean);
      const newCrumbs: Crumb[] = [];

      if (pathSegments.length === 0) {
        setCrumbs([]);
        setLoading(false);
        return;
      }

      let currentPath = '';
      for (const segment of pathSegments) {
        currentPath += `/${segment}`;
        let name = decodeURIComponent(segment);
        
        if (pathSegments[0] === 'folder' && segment !== 'folder') {
            name = await fetchName(db, segment);
        }
        
        newCrumbs.push({ name, path: currentPath });
      }
      setCrumbs(newCrumbs);
      setLoading(false);
    };

    generateCrumbs();
  }, [pathname, db]);

  const homeElement = (
    <div className="flex items-center">
      <Link href="/" className="flex items-center gap-1 hover:text-white">
        <HomeIcon size={14} />
        <span>Home</span>
      </Link>
    </div>
  );

  return (
    <nav className="flex items-center gap-2 text-sm text-slate-300 flex-wrap min-h-[20px]">
      {homeElement}
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        const segmentKey = crumb.path;
        
        if(crumb.name === 'level' || crumb.name === 'folder') return null;

        return (
          <Fragment key={segmentKey}>
            <ChevronRight className="w-4 h-4 opacity-60" />
            {isLast ? (
              <span className="font-semibold text-white">{crumb.name}</span>
            ) : (
              <Link href={crumb.path} className="hover:text-white">
                {crumb.name}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
