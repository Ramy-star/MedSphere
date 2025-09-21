'use client';

import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { HomeIcon, ChevronRight, Plus, Folder } from 'lucide-react';
import { useState, useMemo } from 'react';
import { notFound } from 'next/navigation';
import { subjectsData } from '@/lib/file-data';
import { SubjectCard } from '@/components/subject-card';

type SemesterPageProps = {
  params: {
    semesterPath: string[];
  };
};

const Breadcrumbs = ({ level, semester }: { level: string; semester: string }) => (
  <nav className="flex items-center text-sm text-slate-300 mb-6 flex-wrap">
    <a href="/" className="flex items-center gap-2 hover:text-white">
      <HomeIcon className="w-4 h-4" />
      <span>Home</span>
    </a>
    <ChevronRight className="w-4 h-4 mx-1" />
    <span className="text-slate-400">{level}</span>
    <ChevronRight className="w-4 h-4 mx-1" />
    <span className="font-semibold text-white">{semester}</span>
  </nav>
);

export default function SemesterPage({ params }: SemesterPageProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { semesterPath } = params;
  const [levelName, semesterName] = semesterPath.map(decodeURIComponent);

  const subjects = useMemo(() => {
    // In a real app, you'd fetch subjects for the specific semester.
    // For this demo, we'll show a subset of subjects based on semester number.
    const semesterNum = parseInt(semesterName.split(' ')[1]);
    if (isNaN(semesterNum)) return [];
    
    // Simple logic to vary subjects by semester
    const startIndex = (semesterNum - 1) % 4;
    const numSubjects = 4; // Show 4 subjects per semester
    return Array.from({ length: numSubjects }).map((_, i) => {
        const index = (startIndex + i * 2) % subjectsData.length;
        return subjectsData[index];
    });

  }, [semesterName]);


  if (!levelName || !semesterName) {
    notFound();
  }

  return (
    <div className="flex flex-1 w-full p-4 gap-4">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-6 glass-card">
          <Breadcrumbs level={levelName} semester={semesterName} />
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-white">Subjects</h1>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Subject
            </Button>
          </div>
          {subjects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {subjects.map((subject) => (
                <SubjectCard
                  key={subject.name}
                  name={subject.name}
                  icon={subject.icon}
                  color={subject.color}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 border-2 border-dashed border-slate-700 rounded-xl">
              <Folder className="mx-auto h-12 w-12 text-slate-500" />
              <h3 className="mt-4 text-lg font-semibold text-white">No subjects yet</h3>
              <p className="mt-2 text-sm text-slate-400">Get started by adding a new subject.</p>
              <Button className="mt-6">
                <Plus className="mr-2 h-4 w-4" />
                Add Subject
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
