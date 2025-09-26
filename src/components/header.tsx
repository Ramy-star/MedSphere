
'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useDebounce } from 'use-debounce';
import Link from 'next/link';
import { Logo } from './logo';
import { useIsMobile } from '@/hooks/use-mobile';


export const Header = ({ onMenuClick }: { onMenuClick?: () => void }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [debouncedQuery] = useDebounce(query, 300);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (debouncedQuery) {
      router.push(`/search?q=${debouncedQuery}`);
    } else {
        // If the debounced query is empty and we are on the search page, navigate to home
        if (pathname === '/search') {
            router.push('/');
        }
    }
  }, [debouncedQuery, router, pathname]);
  
  useEffect(() => {
    // Sync query state with URL search params
    setQuery(searchParams.get('q') || '');
  }, [searchParams]);

  const handleClearSearch = () => {
      setQuery('');
  }

  return (
    <header className="w-full border-b border-white/10 bg-white/5 backdrop-blur-sm shadow-sm px-4 sm:px-6 py-3 min-h-[68px] flex items-center">
      <div className="flex items-center justify-between mx-auto gap-4 w-full">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 cursor-default select-none">
              <Logo className="h-8 sm:h-10 w-auto shrink-0" />
              <h1 className="text-lg sm:text-xl font-['Nunito_Sans',_sans-serif] relative" style={{ top: '1px' }}>
                <span className="font-bold" style={{ color: '#FFFFFF' }}>Med</span>
                <span className="font-normal" style={{ color: '#00D309' }}>Sphere</span>
              </h1>
          </div>
        </div>
        <div className="flex items-center gap-4 w-full max-w-xs sm:max-w-md">
          <div className="relative w-full">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400"
            />
            <Input
              placeholder="Search files, subjects..."
              className="pl-9 sm:pl-10 pr-10 bg-black/10 border-white/10 rounded-full h-9 sm:h-10"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
                <Button 
                    variant="ghost" 
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full text-slate-400 hover:text-white"
                    onClick={handleClearSearch}
                >
                    <X className="w-5 h-5" />
                </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
