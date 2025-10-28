'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X, Menu, Wand2, Shield, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useDebounce } from 'use-debounce';
import { Logo } from './logo';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuthStore } from '@/stores/auth-store';
import { AuthButton } from './auth-button';


export const Header = ({ onMenuClick }: { onMenuClick?: () => void }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [debouncedQuery] = useDebounce(query, 1000);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const { can } = useAuthStore();

  useEffect(() => {
    if (debouncedQuery) {
      router.push(`/search?q=${debouncedQuery}`);
    } 
    else if (!query && pathname === '/search') {
      router.push('/');
    }
  }, [debouncedQuery, query, router, pathname]);
  
  useEffect(() => {
    const currentQuery = searchParams.get('q');
    if (currentQuery !== query) {
        setQuery(currentQuery || '');
    }
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

      <div className="flex items-center justify-end flex-grow gap-2">
        <div className="relative w-full max-w-[180px] sm:max-w-sm">
          <Search
            className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 transition-all duration-300",
              (isSearchFocused || query) ? 'text-white' : 'text-slate-400',
              isSearchFocused && "transform rotate-90"
            )}
          />
          <Input
            placeholder="Search files..."
            className="pl-9 sm:pl-10 pr-10 bg-black/20 border-white/10 rounded-full h-9 sm:h-10"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
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
        
        <TooltipProvider>
            {can('canAccessQuestionCreator', null) && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 text-slate-300 hover:text-yellow-300" onClick={() => router.push('/questions-creator')}>
                            <Wand2 className="h-5 w-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={8} className="rounded-lg bg-black text-white">
                        <p>Questions Creator</p>
                    </TooltipContent>
                </Tooltip>
            )}
            {can('canAccessAdminPanel', null) && (
                 <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 text-slate-300 hover:text-teal-300" onClick={() => router.push('/admin')}>
                            <Shield className="h-5 w-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={8} className="rounded-lg bg-black text-white">
                        <p>Admin Panel</p>
                    </TooltipContent>
                </Tooltip>
            )}
        </TooltipProvider>
        <AuthButton />
      </div>
    </header>
  );
};
