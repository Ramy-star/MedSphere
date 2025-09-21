'use client';

import { LucideIcon, MoreVertical } from 'lucide-react';
import { Button } from './ui/button';
import Link from 'next/link';

type SubjectCardProps = {
  name: string;
  icon: LucideIcon;
  color: string;
  level: string;
  semester: string;
};

export function SubjectCard({ name, icon: Icon, color, level, semester }: SubjectCardProps) {
  const subjectPath = `/subject/${encodeURIComponent(level)}/${encodeURIComponent(semester)}/${encodeURIComponent(name)}`;
  return (
    <Link href={subjectPath} className="block glass-card p-4 rounded-xl group hover:bg-white/10 transition-colors">
      <div className="flex justify-between items-start">
        <div className={`p-3 rounded-lg bg-slate-800 w-fit mb-4`}>
          <Icon className={`w-7 h-7 ${color}`} />
        </div>
        <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-400 hover:text-white hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreVertical className="w-5 h-5" />
        </Button>
      </div>
      <h3 className="text-lg font-semibold text-white">{name}</h3>
    </Link>
  );
}
