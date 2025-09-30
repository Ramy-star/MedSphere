
'use client';

import FileExplorerHeader from '@/components/FileExplorerHeader';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useEffect, useMemo, Suspense, use } from 'react';
import { Content } from '@/lib/contentService';
import { Skeleton } from '@/components/ui/skeleton';
import { Layers } from 'lucide-react';
import { useCollection } from '@/firebase/firestore/use-collection';

function LevelPageContent({ levelName }: { levelName: string }) {
  // Firestore queries are case-sensitive. Decoding should be sufficient.
  const decodedLevelName = decodeURIComponent(levelName);
  
  const { data: levels, loading: loadingLevels } = useCollection<Content>('content', {
    where: ['name', '==', decodedLevelName],
    limit: 1,
  });
  
  const level = useMemo(() => levels?.[0], [levels]);

  const { data: semesters, loading: loadingSemesters } = useCollection<Content>('content', {
    where: ['parentId', '==', level?.id],
    orderBy: ['order', 'asc'],
    disabled: !level, // Disable query until level is found
  });

  const loading = loadingLevels || (!!level && loadingSemesters);

  useEffect(() => {
    // If after loading levels, no level is found, show 404.
    if (!loadingLevels && !level) {
      notFound();
    }
  }, [loadingLevels, level]);

  if (loading || !level) {
    return (
        <main className="flex-1 p-4 md:p-6 glass-card animate-fade-in">
            <FileExplorerHeader />
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="h-8 w-48" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
            </div>
        </main>
    );
  }
  
  const extendedLevel = {
      ...level,
      icon: Layers,
      iconColor: 'text-blue-400'
  }

  return (
    <main className="flex-1 p-4 md:p-6 glass-card animate-fade-in">
        <FileExplorerHeader currentFolder={extendedLevel} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mt-6">
            {semesters && semesters.map((semester, index) => (
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

function LevelPage({ params }: { params: Promise<{ levelName: string }> }) {
  const { levelName } = use(params);
  
  return (
    <Suspense fallback={
        <main className="flex-1 p-4 md:p-6 glass-card animate-fade-in">
            <FileExplorerHeader />
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="h-8 w-48" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
            </div>
        </main>
    }>
      <LevelPageContent levelName={levelName} />
    </Suspense>
  )
}

export default LevelPage;
