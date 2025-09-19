'use client';
import { Sidebar, SidebarToggle } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import {
  ChevronRight,
  Folder,
  File,
  HomeIcon,
  Plus,
  Download,
  Star,
  Book,
  FileText,
  Presentation,
  Users,
  TestTube2,
  Search,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { search } from '@/ai/flows/search-flow';
import { fileData as allFilesData } from '@/lib/file-data';
import { cn } from '@/lib/utils';

// This type is moved here from the flow file
export type SearchOutput = {
    name: string;
    size: string;
    date: string;
}[];

const folderData = [
  {
    name: 'Lectures',
    fileCount: 8,
    icon: Presentation,
    color: 'text-blue-400',
  },
  {
    name: 'Case Studies',
    fileCount: 5,
    icon: Users,
    color: 'text-purple-400',
  },
  {
    name: 'Textbooks',
    fileCount: 3,
    icon: Book,
    color: 'text-green-400',
  },
  {
    name: 'Research Papers',
    fileCount: 4,
    icon: FileText,
    color: 'text-red-400',
  },
  {
    name: 'Practical Sessions',
    fileCount: 2,
    icon: TestTube2,
    color: 'text-orange-400',
  },
];

const Breadcrumbs = () => (
  <nav className="flex items-center text-sm text-slate-300 mb-6">
    <a href="#" className="flex items-center gap-2 hover:text-white">
      <HomeIcon className="w-4 h-4" />
      <span>Home</span>
    </a>
    <ChevronRight className="w-4 h-4 mx-1" />
    <a href="#" className="hover:text-white">Levels</a>
    <ChevronRight className="w-4 h-4 mx-1" />
    <a href="#" className="hover:text-white">Semesters</a>
    <ChevronRight className="w-4 h-4 mx-1" />
    <a href="#" className="hover:text-white">Subjects</a>
    <ChevronRight className="w-4 h-4 mx-1" />
    <span className="font-semibold text-white">Anatomy</span>
  </nav>
);

type FolderCardProps = {
  name: string;
  fileCount: number;
  icon: LucideIcon;
  color: string;
};

const FolderCard = ({ name, fileCount, icon: Icon, color }: FolderCardProps) => (
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
);

type FileListItemProps = {
  name: string;
  size: string;
  date: string;
  icon: LucideIcon;
};

const FileListItem = ({ name, size, date, icon: Icon }: FileListItemProps) => (
  <div className="glass-card p-4 flex items-center justify-between transition-all hover:bg-white/10 cursor-pointer">
    <div className="flex items-center gap-4">
      <div className="p-3 rounded-lg bg-slate-800 text-purple-400">
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
        <p className="font-semibold text-white">{name}</p>
        <div className="flex items-center gap-4 text-sm text-slate-400">
          <span>{size}</span>
          <span className="hidden sm:inline">|</span>
          <span>{date}</span>
        </div>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-700">
        <Download className="w-5 h-5" />
      </Button>
      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-700">
        <Star className="w-5 h-5" />
      </Button>
    </div>
  </div>
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

  const filesToDisplay = searchResults === null ? allFilesData : searchResults;

  return (
    <div className="flex flex-1 w-full p-4 gap-4">
      <Sidebar open={sidebarOpen} />
      <div className={cn("flex-1 flex flex-col transition-all duration-300", sidebarOpen ? "ml-72" : "ml-0")}>
        <main className="flex-1 p-6 glass-card">
          <Breadcrumbs />
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              {searchResults === null ? (
                <Folder className="w-8 h-8 text-blue-400" />
              ) : (
                <Search className="w-8 h-8 text-blue-400" />
              )}
              <h1 className="text-2xl font-bold text-white">
                {searchResults === null ? 'Anatomy Content' : `Search Results (${searchResults.length})`}
              </h1>
            </div>
             {searchResults === null && (
              <Button className="bg-white/10 border-white/20 border text-white hover:bg-white/20">
                <Plus className="w-4 h-4 mr-2" />
                Add Content
              </Button>
            )}
          </div>

          {isSearching ? (
            <div className="text-white">Searching...</div>
          ) : (
            <>
              {searchResults === null && (
                <section className="mb-8">
                  <h2 className="text-lg font-semibold text-slate-300 mb-4 flex items-center gap-2">
                    <div className="w-2 h-4 bg-yellow-400 rounded-full"></div>
                    Folders
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {folderData.map((folder) => (
                      <FolderCard key={folder.name} {...folder} />
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h2 className="text-lg font-semibold text-slate-300 mb-4 flex items-center gap-2">
                  <div className="w-2 h-4 bg-blue-400 rounded-full"></div>
                  {searchResults === null ? 'Files' : 'Found Files'}
                </h2>
                <div className="space-y-3">
                  {filesToDisplay.length > 0 ? (
                    filesToDisplay.map((file) => (
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
            </>
          )}
        </main>
      </div>
    </div>
  );
}
