'use client';

import { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { allSubjectIcons } from '@/lib/file-data';
import type { Content } from '@/lib/contentService';
import { Folder } from 'lucide-react';
import React from 'react';


export const SubjectCard = React.memo(function SubjectCard({ subject }: { subject: Content }) {
  const { id, name, iconName, color } = subject;
  const subjectPath = `/folder/${id}`;
  const Icon = (iconName && allSubjectIcons[iconName]) || Folder;

  return (
    <Link href={subjectPath} className="block glass-card p-4 rounded-[1.25rem] group hover:bg-white/10 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <Icon className={`w-8 h-8 ${color}`} />
      </div>
      <h3 className="text-lg font-semibold text-white">{name}</h3>
    </Link>
  );
});
