
'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { search } from '@/ai/flows/search-flow';
import { RecentFileCard } from '@/components/dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { Breadcrumbs } from '@/components/breadcrumbs';

type SearchResult = {
    name: string;
    size: string;
    date: string;
};

function SearchResults() {
    const searchParams = useSearchParams();
    const query = searchParams.get('q');
    const [results, setResults] = useState<SearchResult[]>([]);
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
                        results.map((file, index) => (
                             <motion.div
                                key={`${file.name}-${index}`}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.15, delay: index * 0.03 }}
                            >
                                <RecentFileCard
                                    name={file.name}
                                    size={file.size}
                                    date={file.date}
                                />
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
