
'use client';

import FileExplorerHeader from '@/components/FileExplorerHeader';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { use, useEffect, useState } from 'react';
import { contentService, Content } from '@/lib/contentService';
import { Skeleton } from '@/components/ui/skeleton';
import { Layers } from 'lucide-react';


export default function LevelPage({ params }: { params: { levelName: string } }) {
  const resolvedParams = use(params);
  const levelName = decodeURIComponent(resolvedParams.levelName);

  const [level, setLevel] = useState<Content | null>(null);
  const [semesters, setSemesters] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLevelData() {
        setLoading(true);
        const allLevels = await contentService.getChildren(null);
        const currentLevel = allLevels.find(l => l.name === levelName && l.type === 'LEVEL');
        
        if (currentLevel) {
            setLevel(currentLevel);
            const levelSemesters = await contentService.getChildren(currentLevel.id);
            setSemesters(levelSemesters.filter(s => s.type === 'SEMESTER'));
        } else {
            notFound();
        }
        setLoading(false);
    }
    fetchLevelData();
  }, [levelName]);


  if (loading) {
    return (
        <main className="flex-1 p-6 glass-card animate-fade-in">
            <FileExplorerHeader />
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="h-8 w-48" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
            </div>
        </main>
    );
  }

  if (!level) {
    notFound();
  }
  
  const extendedLevel = {
      ...level,
      icon: Layers,
      iconColor: 'text-blue-400'
  }

  return (
    <main className="flex-1 p-6 glass-card animate-fade-in">
        <FileExplorerHeader currentFolder={extendedLevel} ancestors={[]} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
            {semesters.map((semester, index) => (
                <div key={semester.id} className="animate-fade-in" style={{ animationDelay: `${index * 0.05 + 0.15}s` }}>
                     <Link href={`/folder/${semester.id}`}>
                        <div className="glass-card p-8 group hover:bg-white/10 transition-colors cursor-pointer h-full flex items-center justify-center text-center">
                            <h3 className="text-xl font-semibold text-white">{semester.name}</h3>
                        </div>
                    </Link>
                </div>
            ))}
        </div>
    </main>
  );
}
