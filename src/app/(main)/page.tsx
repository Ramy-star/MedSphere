
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Content, contentService } from '@/lib/contentService';
import { useCollection } from '@/firebase/firestore/use-collection';
import { Button } from '@/components/ui/button';
import { useFirebase } from '@/firebase/provider';
import { cn } from '@/lib/utils';
import React from 'react';
import { prefetcher } from '@/lib/prefetchService';
import { useAuthStore } from '@/stores/auth-store';
import { FolderCard } from '@/components/FolderCard';


// This forces the page to be dynamically rendered.
export const dynamic = 'force-dynamic';

export default function HomePage() {
  const { db } = useFirebase();
  const [isSeeding, setIsSeeding] = useState(false);
  const router = useRouter();
  const { can } = useAuthStore();
  const { data: allItems, loading } = useCollection<Content>('content', {
      where: ['parentId', '==', null],
      orderBy: ['order', 'asc']
  });

  const levels = useMemo(() => {
    if (!allItems) return [];
    return allItems.filter(item => item.metadata?.isHidden ? can('canAccessAdminPanel', null) : true);
  }, [allItems, can]);

  const handleSeed = useCallback(async () => {
    setIsSeeding(true);
    try {
      await contentService.seedInitialData();
      // Data will refetch automatically via useCollection
    } catch (error) {
      console.error("Seeding failed:", error);
    } finally {
        setIsSeeding(false);
    }
  }, []);

  useEffect(() => {
    // This effect runs once when the component mounts and the initial data check is done.
    if (!loading && db && (!levels || levels.length === 0)) {
        handleSeed();
    }
    // We only want this to run based on the initial loading and data state.
  }, [loading, db, levels, handleSeed]);

  
  const handleItemClick = (item: Content) => {
    const path = item.type === 'LEVEL' ? `/level/${encodeURIComponent(item.name)}` : `/folder/${item.id}`;
    router.push(path);
  };

  const renderContent = () => {
      if (loading || (!levels && !isSeeding)) {
           return (
                <div className="text-center min-h-[16rem] md:min-h-0 flex flex-col justify-center items-center">
                   {/* Loading state, can add a spinner later */}
                </div>
            );
      }
      
      if (!loading && (!levels || levels.length === 0)) {
           return (
                <div className="text-center min-h-[16rem] md:min-h-0 flex flex-col justify-center items-center">
                    <p className="text-lg text-slate-300 mb-4">Your study space is empty.</p>
                     <Button onClick={handleSeed} disabled={isSeeding}>
                        {isSeeding ? 'Setting up...' : 'Setup Initial Study Levels'}
                    </Button>
                </div>
            );
      }
      
      const isOdd = levels ? levels.length % 2 !== 0 : false;

      return (
           <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 min-h-[16rem] md:min-h-0">
              {levels && levels.map((item, index) => {
                  const isLastItem = index === levels.length - 1;
                  const path = item.type === 'LEVEL' ? `/level/${encodeURIComponent(item.name)}` : `/folder/${item.id}`;

                  if (item.type === 'FOLDER' || item.type === 'SUBJECT' || item.type === 'SEMESTER' ) {
                    return (
                        <div key={item.id} className={cn("col-span-1")}>
                             <FolderCard
                                item={item}
                                onRename={() => {}}
                                onDelete={() => {}}
                                onIconChange={() => {}}
                                onClick={() => handleItemClick(item)}
                                onMove={() => {}}
                                onCopy={() => {}}
                                onToggleVisibility={() => {}}
                                displayAs="grid"
                            />
                        </div>
                    );
                  }

                  return (
                    <div 
                        key={item.id}
                        className={cn(
                            "col-span-1 cursor-pointer",
                            isLastItem && isOdd && "col-span-2 sm:col-span-1"
                        )} 
                        onClick={() => handleItemClick(item)}
                        onMouseEnter={() => prefetcher.prefetchChildren(item.id)}
                    >
                        <div className={cn(
                            "glass-card p-4 md:p-6 group hover:bg-white/10 transition-colors h-24 md:h-28 flex items-center justify-center text-center rounded-[1.25rem]",
                            isLastItem && isOdd && "w-1/2 mx-auto sm:w-full"
                        )}>
                            <h3 className="text-base md:text-xl font-semibold text-white">{item.name}</h3>
                        </div>
                    </div>
                  )
                })}
          </div>
      )
  }

  return (
    <div
        className="flex-1 flex flex-col"
    >
        <div className="flex-grow pt-8 md:pt-12">
            <div className="w-full max-w-4xl text-center mx-auto">
                <h2 className="text-3xl md:text-4xl font-bold mb-8 bg-gradient-to-r from-[#00D309] to-teal-300 text-transparent bg-clip-text">Your Study Levels</h2>
                <div className="min-h-[16rem]">
                  {renderContent()}
                </div>
            </div>
        </div>
        <div className="mt-auto mb-4 mx-4">
            <div className="border border-blue-400/30 bg-blue-900/10 rounded-[1.25rem] p-6 max-w-3xl mx-auto">
                <blockquote className="text-center">
                    <p className="text-lg text-slate-300 italic max-w-2xl">
                        "The good doctor treats the disease; the great doctor treats the patient who has the disease."
                    </p>
                    <cite className="block text-right text-slate-400 mt-4 pr-4">- William Osler</cite>
                </blockquote>
            </div>
        </div>
         <footer className="text-center text-xs text-slate-500 pb-4">
            © 2025 MedSphere. All rights reserved.
        </footer>
    </div>
  );
}
