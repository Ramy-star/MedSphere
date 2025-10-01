'use client';

import { Breadcrumbs } from '@/components/breadcrumbs';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { Content, contentService } from '@/lib/contentService';
import { useCollection } from '@/firebase/firestore/use-collection';
import { Button } from '@/components/ui/button';
import { useFirebase } from '@/firebase/provider';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function HomePage() {
  const { db } = useFirebase();
  const [isSeeding, setIsSeeding] = useState(false);
  const { data: levels, loading } = useCollection<Content>('content', {
      where: ['type', '==', 'LEVEL'],
      orderBy: ['order', 'asc']
  });

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
  
  const renderContent = () => {
      if (loading) {
           return null;
      }
      
      if (!levels || levels.length === 0) {
           return (
                <div className="text-center">
                    <p className="text-lg text-slate-300 mb-4">Your study space is empty.</p>
                     <Button onClick={handleSeed} disabled={isSeeding}>
                        {isSeeding ? 'Setting up...' : 'Setup Initial Study Levels'}
                    </Button>
                </div>
            );
      }
      
      const isOdd = levels.length % 2 !== 0;

      return (
           <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
              {levels.map((level, index) => {
                  const isLastItem = index === levels.length - 1;
                  return (
                    <div 
                        key={level.id}
                        className={cn(
                            // On mobile, if it's the last item and the total is odd, span 2 columns
                            isLastItem && isOdd && "col-span-2 sm:col-span-1 md:col-span-1"
                        )} 
                    >
                        <Link href={`/level/${encodeURIComponent(level.name)}`}>
                        <div className={cn(
                            "glass-card p-4 md:p-6 group hover:bg-white/10 transition-colors cursor-pointer h-24 md:h-28 flex items-center justify-center text-center",
                            // Center the content if we are spanning 2 columns
                            isLastItem && isOdd && "w-1/2 mx-auto sm:w-full"
                        )}>
                            <h3 className="text-base md:text-xl font-semibold text-white">{level.name}</h3>
                        </div>
                        </Link>
                    </div>
                  )
                })}
          </div>
      )
  }

  return (
    <motion.main 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex-1 p-4 md:p-6 space-y-6 flex flex-col"
    >
        <Breadcrumbs />
        <div className="flex-1 flex flex-col items-center justify-center md:justify-between pt-8 md:pt-12 pb-16">
            <div className="w-full max-w-4xl text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-8 bg-gradient-to-r from-[#00D309] to-teal-300 text-transparent bg-clip-text">Your Study Levels</h2>
                {renderContent()}
            </div>
            <div className="border border-blue-400/30 bg-blue-900/10 rounded-xl p-6 mt-16">
                <blockquote className="text-center">
                    <p className="text-lg text-slate-300 italic max-w-2xl">
                        "The good doctor treats the disease; the great doctor treats the patient who has the disease."
                    </p>
                    <cite className="block text-right text-slate-400 mt-4 pr-4">- William Osler</cite>
                </blockquote>
            </div>
        </div>
    </motion.main>
  );
}
