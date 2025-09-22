

'use client';

import { Folder } from 'lucide-react';
import React, { use, useMemo } from 'react';
import { notFound } from 'next/navigation';
import { subjectsBySemester } from '@/lib/file-data';
import { SubjectCard } from '@/components/subject-card';
import FileExplorerHeader from '@/components/FileExplorerHeader';

type SemesterPageProps = {
  params: {
    semesterPath: string[];
  };
};

export default function SemesterPage({ params }: SemesterPageProps) {
  const resolvedParams = use(params);
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
        <FileExplorerHeader />
        <div className="flex items-center justify-between mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h1 className="text-2xl font-bold text-white">Subjects</h1>
        </div>
        {subjects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {subjects.map((subject, index) => (
            <div key={subject.name} className="animate-fade-in" style={{ animationDelay: `${index * 0.05 + 0.15}s`}}>
                <SubjectCard
                    name={subject.name}
                    iconName={subject.iconName}
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
        </div>
        )}
    </main>
  );
}
