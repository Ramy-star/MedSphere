
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, ChevronRight } from 'lucide-react';

export function Breadcrumbs() {
  const pathname = usePathname() || '/';
  // split path, remove empty parts, and decode them
  const segments = pathname.split('/').filter(Boolean);

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
      <Link href="/" className="flex items-center gap-1 hover:text-white">
        <HomeIcon size={14}/> 
        <span>Home</span>
      </Link>
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
