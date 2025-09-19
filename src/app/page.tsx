'use client';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import {
  ChevronRight,
  Folder,
  File as FileIcon,
  HomeIcon,
  Plus,
  Search,
  Clock,
  Book,
  FileText as FileTextIcon
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
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
                {searchResults === null ? (
                    <>
                        <HomeIcon className="w-6 h-6 text-yellow-400" />
                        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                    </>
                ) : (
                    <>
                        <Search className="w-6 h-6 text-blue-400" />
                        <h1 className="text-2xl font-bold text-white">
                            {`Search Results (${searchResults.length})`}
                        </h1>
                    </>
                )}
            </div>
            
            <Button className="bg-white/10 border-white/20 border text-white hover:bg-white/20 ml-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add Content
            </Button>
            
          </div>

          {isSearching ? (
            <div className="text-white">Searching...</div>
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
                        <p className="text-slate-400">No files found.</p>
                    )}
                    </div>
                </section>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  <div className="xl:col-span-2 space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <StatCard icon={Folder} title="Total Folders" value={totalFolders.toString()} color="text-yellow-400" />
                          <StatCard icon={FileTextIcon} title="Total Files" value={totalFiles.toString()} color="text-blue-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <Clock className="w-6 h-6 text-green-400" />
                          <h2 className="text-xl font-bold text-white">Recent Files</h2>
                        </div>
                        <div className="space-y-3">
                          {recentFiles.map(file => <RecentFileCard key={file.name} {...file} />)}
                        </div>
                      </div>
                  </div>
                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <Folder className="w-6 h-6 text-purple-400" />
                      <h2 className="text-xl font-bold text-white">Folders</h2>
                    </div>
                    <div className="space-y-3">
                        {folderData.map((folder) => (
                          <Link href={`/folder/${encodeURIComponent(folder.name)}`} passHref key={folder.name}>
                            <div className="glass-card p-3 flex items-center justify-between transition-all hover:bg-white/10 cursor-pointer">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg bg-slate-800 ${folder.color}`}>
                                  <folder.icon className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="font-semibold text-white text-sm">{folder.name}</p>
                                  <p className="text-xs text-slate-400">{folder.files.length} files</p>
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-slate-500" />
                            </div>
                          </Link>
                        ))}
                    </div>
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
