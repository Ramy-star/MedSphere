'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Filter, GraduationCap, Search } from 'lucide-react';

export const Header = () => (
  <header className="bg-[#222b3c] p-3 border-b border-slate-700">
    <div className="flex items-center justify-between mx-auto px-4">
      <div className="flex items-center gap-3">
        <div className="bg-blue-500/10 text-blue-400 p-2 rounded-lg">
          <GraduationCap />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">
            Medical Study Organizer
          </h1>
          <p className="text-sm text-slate-400">
            Organize your medical education journey
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 w-full max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search files, subjects, or content..."
            className="pl-10 bg-slate-800/60 border-slate-700 rounded-full"
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
