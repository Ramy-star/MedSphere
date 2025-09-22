
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, ChevronRight } from 'lucide-react';
import type { ContentItem } from '@/lib/contentService';

export function Breadcrumbs({ ancestors }: { ancestors?: ContentItem[] }) {
  const pathname = usePathname() || '/';
  // split path, remove empty parts, and decode them
  const segments = pathname.split('/').filter(Boolean);

  const homeElement = (
    <Link href="/" className="flex items-center gap-1 hover:text-white">
      <HomeIcon size={14}/> 
      <span>Home</span>
    </Link>
  );

  if (ancestors && ancestors.length > 0) {
    const homeAncestor = ancestors[0]?.id === 'root' ? ancestors[0] : null;
    const pathToShow = homeAncestor ? ancestors.slice(1) : ancestors;

    return (
       <nav className="flex items-center gap-2 text-sm text-slate-300">
        {homeElement}
        {pathToShow.length > 0 && <ChevronRight className="w-4 h-4 opacity-60" />}
        {pathToShow.map((node, idx) => {
          const isLast = idx === pathToShow.length - 1;
          return (
            <span key={node.id} className="flex items-center gap-2">
              <Link 
                href={`/folder/${node.id}`} 
                className={isLast ? "font-semibold text-white" : "hover:text-white"}
              >
                {node.name} 
              </Link>
              {!isLast && <ChevronRight className="w-4 h-4 opacity-60" />}
            </span>
          );
        })}
      </nav>
    )
  }

  if (segments.length === 0) {
    return (
        <nav className="flex items-center text-sm text-slate-300 mb-6 flex-wrap animate-fade-in">
            <div className="flex items-center gap-2 text-white font-semibold">
                <HomeIcon className="w-4 h-4" />
                <span>Home</span>
            </div>
        </nav>
    );
  }

  return (
    <nav className="flex items-center gap-2 text-sm text-slate-300">
      {homeElement}
      {segments.map((seg, i) => {
        const href = '/' + segments.slice(0, i + 1).join('/');
        const isLast = i === segments.length - 1;
        return (
          <span key={href} className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 opacity-60" />
            <Link 
              href={href} 
              className={isLast ? "font-semibold text-white" : "hover:text-white"}
            >
              {decodeURIComponent(seg)} 
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
