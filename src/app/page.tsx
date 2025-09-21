'use client';
import { Sidebar } from '@/components/sidebar';
import {
  ChevronRight,
  Folder,
  File as FileIcon,
  HomeIcon,
  Plus,
  Search,
  Clock,
  Book,
  FileText as FileTextIcon,
  Lightbulb,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { search } from '@/ai/flows/search-flow';
import { folderData, recentFiles, File as FileType } from '@/lib/file-data';
import Link from 'next/link';
import { FileListItem } from '@/components/file-list-item';
import { StatCard, RecentFileCard } from '@/components/dashboard';


export type SearchOutput = FileType[];

const Breadcrumbs = () => (
  <nav className="flex items-center text-sm text-slate-300 mb-6">
    <a href="/" className="flex items-center gap-2 hover:text-white">
      <HomeIcon className="w-4 h-4" />
      <span>Home</span>
    </a>
  </nav>
);

const totalFolders = folderData.length;
const totalFiles = folderData.reduce((acc, folder) => acc + folder.files.length, 0);

export default function Page() {
  const [searchResults, setSearchResults] = useState<SearchOutput | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleSearch = async (query: string) => {
    if (!query) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const results = await search(query);
    setSearchResults(results);
    setIsSearching(false);
  };
  
  useEffect(() => {
    window.__handleSearch = handleSearch;
    return () => {
      delete window.__handleSearch;
    }
  }, []);

  return (
    <div className="flex flex-1 w-full p-4 gap-4">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-6 glass-card">
          <Breadcrumbs />
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
                {searchResults === null ? (
                    <>
                        <div className="p-2 bg-yellow-400/10 rounded-lg">
                            <HomeIcon className="w-6 h-6 text-yellow-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                    </>
                ) : (
                    <>
                        <div className="p-2 bg-blue-400/10 rounded-lg">
                            <Search className="w-6 h-6 text-blue-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-white">
                            {`Search Results (${searchResults.length})`}
                        </h1>
                    </>
                )}
            </div>
          </div>

          {isSearching ? (
            <div className="flex justify-center items-center h-64">
                <p className="text-white text-lg">Searching...</p>
            </div>
          ) : (
            <>
              {searchResults !== null ? (
                 <section>
                    <div className="space-y-3">
                    {searchResults.length > 0 ? (
                        searchResults.map((file) => (
                        <FileListItem
                            key={file.name}
                            name={file.name}
                            size={file.size}
                            date={file.date}
                            icon={FileIcon}
                        />
                        ))
                    ) : (
                        <p className="text-slate-400 text-center py-10">No files found.</p>
                    )}
                    </div>
                </section>
              ) : (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      <StatCard icon={Folder} title="Total Folders" value={totalFolders.toString()} color="text-yellow-400" />
                      <StatCard icon={FileTextIcon} title="Total Files" value={totalFiles.toString()} color="text-blue-400" />
                      <StatCard icon={Book} title="Total Subjects" value="5" color="text-green-400" />
                    </div>
                    <div className="glass-card p-6 text-center">
                        <div className="flex justify-center items-center mb-4">
                            <div className="p-2 bg-purple-400/10 rounded-lg">
                                <Lightbulb className="w-6 h-6 text-purple-400" />
                            </div>
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">Quote of the Day</h3>
                        <p className="text-slate-400 italic">"The good physician treats the disease; the great physician treats the patient who has the disease."</p>
                        <p className="text-slate-500 text-sm mt-2">- William Osler</p>
                    </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
