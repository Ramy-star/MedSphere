'use client';

import { Sidebar } from '@/components/sidebar';
import { HomeIcon, ChevronRight, Folder as FolderIcon, Plus } from 'lucide-react';
import { useState, useMemo } from 'react';
import { notFound } from 'next/navigation';
import { allSubjects, File, subjectsBySemester } from '@/lib/file-data';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

type SubjectPageProps = {
  params: {
    subjectPath: string[];
  };
};

const Breadcrumbs = ({ level, semester, subject }: { level: string; semester: string, subject: string }) => (
  <nav className="flex items-center text-sm text-slate-300 mb-6 flex-wrap">
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { subjectPath } = params;
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
    <div className="flex flex-1 w-full p-4 gap-4">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-6 glass-card">
          <Breadcrumbs level={levelName} semester={semesterName} subject={name} />
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-lg bg-slate-800 w-fit`}>
                <SubjectIcon className={`w-7 h-7 ${color}`} />
              </div>
              <h1 className="text-2xl font-bold text-white">{name}</h1>
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Content
            </Button>
          </div>

          {content.length > 0 ? (
            <div className="space-y-3">
              {/* TODO: Render files and folders here */}
            </div>
          ) : (
            <div className="text-center py-16 border-2 border-dashed border-slate-700 rounded-xl">
              <FolderIcon className="mx-auto h-12 w-12 text-slate-500" />
              <h3 className="mt-4 text-lg font-semibold text-white">This subject is empty</h3>
              <p className="mt-2 text-sm text-slate-400">Get started by adding folders or files.</p>
              <Button className="mt-6">
                <Plus className="mr-2 h-4 w-4" />
                Add Content
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
