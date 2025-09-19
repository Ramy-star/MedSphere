'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Filter, GraduationCap, PanelLeft, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { SidebarToggle } from './sidebar';

// This is a bit of a hack to pass the search handler from the page to the header.
// A more robust solution would use React Context or a state management library.
declare global {
  interface Window {
    __handleSearch?: (query: string) => void;
    __toggleSidebar?: () => void;
  }
}


export const Header = () => {
  const [query, setQuery] = useState('');

  const handleSearch = () => {
    if (window.__handleSearch) {
      window.__handleSearch(query);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <header className="bg-[#222b3c] p-3 border-b border-slate-700">
      <div className="flex items-center justify-between mx-auto px-4">
        <div className="flex items-center gap-3">
          <SidebarToggle />
          <div className="bg-blue-500/10 text-blue-400 p-2 rounded-lg">
            <GraduationCap />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">
              Medical Study Organizer
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-4 w-full max-w-md">
          <div className="relative w-full">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 cursor-pointer"
              onClick={handleSearch}
            />
            <Input
              placeholder="Search files, subjects, or content..."
              className="pl-10 bg-slate-800/60 border-slate-700 rounded-full"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <Button
            variant="outline"
            className="bg-slate-800/60 border-slate-700 hover:bg-slate-700/80 rounded-full"
          >
            <Filter className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};
