
'use client';

import Link from 'next/link';

const levels = [
  { name: 'Level 1', semesters: ['Semester 1', 'Semester 2'] },
  { name: 'Level 2', semesters: ['Semester 3', 'Semester 4'] },
  { name: 'Level 3', semesters: ['Semester 5', 'Semester 6'] },
  { name: 'Level 4', semesters: ['Semester 7', 'Semester 8'] },
  { name: 'Level 5', semesters: ['Semester 9', 'Semester 10'] },
];

export default function HomePage() {

  return (
    <main className="flex-1 p-6 space-y-12 animate-fade-in flex flex-col items-center justify-center">
        <div className="w-full max-w-4xl">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Your Study Levels</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                {levels.map((level, index) => (
                    <div key={level.name} className="animate-fade-in" style={{ animationDelay: `${index * 0.05 + 0.25}s` }}>
                        <Link href={`/level/${encodeURIComponent(level.name)}`}>
                        <div className="glass-card p-6 group hover:bg-white/10 transition-colors cursor-pointer h-full flex items-center justify-center text-center">
                            <h3 className="text-xl font-semibold text-white">{level.name}</h3>
                        </div>
                        </Link>
                    </div>
                ))}
            </div>
        </div>
        <blockquote className="animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <p className="text-center text-slate-400 italic max-w-2xl">
                "The good doctor treats the disease; the great doctor treats the patient who has the disease."
            </p>
        </blockquote>
    </main>
  );
}
