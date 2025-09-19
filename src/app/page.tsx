'use client';
import { Sidebar } from '@/components/sidebar';
import {
  ChevronRight,
  Search,
  Upload,
  Folder,
  FileText,
  PlayCircle,
  MoreVertical,
  Eye,
  Download,
  Share,
  Pencil,
  Trash2,
  Menu,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';

const FileItem = ({
  item,
}: {
  item: {
    type: string;
    name: string;
    size?: string;
    fileCount?: number;
    thumb?: string;
  };
}) => {
  return (
    <div className="group cursor-pointer">
      <div className="relative flex flex-col p-3 bg-surface-dark border border-dark rounded-xl hover:bg-white/10 transition-all duration-200 h-40">
        {item.type === 'folder' ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Folder className="text-5xl text-amber-400" />
            <p className="mt-2 text-sm font-medium text-white text-center truncate w-full">
              {item.name}
            </p>
            <p className="text-xs text-slate-400">{item.fileCount} files</p>
          </div>
        ) : (
          <>
            <div className="flex-1 w-full rounded-lg flex items-center justify-center mb-2 overflow-hidden bg-slate-800">
              {item.type === 'pdf' ? (
                <FileText className="text-4xl text-red-500" />
              ) : item.type === 'video' && item.thumb ? (
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${item.thumb})` }}
                >
                  <div className="w-full h-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <PlayCircle className="text-5xl text-white" />
                  </div>
                </div>
              ) : null}
            </div>
            <p className="text-xs font-semibold text-white truncate">
              {item.name}
            </p>
            <p className="text-[11px] text-slate-400">{item.size}</p>
          </>
        )}
        <div className="absolute top-2 right-2 z-20">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-slate-300 bg-black/30 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48 bg-slate-900 border-dark">
              <DropdownMenuItem>
                <Eye className="mr-2 h-4 w-4" />
                <span>Preview</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="mr-2 h-4 w-4" />
                <span>Download</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Share className="mr-2 h-4 w-4" />
                <span>Share</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Pencil className="mr-2 h-4 w-4" />
                <span>Rename</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-400 hover:!text-red-300">
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default function Home() {
    const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const files = [
    { type: 'folder', name: 'Lectures', fileCount: 12 },
    { type: 'pdf', name: 'Anatomy_Lecture_1.pdf', size: '12.5 MB' },
    {
      type: 'video',
      name: 'Surgical_Procedure.mp4',
      size: '150.2 MB',
      thumb: 'https://picsum.photos/seed/video1/600/400',
    },
    { type: 'folder', name: 'Labs', fileCount: 8 },
    { type: 'pdf', name: 'Lab_Manual.pdf', size: '5.2 MB' },
    {
      type: 'video',
      name: 'Dissection_Guide.mp4',
      size: '250.8 MB',
      thumb: 'https://picsum.photos/seed/video2/600/400',
    },
    { type: 'pdf', name: 'Syllabus.pdf', size: '1.1 MB' },
    { type: 'folder', name: 'Case Studies', fileCount: 5 },
    { type: 'pdf', name: 'Case_Study_1.pdf', size: '2.1 MB' },
    {
      type: 'video',
      name: 'Patient_Interview.mp4',
      size: '98.4 MB',
      thumb: 'https://picsum.photos/seed/video3/600/400',
    },
  ];

  return (
    <>
      <Sidebar isMobileOpen={isMobileMenuOpen} setMobileOpen={setMobileMenuOpen} />
      <div id="main-content" className="flex-1 flex flex-col h-screen overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
               <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(true)}>
                <Menu />
              </Button>
              <div className="relative w-full max-w-md hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search files, subjects..."
                  className="w-full bg-surface-dark border border-transparent rounded-full py-2 pl-10 pr-4 text-sm text-white focus:ring-primary focus:border-primary placeholder-slate-400"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
               <Button variant="ghost" size="icon" className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
              </Button>
              <Avatar className="h-10 w-10">
                <AvatarImage src="https://picsum.photos/seed/user-avatar/100/100" />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            </div>
          </div>

          <nav
            className="flex items-center text-sm text-slate-400 mb-4"
            aria-label="Breadcrumb"
          >
            <ol className="inline-flex items-center space-x-1 md:space-x-2">
              <li className="inline-flex items-center">
                <a href="#" className="hover:text-white">
                  Level 1
                </a>
              </li>
              <li>
                <div className="flex items-center">
                  <ChevronRight className="h-4 w-4" />
                  <a href="#" className="ml-1 hover:text-white">
                    Semester 1
                  </a>
                </div>
              </li>
              <li aria-current="page">
                <div className="flex items-center">
                  <ChevronRight className="h-4 w-4" />
                  <span className="ml-1 font-medium text-white">Anatomy</span>
                </div>
              </li>
            </ol>
          </nav>

          <div className="flex items-center justify-between gap-4 mb-6">
            <h1 className="text-3xl font-bold text-white">Anatomy Files</h1>
            <Button
              className="bg-surface-dark hover:bg-white/10 border border-dark text-slate-300 font-semibold text-sm transition-colors"
            >
              <Upload className="mr-2 h-4 w-4" />
              <span>Upload</span>
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
            {files.map((file, index) => (
              <FileItem key={index} item={file} />
            ))}
          </div>
        </main>
      </div>
    </>
  );
}
