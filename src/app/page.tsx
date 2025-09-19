'use client';
import { Sidebar } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import {
  ChevronRight,
  Folder,
  File,
  HomeIcon,
  Plus,
  Download,
  Star,
  Search,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { search } from '@/ai/flows/search-flow';
import { folderData, File as FileType } from '@/lib/file-data';
import { cn } from '@/lib/utils';

export type SearchOutput = FileType[];

const allFilesData: FileType[] = folderData.flatMap(f => f.files);

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
  onClick: () => void;
  isActive: boolean;
};

const FolderCard = ({ name, fileCount, icon: Icon, color, onClick, isActive }: FolderCardProps) => (
  <div 
    className={cn(
      "glass-card p-4 flex items-center justify-between transition-all hover:bg-white/10 cursor-pointer",
      isActive && "bg-blue-500/20"
    )}
    onClick={onClick}
  >
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
  const [activeFolder, setActiveFolder] = useState(folderData[0].name);

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

  const filesToDisplay = searchResults === null 
    ? folderData.find(f => f.name === activeFolder)?.files || []
    : searchResults;

  const currentFolder = folderData.find(f => f.name === activeFolder);

  return (
    <div className="flex flex-1 w-full p-4 gap-4">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-6 glass-card">
          <Breadcrumbs />
          <div className="flex items-center justify-between mb-6">
            <div>
              {searchResults !== null && (
                <div className="flex items-center gap-4">
                  <Search className="w-8 h-8 text-blue-400" />
                  <h1 className="text-2xl font-bold text-white">
                    {`Search Results (${searchResults.length})`}
                  </h1>
                </div>
              )}
            </div>
            {searchResults === null && (
              <Button className="bg-white/10 border-white/20 border text-white hover:bg-white/20 ml-auto">
                <Plus className="w-4 h-4 mr-2" />
                Add Content
              </Button>
            )}
          </div>

          {isSearching ? (
            <div className="text-white">Searching...</div>
          ) : (
            <>
              {searchResults !== null ? (
                 <section>
                    <h2 className="text-lg font-semibold text-slate-300 mb-4 flex items-center gap-2">
                    <File className="w-6 h-6 text-blue-400" />
                    <span>Found Files</span>
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
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <section>
                    <h2 className="text-lg font-semibold text-slate-300 mb-4 flex items-center gap-2">
                      <Folder className="w-6 h-6 text-yellow-400" />
                      <span>Folders</span>
                    </h2>
                    <div className="space-y-3">
                      {folderData.map((folder) => (
                        <FolderCard 
                          key={folder.name} 
                          {...folder} 
                          fileCount={folder.files.length}
                          onClick={() => setActiveFolder(folder.name)}
                          isActive={activeFolder === folder.name}
                        />
                      ))}
                    </div>
                  </section>
                  <section>
                     {currentFolder && (
                        <>
                            <h2 className="text-lg font-semibold text-slate-300 mb-4 flex items-center gap-2">
                                {currentFolder.icon && <currentFolder.icon className={`w-6 h-6 ${currentFolder.color}`} />}
                                <span>{currentFolder.name}</span>
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
                                <p className="text-slate-400">No files in this folder.</p>
                            )}
                            </div>
                        </>
                     )}
                  </section>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
