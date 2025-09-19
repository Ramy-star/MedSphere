'use client';

import { Sidebar } from '@/components/sidebar';
import { folderData } from '@/lib/file-data';
import {
  ChevronRight,
  Newspaper as ContentIcon,
  HomeIcon,
} from 'lucide-react';
import { useState } from 'react';
import { notFound } from 'next/navigation';
import { FileListItem } from '@/components/file-list-item';

type FolderPageProps = {
  params: {
    folderName: string;
  };
};

const Breadcrumbs = ({ folderName }: { folderName: string }) => (
  <nav className="flex items-center text-sm text-slate-300 mb-6 flex-wrap">
    <a href="/" className="flex items-center gap-2 hover:text-white">
      <HomeIcon className="w-4 h-4" />
      <span>Home</span>
    </a>
    <ChevronRight className="w-4 h-4 mx-1" />
    <span className="text-slate-400">Level 1</span>
    <ChevronRight className="w-4 h-4 mx-1" />
    <span className="text-slate-400">Semester 1</span>
    <ChevronRight className="w-4 h-4 mx-1" />
    <span className="text-slate-400">Chest</span>
    <ChevronRight className="w-4 h-4 mx-1" />
    <span className="font-semibold text-white">
        {folderName}
    </span>
  </nav>
);

export default function FolderPage({ params }: FolderPageProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const folderName = decodeURIComponent(params.folderName);
  const folder = folderData.find((f) => f.name === folderName);

  if (!folder) {
    notFound();
  }

  return (
    <div className="flex flex-1 w-full p-4 gap-4">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-6 glass-card">
          <Breadcrumbs folderName={folder.name} />
          <h2 className="text-lg font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <ContentIcon className="w-6 h-6 text-blue-400" />
            <span>Content</span>
          </h2>
          <div className="space-y-3">
            {folder.files.length > 0 ? (
              folder.files.map((file) => (
                <FileListItem
                  key={file.name}
                  name={file.name}
                  size={file.size}
                  date={file.date}
                  icon={ContentIcon}
                />
              ))
            ) : (
              <p className="text-slate-400">No content in this folder.</p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
