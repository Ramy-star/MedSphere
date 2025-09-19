'use client';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import {
  ChevronRight,
  Folder,
  File,
  HomeIcon,
  Plus,
  Search,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { search } from '@/ai/flows/search-flow';
import { folderData, File as FileType } from '@/lib/file-data';
import Link from 'next/link';
import { FileListItem } from '@/components/file-list-item';

export type SearchOutput = FileType[];

const Breadcrumbs = () => (
  <nav className="flex items-center text-sm text-slate-300 mb-6">
    <a href="#" className="flex items-center gap-2 hover:text-white">
      <HomeIcon className="w-4 h-4" />
      <span>Home</span>
    </a>
    <ChevronRight className="w-4 h-4 mx-1" />
    <span className="font-semibold text-white">All Folders</span>
  </nav>
);

type FolderCardProps = {
  name: string;
  fileCount: number;
  icon: LucideIcon;
  color: string;
};

const FolderCard = ({ name, fileCount, icon: Icon, color }: FolderCardProps) => (
  <Link href={`/folder/${encodeURIComponent(name)}`} passHref>
    <div className="glass-card p-4 flex items-center justify-between transition-all hover:bg-white/10 cursor-pointer">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg bg-slate-800 ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="font-semibold text-white">{name}</p>
          <p className="text-sm text-slate-400">{fileCount} files</p>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-slate-500" />
    </div>
  </Link>
);


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
                        <Folder className="w-6 h-6 text-yellow-400" />
                        <h1 className="text-2xl font-bold text-white">Folders</h1>
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
                            icon={File}
                        />
                        ))
                    ) : (
                        <p className="text-slate-400">No files found.</p>
                    )}
                    </div>
                </section>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {folderData.map((folder) => (
                    <FolderCard 
                      key={folder.name} 
                      {...folder} 
                      fileCount={folder.files.length}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
