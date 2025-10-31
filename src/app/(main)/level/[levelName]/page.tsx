
'use client';

import Link from 'next/link';
import { notFound, useRouter } from 'next/navigation';
import React, { useEffect, useMemo } from 'react';
import { Content } from '@/lib/contentService';
import { useCollection } from '@/firebase/firestore/use-collection';
import { prefetcher } from '@/lib/prefetchService';
import FileExplorerHeader from '@/components/FileExplorerHeader';
import { motion } from 'framer-motion';

export default function LevelPage({ params }: { params: { levelName: string } }) {
  const { levelName } = params;
  const router = useRouter();
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
    <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, transition: { duration: 0.1 } }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="flex flex-col flex-1 overflow-hidden"
    >
        <FileExplorerHeader />
        <div className="relative flex-1 overflow-y-auto mt-4 pr-2 -mr-2">
            {!loading && semesters && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                    {semesters.map((semester) => (
                        <div 
                          key={semester.id}
                          onMouseEnter={() => prefetcher.prefetchChildren(semester.id)}
                        >
                            <Link href={`/folder/${semester.id}`} className="block h-full">
                                <div className="glass-card p-8 group hover:bg-white/10 transition-colors cursor-pointer h-full flex items-center justify-center text-center rounded-[1.25rem]">
                                    <h3 className="text-xl font-semibold text-white">{semester.name}</h3>
                                </div>
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </motion.div>
  );
}
