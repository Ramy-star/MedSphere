
'use client';

import { Folder as FolderIcon, Folder } from 'lucide-react';
import React, { use, useMemo, useState, useEffect } from 'react';
import { notFound } from 'next/navigation';
import { allSubjects, File } from '@/lib/file-data';
import Link from 'next/link';
import { AddContentMenu } from '@/components/add-content-menu';
import { NavHistory } from '@/components/nav-history';
import { Breadcrumbs } from '@/components/breadcrumbs';

type SubjectPageProps = {
  params: {
    subjectPath: string[];
  };
};

type ContentItem = File | { name: string; type: 'folder' };


export default function SubjectPage({ params }: SubjectPageProps) {
  const resolvedParams = use(params);
  const { subjectPath } = resolvedParams;
  const [levelName, semesterName, subjectName] = subjectPath.map(decodeURIComponent);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  
  const subject = useMemo(() => {
    return allSubjects.find(s => s.name === subjectName && s.level === levelName && s.semester === semesterName);
  }, [subjectName, levelName, semesterName]);

  const [content, setContent] = useState<ContentItem[]>([]);
  
  // This is a placeholder. In a real app, you'd fetch this from your DB/API
  // based on the subject.
  useEffect(() => {
    setContent([]);
  }, [subject])


  if (!subject) {
    notFound();
  }

  const handleAddFolder = (folderName: string) => {
    // In a real app, you would call an API to create the folder.
    // Here we just add it to the local state for demonstration.
    const newFolder = { name: folderName, type: 'folder' as const };
    setContent(prevContent => [...prevContent, newFolder]);
  };

  const handleUploadFile = (file: globalThis.File) => {
    // In a real app, you would handle the file upload process.
    console.log("Uploading file:", file.name);
    // For now, we'll just add it to the list to show it in the UI.
    const newFile = { name: file.name, size: `${(file.size / 1024).toFixed(1)} KB`, date: new Date().toLocaleDateString() };
    setContent(prevContent => [...prevContent, newFile]);
  }
  
  const { icon: SubjectIcon, color, name } = subject;

  return (
    <main className="flex-1 p-6 glass-card animate-fade-in">
        <div className="flex items-center justify-between mb-6">
            <Breadcrumbs />
            <NavHistory />
        </div>
        <div className="flex items-center justify-between mb-6" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg bg-slate-800 w-fit`}>
            <SubjectIcon className={`w-7 h-7 ${color}`} />
            </div>
            <h1 className="text-2xl font-bold text-white">{name}</h1>
        </div>
        <AddContentMenu 
          showNewFolderDialog={showNewFolderDialog} 
          setShowNewFolderDialog={setShowNewFolderDialog}
          onAddFolder={handleAddFolder}
          onUploadFile={handleUploadFile}
        />
        </div>

        {content.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" style={{ animationDelay: '0.15s' }}>
            {content.map((item, index) => {
              if ('type' in item && item.type === 'folder') {
                return (
                  <Link key={index} href={`/folder/${encodeURIComponent(item.name)}`}>
                    <div className="glass-card p-4 rounded-xl group hover:bg-white/10 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Folder className="w-6 h-6 text-yellow-400" />
                        <h3 className="text-lg font-semibold text-white">{item.name}</h3>
                      </div>
                    </div>
                  </Link>
                )
              }
              // Render files here
              if ('size' in item) {
                return (
                   <div key={index} className="glass-card p-4 rounded-xl group hover:bg-white/10 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <FolderIcon className="w-6 h-6 text-blue-400" />
                        <h3 className="text-lg font-semibold text-white truncate">{item.name}</h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 truncate">{item.size}</p>
                    </div>
                )
              }
              return null;
            })}
        </div>
        ) : (
        <div className="text-center py-16 border-2 border-dashed border-slate-700 rounded-xl" style={{ animationDelay: '0.15s' }}>
            <FolderIcon className="mx-auto h-12 w-12 text-slate-500" />
            <h3 className="mt-4 text-lg font-semibold text-white">This subject is empty</h3>
            <p className="mt-2 text-sm text-slate-400">Get started by adding folders or files.</p>
            <div className="mt-6">
              <AddContentMenu 
                showNewFolderDialog={showNewFolderDialog} 
                setShowNewFolderDialog={setShowNewFolderDialog}
                onAddFolder={handleAddFolder}
                onUploadFile={handleUploadFile}
              />
            </div>
        </div>
        )}
    </main>
  );
}
