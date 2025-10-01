
'use client';
import Link from 'next/link';
import { HomeIcon, ChevronRight } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useMemo, Fragment } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';
import { Skeleton } from './ui/skeleton';
import { Content } from '@/lib/contentService';


type Crumb = {
  id: string;
  name: string;
  path: string;
};

// A simple in-memory cache for ancestor paths
const ancestorCache = new Map<string, Crumb[]>();
// A cache for item names to avoid re-fetching
const nameCache = new Map<string, string>();


async function fetchItemName(db: any, id: string): Promise<string> {
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
    return id; // Fallback to ID
}

async function fetchAncestors(db: any, currentId: string | null): Promise<Crumb[]> {
    if (!currentId || currentId === 'root') {
        return [];
    }

    if (ancestorCache.has(currentId)) {
        return ancestorCache.get(currentId)!;
    }

    let ancestors: Crumb[] = [];
    let parentId: string | null = currentId;

    while (parentId) {
        try {
            const docRef = doc(db, 'content', parentId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data() as Content;
                 let path;
                if (data.type === 'LEVEL') {
                    path = `/level/${encodeURIComponent(data.name)}`;
                } else if (data.type === 'SEMESTER' || data.type === 'FOLDER' || data.type === 'SUBJECT') {
                    path = `/folder/${data.id}`;
                } else {
                    // Default path for other types if needed
                    path = `/folder/${data.id}`;
                }

                ancestors.unshift({ id: data.id, name: data.name, path });
                
                parentId = data.parentId;

            } else {
                parentId = null; // Stop if a document is not found
            }
        } catch (error) {
            console.error("Error fetching ancestor:", error);
            break; // Stop on error
        }
    }
    
    ancestorCache.set(currentId, ancestors);
    return ancestors;
}


export function Breadcrumbs() {
    const pathname = usePathname();
    const { db } = useFirebase();
    const [crumbs, setCrumbs] = useState<Crumb[]>([]);
    const [loading, setLoading] = useState(true);

    const currentId = useMemo(() => {
        const parts = pathname.split('/');
        if ((parts[1] === 'folder' || parts[1] === 'level') && parts[2]) {
             if (parts[1] === 'level') {
                // For /level/[name], we can't get an ID directly, so we let the logic handle it.
                // Or find a way to resolve name to ID if needed, but for now, we focus on folder IDs.
                // This part might need adjustment if levels need to show ancestors.
                return null; 
            }
            return parts[2];
        }
        if (parts[1] === 'search') return 'search';
        return 'root';
    }, [pathname]);

    useEffect(() => {
        const generateCrumbs = async () => {
            if (!db) return;
            setLoading(true);
            
            const pathSegments = pathname.split('/').filter(Boolean);

            if (pathSegments.length === 0) {
                setCrumbs([]);
                setLoading(false);
                return;
            }

            let newCrumbs: Crumb[] = [];
            let currentPath = '';

            if (pathSegments[0] === 'folder') {
                const ancestors = await fetchAncestors(db, pathSegments[1]);
                setCrumbs(ancestors);
            } else if (pathSegments[0] === 'level') {
                const levelName = decodeURIComponent(pathSegments[1]);
                // This logic is simple as levels are top-tier.
                setCrumbs([{ id: levelName, name: levelName, path: pathname }]);
            } else if (pathSegments[0] === 'search') {
                 const query = new URLSearchParams(window.location.search).get('q');
                 setCrumbs([{ id: 'search', name: `Search: "${query}"`, path: pathname }]);
            }


            setLoading(false);
        };

        generateCrumbs();
    }, [pathname, db]);


    const homeElement = (
        <div className="flex items-center">
            <Link href="/" className="flex items-center gap-1 hover:text-white transition-colors">
                <HomeIcon size={14} />
                <span>Home</span>
            </Link>
        </div>
    );
    
    if (loading) {
         return (
             <nav className="flex items-center gap-2 text-sm text-slate-300 flex-wrap min-h-[20px]">
                {homeElement}
                <ChevronRight className="w-4 h-4 opacity-60" />
                <Skeleton className="h-5 w-24" />
                <ChevronRight className="w-4 h-4 opacity-60" />
                <Skeleton className="h-5 w-32" />
             </nav>
         )
    }

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
                            <Link href={crumb.path} className="hover:text-white transition-colors">
                                {crumb.name}
                            </Link>
                        )}
                     </Fragment>
                 )
            })}
        </nav>
    );
}
