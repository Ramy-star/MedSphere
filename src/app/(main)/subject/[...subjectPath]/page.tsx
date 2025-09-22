
'use client';

import { Folder as FolderIcon } from 'lucide-react';
import React, { use, useMemo, useState, useEffect } from 'react';
import { notFound } from 'next/navigation';
import { allSubjects } from '@/lib/file-data';
import FileExplorerHeader from '@/components/FileExplorerHeader';
import { contentService, ContentItem } from '@/lib/contentService';
import { FolderGrid } from '@/components/FolderGrid';
import { allSubjectIcons } from '@/components/subject-card';


type SubjectPageProps = {
  params: {
    subjectPath: string[];
  };
};

export default function SubjectPage({ params }: SubjectPageProps) {
  const resolvedParams = use(params);
  const { subjectPath } = resolvedParams;
  const [levelName, semesterName, subjectName] = subjectPath.map(decodeURIComponent);
  const [subjectRootFolder, setSubjectRootFolder] = useState<ContentItem | null>(null);

  const subject = useMemo(() => {
    return allSubjects.find(s => s.name === subjectName && s.level === levelName && s.semester === semesterName);
  }, [subjectName, levelName, semesterName]);

  useEffect(() => {
    async function getOrCreateSubjectFolder() {
      if (!subject) return;
      // Use a consistent ID for the subject's root folder
      const subjectFolderId = `subject-root-${subject.name.replace(/\s+/g, '-')}-${subject.semester.replace(/\s+/g, '-')}`;
      let folder = await contentService.getById(subjectFolderId);
      if (!folder) {
        folder = await contentService.createFolder('root', subject.name);
        // This is a bit of a hack to give it a consistent ID.
        // In a real app, the ID would be stable from the backend.
        await contentService.delete(folder.id);
        folder.id = subjectFolderId;
        const allContent = JSON.parse(localStorage.getItem('mock_content_v1') || '[]');
        allContent.push(folder);
        localStorage.setItem('mock_content_v1', JSON.stringify(allContent));
      }
      setSubjectRootFolder(folder);
    }
    getOrCreateSubjectFolder();
  }, [subject]);


  if (!subject) {
    notFound();
  }
  
  const { iconName, color, name } = subject;
  const SubjectIcon = allSubjectIcons[iconName] || FolderIcon;

  return (
    <main className="flex-1 p-6 glass-card animate-fade-in">
        <FileExplorerHeader currentFolder={subjectRootFolder ?? undefined} />
        <div className="flex items-center justify-between mb-6" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg bg-slate-800 w-fit`}>
            <SubjectIcon className={`w-7 h-7 ${color}`} />
            </div>
            <h1 className="text-2xl font-bold text-white">{name}</h1>
        </div>
        </div>

        {subjectRootFolder ? (
          <FolderGrid 
            parentId={subjectRootFolder.id} 
          />
        ) : (
          <div className="text-center py-16 border-2 border-dashed border-slate-700 rounded-xl" style={{ animationDelay: '0.15s' }}>
              <FolderIcon className="mx-auto h-12 w-12 text-slate-500" />
              <h3 className="mt-4 text-lg font-semibold text-white">Loading Subject Content...</h3>
              <p className="mt-2 text-sm text-slate-400">Please wait a moment.</p>
          </div>
        )}
    </main>
  );
}
