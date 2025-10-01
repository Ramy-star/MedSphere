
'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useDebounce } from 'use-debounce';
import { Logo } from './logo';
import { AuthButton } from './auth-button';


export const Header = ({ onMenuClick }: { onMenuClick?: () => void }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [debouncedQuery] = useDebounce(query, 1000);

  useEffect(() => {
    // Navigate to search results if there is a debounced query
    if (debouncedQuery) {
      router.push(`/search?q=${debouncedQuery}`);
    } 
    // If the debounced query becomes empty AND we are on the search page, navigate home
    else if (!query && pathname === '/search') {
      router.push('/');
    }
  }, [debouncedQuery, query, router, pathname]);
  
  useEffect(() => {
    // Sync query state with URL search params when they change (e.g., browser back/forward)
    const currentQuery = searchParams.get('q');
    if (currentQuery !== query) {
        setQuery(currentQuery || '');
    }
    // We only want this to run when searchParams change, not when the local query state changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleClearSearch = () => {
      setQuery('');
  }

  return (
    <header className="w-full border-b border-white/10 bg-white/5 backdrop-blur-sm shadow-sm px-4 sm:px-6 py-3 min-h-[68px] flex items-center gap-4">
      <div className="flex items-center gap-2 cursor-default select-none">
          <Logo className="h-8 sm:h-10 w-auto shrink-0" />
          <h1 className="text-lg sm:text-xl font-['Nunito_Sans',_sans-serif] relative" style={{ top: '1px' }}>
            <span className="font-bold" style={{ color: '#FFFFFF' }}>Med</span>
            <span className="font-normal" style={{ color: '#00D309' }}>Sphere</span>
          </h1>
      </div>
      <div className="flex items-center justify-end flex-grow gap-4">
        <div className="relative w-full max-w-[180px] sm:max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400"
          />
          <Input
            placeholder="Search files..."
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
        <AuthButton />
      </div>
    </header>
  );
};
