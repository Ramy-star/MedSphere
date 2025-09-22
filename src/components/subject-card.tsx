
'use client';

import { LucideIcon, Folder } from 'lucide-react';
import Link from 'next/link';
import { allSubjectIcons } from '@/lib/file-data';
import type { Content } from '@/lib/contentService';


export function SubjectCard({ subject }: { subject: Content }) {
  const { id, name, iconName, color } = subject;
  const subjectPath = `/folder/${id}`;
  const Icon = (iconName && allSubjectIcons[iconName]) || Folder;

  return (
    <Link href={subjectPath} className="block glass-card p-4 rounded-xl group hover:bg-white/10 transition-colors">
      <div className="flex justify-between items-start">
        <div className={`p-3 rounded-lg bg-slate-800 w-fit mb-4`}>
          <Icon className={`w-7 h-7 ${color}`} />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-white">{name}</h3>
    </Link>
  );
}
