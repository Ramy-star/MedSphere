'use client';

import { Button } from '@/components/ui/button';
import { Download, Star } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type FileListItemProps = {
  name: string;
  size: string;
  date: string;
  icon: LucideIcon;
};

export const FileListItem = ({ name, size, date, icon: Icon }: FileListItemProps) => (
  <div className="glass-card p-4 flex items-center justify-between transition-all hover:bg-white/10 cursor-pointer">
    <div className="flex items-center gap-4">
      <div className="p-3 rounded-lg bg-slate-800 text-purple-400">
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
        <p className="font-semibold text-white">{name}</p>
        <div className="flex items-center gap-4 text-sm text-slate-400">
          <span>{size}</span>
          <span className="hidden sm:inline">|</span>
          <span>{date}</span>
        </div>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-700">
        <Download className="w-5 h-5" />
      </Button>
      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-700">
        <Star className="w-5 h-5" />
      </Button>
    </div>
  </div>
);
