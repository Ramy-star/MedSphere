
'use client';

import { Folder as FolderIcon, Folder } from 'lucide-react';
import React, { useMemo, useState } from 'react';
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
  const resolvedParams = React.use(params);
  const { subjectPath } = resolvedParams;
  const [levelName, semesterName, subjectName] = subjectPath.map(decodeURIComponent);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  
  const subject = useMemo(() => {
    return allSubjects.find(s => s.name === subjectName && s.level === levelName && s.semester === semesterName);
  }, [subjectName, levelName, semesterName]);

  const [content, setContent] = useState<ContentItem[]>([]);

  if (!subject) {
    notFound();
  }

  const handleAddFolder = (folderName: string) => {
    setContent(prevContent => [...prevContent, { name: folderName, type: 'folder' }]);
  };
  
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
              // TODO: Render files here
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
              />
            </div>
        </div>
        )}
    </main>
  );
}
