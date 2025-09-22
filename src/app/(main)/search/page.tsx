
'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { search } from '@/ai/flows/search-flow';
import { RecentFileCard } from '@/components/dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { FileCard } from '@/components/FileCard';
import { FolderCard } from '@/components/FolderCard';
import { SubjectCard } from '@/components/subject-card';
import { Content } from '@/lib/contentService';
import Link from 'next/link';

function SearchResults() {
    const searchParams = useSearchParams();
    const query = searchParams.get('q');
    const [results, setResults] = useState<Content[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function performSearch() {
            if (!query) {
                setResults([]);
                return;
            }
            setLoading(true);
            try {
                const searchResults = await search(query);
                setResults(searchResults);
            } catch (error) {
                console.error("Search failed:", error);
                setResults([]);
            } finally {
                setLoading(false);
            }
        }
        performSearch();
    }, [query]);

    return (
        <main className="flex-1 p-6 space-y-6 animate-fade-in flex flex-col">
            <Breadcrumbs current={{ id: 'search', name: `Search: "${query}"`, type: 'FOLDER', parentId: 'root' }} ancestors={[{ id: 'root', name: 'Home', type: 'FOLDER', parentId: null }]} />

            <h2 className="text-2xl font-bold text-white">
                {loading ? 'Searching...' : `Found ${results.length} results for "${query}"`}
            </h2>

            {loading ? (
                <div className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                </div>
            ) : (
                <div className="space-y-3">
                    {results.length > 0 ? (
                        results.map((item, index) => (
                             <motion.div
                                key={`${item.name}-${index}`}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.15, delay: index * 0.03 }}
                            >
                                {item.type === 'FILE' && (
                                    <Link href={`/folder/${item.parentId}`}>
                                        <RecentFileCard
                                            name={item.name}
                                            size={item.metadata?.size ? `${(item.metadata.size / 1024).toFixed(1)} KB` : ''}
                                            date={item.createdAt ? format(new Date(item.createdAt), 'MMM dd, yyyy') : ''}
                                        />
                                    </Link>
                                )}
                                {item.type === 'FOLDER' && (
                                    <FolderCard 
                                        item={item}
                                        onRename={() => {}}
                                        onDelete={() => {}}
                                    />
                                )}
                                {item.type === 'SUBJECT' && (
                                     <SubjectCard subject={item} />
                                )}
                                 {item.type === 'SEMESTER' && (
                                     <Link href={`/folder/${item.id}`}>
                                        <div className="glass-card p-4 group hover:bg-white/10 transition-colors cursor-pointer">
                                            <h3 className="text-lg font-semibold text-white">{item.name}</h3>
                                        </div>
                                    </Link>
                                )}
                                {item.type === 'LEVEL' && (
                                     <Link href={`/level/${encodeURIComponent(item.name)}`}>
                                        <div className="glass-card p-4 group hover:bg-white/10 transition-colors cursor-pointer">
                                            <h3 className="text-lg font-semibold text-white">{item.name}</h3>
                                        </div>
                                    </Link>
                                )}
                            </motion.div>
                        ))
                    ) : (
                        !loading && query && <p className="text-slate-400">No results found.</p>
                    )}
                </div>
            )}
        </main>
    );
}

// Need to wrap with suspense for useSearchParams
export default function SearchPage() {
    return (
        <Suspense fallback={<div className="flex-1 p-6"><Skeleton className="h-8 w-48 mb-6" /><Skeleton className="h-40 w-full" /></div>}>
            <SearchResults />
        </Suspense>
    )
}
