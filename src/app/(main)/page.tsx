
'use client';

import { Breadcrumbs } from '@/components/breadcrumbs';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { contentService, Content } from '@/lib/contentService';
import { Skeleton } from '@/components/ui/skeleton';

export default function HomePage() {
  const [levels, setLevels] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLevels() {
      const topLevelContent = await contentService.getChildren(null);
      setLevels(topLevelContent.filter(c => c.type === 'LEVEL'));
      setLoading(false);
    }
    fetchLevels();
  }, []);

  return (
    <main className="flex-1 p-4 md:p-6 space-y-6 animate-fade-in flex flex-col">
        <Breadcrumbs />
        <div className="flex-1 flex flex-col items-center justify-center md:justify-between pt-8 md:pt-12 pb-16">
            <div className="w-full max-w-4xl text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-8 bg-gradient-to-r from-[#00D309] to-teal-300 text-transparent bg-clip-text">Your Study Levels</h2>
                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 md:h-28 rounded-xl" />)}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
                        {levels.map((level, index) => (
                            <div key={level.id} className="animate-fade-in" style={{ animationDelay: `${index * 0.05 + 0.25}s` }}>
                                <Link href={`/level/${encodeURIComponent(level.name)}`}>
                                <div className="glass-card p-4 md:p-6 group hover:bg-white/10 transition-colors cursor-pointer h-24 md:h-28 flex items-center justify-center text-center">
                                    <h3 className="text-base md:text-xl font-semibold text-white">{level.name}</h3>
                                </div>
                                </Link>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="hidden md:block animate-fade-in border border-blue-400/30 bg-blue-900/10 rounded-xl p-6 mt-16" style={{ animationDelay: '0.5s' }}>
                <blockquote className="text-center">
                    <p className="text-lg text-slate-300 italic max-w-2xl">
                        "The good doctor treats the disease; the great doctor treats the patient who has the disease."
                    </p>
                    <cite className="block text-right text-slate-400 mt-4 pr-4">- William Osler</cite>
                </blockquote>
            </div>
        </div>
    </main>
  );
}
