
'use client';

import { HomeIcon, ChevronRight, Folder as FolderIcon, Plus } from 'lucide-react';
import React, { useMemo } from 'react';
import { notFound } from 'next/navigation';
import { allSubjects, File } from '@/lib/file-data';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AddContentMenu } from '@/components/add-content-menu';

type SubjectPageProps = {
  params: {
    subjectPath: string[];
  };
};

const Breadcrumbs = ({ level, semester, subject }: { level: string; semester: string, subject: string }) => (
  <nav className="flex items-center text-sm text-slate-300 mb-6 flex-wrap animate-fade-in">
    <Link href="/" className="flex items-center gap-2 hover:text-white">
      <HomeIcon className="w-4 h-4" />
      <span>Home</span>
    </Link>
    <ChevronRight className="w-4 h-4 mx-1" />
    <span className="text-slate-400">{level}</span>
    <ChevronRight className="w-4 h-4 mx-1" />
    <Link href={`/semester/${encodeURIComponent(level)}/${encodeURIComponent(semester)}`} className="hover:text-white">
        {semester}
    </Link>
    <ChevronRight className="w-4 h-4 mx-1" />
    <span className="font-semibold text-white">{subject}</span>
  </nav>
);

export default function SubjectPage({ params }: SubjectPageProps) {
  const resolvedParams = React.use(params);
  const { subjectPath } = resolvedParams;
  const [levelName, semesterName, subjectName] = subjectPath.map(decodeURIComponent);

  const subject = useMemo(() => {
    return allSubjects.find(s => s.name === subjectName && s.level === levelName && s.semester === semesterName);
  }, [subjectName, levelName, semesterName]);

  if (!subject) {
    notFound();
  }
  
  // For now, content is empty. This will be populated later.
  const content: (File | {name: string, type: 'folder'})[] = [];

  const { icon: SubjectIcon, color, name } = subject;

  return (
    <main className="flex-1 p-6 glass-card animate-fade-in">
        <Breadcrumbs level={levelName} semester={semesterName} subject={name} />
        <div className="flex items-center justify-between mb-6" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg bg-slate-800 w-fit`}>
            <SubjectIcon className={`w-7 h-7 ${color}`} />
            </div>
            <h1 className="text-2xl font-bold text-white">{name}</h1>
        </div>
        <AddContentMenu />
        </div>

        {content.length > 0 ? (
        <div className="space-y-3" style={{ animationDelay: '0.15s' }}>
            {/* TODO: Render files and folders here */}
        </div>
        ) : (
        <div className="text-center py-16 border-2 border-dashed border-slate-700 rounded-xl" style={{ animationDelay: '0.15s' }}>
            <FolderIcon className="mx-auto h-12 w-12 text-slate-500" />
            <h3 className="mt-4 text-lg font-semibold text-white">This subject is empty</h3>
            <p className="mt-2 text-sm text-slate-400">Get started by adding folders or files.</p>
            <div className="mt-6">
              <AddContentMenu />
            </div>
        </div>
        )}
    </main>
  );
}
