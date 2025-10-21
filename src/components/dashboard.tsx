
'use client';
import { Button } from '@/components/ui/button';
import { Download, Star, File as FileIcon, Folder, Users, Book, FileText, TestTube2, Clock, Presentation } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

export const StatCard = ({
  icon: Icon,
  title,
  value,
  color,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  color: string;
}) => (
  <div className="glass-card p-5 flex-1">
    <div className={`p-3 rounded-lg bg-slate-800 w-fit mb-4`}>
      <Icon className={`w-6 h-6 ${color}`} />
    </div>
    <p className="text-sm text-slate-400 mb-1">{title}</p>
    <p className="text-3xl font-bold text-white">{value}</p>
  </div>
);

type RecentFileCardProps = {
  name: string;
  size: string;
  date: string;
};

const getIconForFile = (fileName: string): LucideIcon => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'pptx':
            return Presentation;
        case 'docx':
            return FileText;
        case 'pdf':
            return Book;
        default:
            return FileIcon;
    }
}

export const RecentFileCard = ({ name, size, date }: RecentFileCardProps) => {
    const Icon = getIconForFile(name);

    return (
    <div className="glass-card p-3 flex items-center justify-between transition-all hover:bg-white/10 cursor-pointer">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-slate-800 text-slate-300">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="font-semibold text-white text-sm">{name}</p>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>{size}</span>
            <span>&bull;</span>
            <span>{date}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-700 w-8 h-8">
          <Download className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-700 w-8 h-8">
          <Star className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
