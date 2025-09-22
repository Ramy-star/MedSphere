
'use client';

import { StatCard, RecentFileCard } from '@/components/dashboard';
import { recentFiles, folderData, allSubjects } from '@/lib/file-data';
import { Book, File as FileIcon, Folder, Users } from 'lucide-react';
import Link from 'next/link';

const levels = [
  { name: 'Level 1', semesters: ['Semester 1', 'Semester 2'] },
  { name: 'Level 2', semesters: ['Semester 3', 'Semester 4'] },
  { name: 'Level 3', semesters: ['Semester 5', 'Semester 6'] },
  { name: 'Level 4', semesters: ['Semester 7', 'Semester 8'] },
  { name: 'Level 5', semesters: ['Semester 9', 'Semester 10'] },
];

export default function HomePage() {

  const totalFiles = folderData.reduce((acc, folder) => acc + folder.files.length, 0);

  const stats = [
    { title: 'Total Subjects', value: allSubjects.length.toString(), icon: Book, color: 'text-purple-400' },
    { title: 'Total Files', value: totalFiles.toString(), icon: FileIcon, color: 'text-blue-400' },
    { title: 'Folders', value: folderData.length.toString(), icon: Folder, color: 'text-yellow-400' },
    { title: 'Case Studies', value: folderData.find(f => f.name === 'Case Studies')?.files.length.toString() ?? '0', icon: Users, color: 'text-green-400' },
  ];

  return (
    <main className="flex-1 p-6 space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
            <div key={stat.title} className="animate-fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
                <StatCard {...stat} />
            </div>
            ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
                    <h2 className="text-xl font-bold text-white mb-4">Your Study Levels</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {levels.map((level, index) => (
                            <div key={level.name} className="animate-fade-in" style={{ animationDelay: `${index * 0.05 + 0.25}s` }}>
                                <Link href={`/semester/${encodeURIComponent(level.name)}/${encodeURIComponent(level.semesters[0])}`}>
                                <div className="glass-card p-5 group hover:bg-white/10 transition-colors cursor-pointer h-full">
                                    <h3 className="text-lg font-semibold text-white">{level.name}</h3>
                                    <p className="text-sm text-slate-400">{level.semesters.join(' & ')}</p>
                                </div>
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
                    <h2 className="text-xl font-bold text-white mb-4">Quick Access</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {folderData.slice(0, 4).map((folder, index) => (
                        <div key={folder.name} className="animate-fade-in" style={{ animationDelay: `${index * 0.05 + 0.35}s` }}>
                            <div className="glass-card p-4 group hover:bg-white/10 transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg bg-slate-800 w-fit`}>
                                <folder.icon className={`w-6 h-6 ${folder.color}`} />
                                </div>
                                <div>
                                <h3 className="font-semibold text-white">{folder.name}</h3>
                                <p className="text-xs text-slate-400">{folder.files.length} files</p>
                                </div>
                            </div>
                            </div>
                        </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                <h2 className="text-xl font-bold text-white">Recent Files</h2>
                <div className="space-y-3">
                {recentFiles.map((file, index) => (
                    <div key={index} className="animate-fade-in" style={{ animationDelay: `${index * 0.05 + 0.45}s` }}>
                    <RecentFileCard {...file} />
                    </div>
                ))}
                </div>
            </div>
        </div>
    </main>
  );
}
