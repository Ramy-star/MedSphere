
'use client';

import FileExplorerHeader from '@/components/FileExplorerHeader';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const levels: { [key: string]: string[] } = {
  'Level 1': ['Semester 1', 'Semester 2'],
  'Level 2': ['Semester 3', 'Semester 4'],
  'Level 3': ['Semester 5', 'Semester 6'],
  'Level 4': ['Semester 7', 'Semester 8'],
  'Level 5': ['Semester 9', 'Semester 10'],
};

export default function LevelPage({ params }: { params: { levelName: string } }) {
  const levelName = decodeURIComponent(params.levelName);
  const semesters = levels[levelName];

  if (!semesters) {
    notFound();
  }

  return (
    <main className="flex-1 p-6 glass-card animate-fade-in">
        <FileExplorerHeader />
        <div className="flex items-center justify-between mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h1 className="text-2xl font-bold text-white">{levelName}</h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {semesters.map((semester, index) => (
                <div key={semester} className="animate-fade-in" style={{ animationDelay: `${index * 0.05 + 0.15}s` }}>
                     <Link href={`/semester/${encodeURIComponent(levelName)}/${encodeURIComponent(semester)}`}>
                        <div className="glass-card p-8 group hover:bg-white/10 transition-colors cursor-pointer h-full flex items-center justify-center text-center">
                            <h3 className="text-xl font-semibold text-white">{semester}</h3>
                        </div>
                    </Link>
                </div>
            ))}
        </div>
    </main>
  );
}
