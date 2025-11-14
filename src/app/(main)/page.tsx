
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
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { where } from 'firebase/firestore';
import Link from 'next/link';


// This forces the page to be dynamically rendered.
export const dynamic = 'force-dynamic';

export default function HomePage() {
  const { db } = useFirebase();
  const [isSeeding, setIsSeeding] = useState(false);
  const router = useRouter();
  const { can } = useAuthStore();
  const { data: allItems, loading } = useCollection<Content>('content', {
      where: where('type', '==', 'LEVEL'),
      orderBy: ['order', 'asc']
  });
  
  const [hasInitialDataLoaded, setHasInitialDataLoaded] = useState(false);
  useEffect(() => {
    if (!loading) {
      setHasInitialDataLoaded(true);
    }
  }, [loading]);

  const levels = useMemo(() => {
    if (!allItems) return [];
    return allItems.filter(item => item.metadata?.isHidden ? can('canAccessAdminPanel', null) : true);
  }, [allItems, can]);

  const handleSeed = useCallback(async () => {
    setIsSeeding(true);
    try {
      await contentService.seedInitialData();
    } catch (error) {
      console.error("Seeding failed:", error);
    } finally {
        setIsSeeding(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && db && allItems && allItems.length === 0) {
        handleSeed();
    } else {
        setIsSeeding(false);
    }
  }, [loading, db, handleSeed, allItems]);

  
  const renderContent = () => {
      if (!hasInitialDataLoaded || isSeeding) {
           return (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 min-h-[16rem] md:min-h-0">
                    {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-24 md:h-28 w-full rounded-[1.25rem] bg-slate-800/50" />
                    ))}
                </div>
            );
      }
      
      const isOdd = levels ? levels.length % 2 !== 0 : false;

      return (
           <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 min-h-[16rem] md:min-h-0">
              {levels && levels.map((item, index) => {
                  const isLastItem = index === levels.length - 1;
                  const path = item.type === 'LEVEL' ? `/level/${encodeURIComponent(item.name)}` : `/folder/${item.id}`;

                  // Render only LEVEL type items
                  if (item.type === 'LEVEL') {
                    return (
                        <Link
                            key={item.id}
                            href={path}
                            className={cn(
                                "col-span-1 group",
                                isLastItem && isOdd && "col-span-2 sm:col-span-1"
                            )} 
                            onMouseEnter={() => prefetcher.prefetchChildren(item.id)}
                        >
                            <div className={cn(
                                "glass-card p-4 md:p-6 transition-colors h-24 md:h-28 flex items-center justify-center text-center rounded-[1.25rem]",
                                isLastItem && isOdd && "w-1/2 mx-auto sm:w-full",
                                "hover:bg-white/10"
                            )}>
                                <h3 className="text-base md:text-xl font-semibold text-white transition-transform duration-300 ease-out group-hover:scale-[1.03] origin-center">{item.name}</h3>
                            </div>
                        </Link>
                    )
                  }

                  return null; // Don't render other types directly
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
