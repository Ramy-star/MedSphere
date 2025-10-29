
'use client';
import Link from 'next/link';
import { HomeIcon, ChevronRight } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useMemo, Fragment } from 'react';
import { Skeleton } from './ui/skeleton';
import { Content } from '@/lib/contentService';
import { useCollection } from '@/firebase/firestore/use-collection';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';

type Crumb = {
  id: string;
  name: string;
  path: string;
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const { data: allItems, loading: loadingAllItems } = useCollection<Content>('content');
  const [crumbs, setCrumbs] = useState<Crumb[]>([]);
  const { user } = useAuthStore();

  const itemMap = useMemo(() => {
    if (!allItems) return new Map<string, Content>();
    return new Map(allItems.map(item => [item.id, item]));
  }, [allItems]);

  useEffect(() => {
    if (pathname === '/') {
      setCrumbs([]);
      return;
    }
    
    if (!allItems) {
      setCrumbs([]);
      return;
    }

    const pathSegments = pathname.split('/').filter(Boolean);
    
    const newCrumbs: Crumb[] = [];
    let currentId: string | null = null;
    const firstSegment = pathSegments[0];
    const secondSegment = pathSegments[1];

    if (firstSegment === 'folder' && secondSegment) {
      currentId = secondSegment;
    } else if (firstSegment === 'level' && secondSegment) {
      const levelName = decodeURIComponent(secondSegment);
      const level = allItems.find(item => item.type === 'LEVEL' && item.name === levelName);
      if (level) {
        currentId = level.id;
      }
    } else if (firstSegment === 'search') {
      const query = new URLSearchParams(window.location.search).get('q');
      setCrumbs([{ id: 'search', name: `Search: "${query}"`, path: pathname }]);
      return;
    } else if (firstSegment === 'profile') {
        setCrumbs([{ id: 'profile', name: 'Profile', path: pathname }]);
        return;
    }


    let tempId = currentId;
    while (tempId) {
      const item = itemMap.get(tempId);
      if (item) {
        let path;
        if (item.type === 'LEVEL') {
          path = `/level/${encodeURIComponent(item.name)}`;
        } else {
          path = `/folder/${item.id}`;
        }
        newCrumbs.unshift({ id: item.id, name: item.name, path });
        tempId = item.parentId;
      } else {
        break; 
      }
    }

    setCrumbs(newCrumbs);

  }, [pathname, allItems, itemMap, user]);

  const homeElement = (
    <div className="flex items-center">
      <Link href="/" className={cn("flex items-center gap-1 hover:text-white transition-all active:scale-95")}>
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
        return (
          <Fragment key={crumb.id}>
            <ChevronRight className="w-4 h-4 opacity-60" />
            {isLast ? (
              <span className="font-semibold text-white">{crumb.name}</span>
            ) : (
              <Link href={crumb.path} className={cn("hover:text-white transition-all active:scale-95")}>
                {crumb.name}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
