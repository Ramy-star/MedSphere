
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, ChevronRight } from 'lucide-react';
import type { ContentItem } from '@/lib/contentService';

export function Breadcrumbs({ ancestors }: { ancestors?: ContentItem[] }) {
  const pathname = usePathname() || '/';

  const homeElement = (
    <div className="flex items-center">
      <Link href="/" className="flex items-center gap-1 hover:text-white">
        <HomeIcon size={14}/> 
        <span>Home</span>
      </Link>
    </div>
  );

  // If ancestors are provided (from folder pages), use them to build the path
  if (ancestors && ancestors.length > 0) {
     const homeAncestor = ancestors[0]?.id === 'root' ? ancestors[0] : null;
     const pathToShow = homeAncestor ? ancestors.slice(1) : ancestors;

    return (
       <nav className="flex items-center gap-2 text-sm text-slate-300 flex-wrap">
        {homeElement}
        {pathToShow.length > 0 && <ChevronRight className="w-4 h-4 opacity-60" />}
        {pathToShow.map((node, idx) => {
          const isLast = idx === pathToShow.length - 1;
          return (
            <span key={node.id} className="flex items-center gap-2">
              {isLast ? (
                 <span className="font-semibold text-white">{node.name}</span>
              ) : (
                <Link 
                  href={`/folder/${node.id}`} 
                  className="hover:text-white"
                >
                  {node.name} 
                </Link>
              )}
              {!isLast && <ChevronRight className="w-4 h-4 opacity-60" />}
            </span>
          );
        })}
      </nav>
    )
  }

  // Fallback for pages without ancestor data, build from URL
  const segments = pathname.split('/').filter(Boolean);
  const segmentsToFilter = ['level', 'semester', 'subject', 'folder'];
  
  const breadcrumbItems = segments
    .map((segment, index) => {
        const decodedSegment = decodeURIComponent(segment);
        const isFilterable = segmentsToFilter.includes(decodedSegment.toLowerCase());
        
        if (isFilterable) return null;

        const href = '/' + segments.slice(0, index + 1).join('/');
        
        return {
            name: decodedSegment,
            href: href,
        };
    })
    .filter((item): item is { name: string; href: string } => item !== null);


  // If there are no valid segments to show besides 'Home', just show Home.
  if (breadcrumbItems.length === 0 && pathname === '/') {
    return (
        <nav className="flex items-center text-sm mb-6 flex-wrap animate-fade-in">
             <div className="flex items-center gap-2 font-semibold text-white">
                <HomeIcon className="w-4 h-4" />
                <span>Home</span>
            </div>
        </nav>
    );
  }


  return (
    <nav className="flex items-center gap-2 text-sm text-slate-300 flex-wrap">
      {homeElement}
      {breadcrumbItems.map((item, i) => {
        const isLast = i === breadcrumbItems.length - 1;
        return (
          <span key={item.href} className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 opacity-60" />
            {isLast ? (
              <span className="font-semibold text-white">{item.name}</span>
            ) : (
              <Link href={item.href} className="hover:text-white">
                {item.name}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
