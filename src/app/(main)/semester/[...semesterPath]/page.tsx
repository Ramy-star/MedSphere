
'use client';

import { Button } from '@/components/ui/button';
import { HomeIcon, ChevronRight, Plus, Folder } from 'lucide-react';
import React, { useMemo } from 'react';
import { notFound } from 'next/navigation';
import { subjectsBySemester } from '@/lib/file-data';
import { SubjectCard } from '@/components/subject-card';

type SemesterPageProps = {
  params: {
    semesterPath: string[];
  };
};

const Breadcrumbs = ({ level, semester }: { level: string; semester: string }) => (
  <nav className="flex items-center text-sm text-slate-300 mb-6 flex-wrap animate-fade-in">
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
  const resolvedParams = React.use(params);
  const { semesterPath } = resolvedParams;
  const [levelName, semesterName] = semesterPath.map(decodeURIComponent);

  const subjects = useMemo(() => {
    return subjectsBySemester[semesterName] || [];
  }, [semesterName]);


  if (!levelName || !semesterName) {
    notFound();
  }

  return (
    <main className="flex-1 p-6 glass-card">
        <Breadcrumbs level={levelName} semester={semesterName} />
        <div className="flex items-center justify-between mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <h1 className="text-2xl font-bold text-white">Subjects</h1>
        <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Subject
        </Button>
        </div>
        {subjects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: '0.15s' }}>
            {subjects.map((subject, index) => (
            <div key={subject.name} className="animate-fade-in" style={{ animationDelay: `${index * 0.05}s`}}>
                <SubjectCard
                    name={subject.name}
                    icon={subject.icon}
                    color={subject.color}
                    level={subject.level}
                    semester={subject.semester}
                />
            </div>
            ))}
        </div>
        ) : (
        <div className="text-center py-16 border-2 border-dashed border-slate-700 rounded-xl animate-fade-in" style={{ animationDelay: '0.15s' }}>
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
  );
}
