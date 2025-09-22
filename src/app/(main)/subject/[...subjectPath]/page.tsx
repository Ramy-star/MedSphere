
'use client';

import { Folder as FolderIcon } from 'lucide-react';
import React, { use, useMemo, useState, useEffect, useCallback } from 'react';
import { notFound } from 'next/navigation';
import { allSubjects, allSubjectIcons } from '@/lib/file-data';
import FileExplorerHeader from '@/components/FileExplorerHeader';
import { contentService, ContentItem } from '@/lib/contentService';
import { FolderGrid } from '@/components/FolderGrid';


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

  const getOrCreateSubjectFolder = useCallback(async () => {
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
  }, [subject]);

  useEffect(() => {
    getOrCreateSubjectFolder();
  }, [getOrCreateSubjectFolder]);


  if (!subject) {
    notFound();
  }
  
  const { iconName, color, name } = subject;
  const SubjectIcon = allSubjectIcons[iconName] || FolderIcon;

  return (
    <main className="flex-1 p-6 glass-card animate-fade-in">
        <FileExplorerHeader 
            currentFolder={subjectRootFolder ? { ...subjectRootFolder, icon: SubjectIcon, iconColor: color } : undefined} 
            onContentAdded={getOrCreateSubjectFolder} 
        />
        
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
