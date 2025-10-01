'use client';

import FileExplorerHeader from '@/components/FileExplorerHeader';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useEffect, useMemo, use } from 'react';
import { Content } from '@/lib/contentService';
import { useCollection } from '@/firebase/firestore/use-collection';
import { motion } from 'framer-motion';

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

  return (
    <motion.main 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex-1 p-4 md:p-6 glass-card"
    >
        <FileExplorerHeader />
        
        {!loading && semesters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mt-6">
                {semesters.map((semester) => (
                    <div key={semester.id}>
                        <Link href={`/folder/${semester.id}`}>
                            <div className="glass-card p-8 group hover:bg-white/10 transition-colors cursor-pointer h-full flex items-center justify-center text-center">
                                <h3 className="text-xl font-semibold text-white">{semester.name}</h3>
                            </div>
                        </Link>
                    </div>
                ))}
            </div>
        )}
    </motion.main>
  );
}

function LevelPage({ params }: { params: Promise<{ levelName: string }> }) {
  const { levelName } = use(params);
  
  return <LevelPageContent levelName={levelName} />;
}

export default LevelPage;
