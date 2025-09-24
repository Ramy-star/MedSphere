'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useDebounce } from 'use-debounce';
import Link from 'next/link';
import { Logo } from './logo';


export const Header = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [debouncedQuery] = useDebounce(query, 300);

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
    <header className="w-full border-b border-white/10 bg-white/5 backdrop-blur-sm shadow-sm px-10 py-3">
      <div className="flex items-center justify-between mx-auto">
        <Link href="/" className="flex items-center gap-3">
          <Logo className="h-10 w-auto" />
        </Link>
        <div className="flex items-center gap-4 w-full max-w-md">
          <div className="relative w-full">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
            />
            <Input
              placeholder="Search files, subjects, or content..."
              className="pl-10 pr-10 bg-slate-800/60 border-slate-700 rounded-full"
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
