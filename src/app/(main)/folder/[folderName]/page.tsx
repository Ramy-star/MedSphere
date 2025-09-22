
'use client';

import { folderData } from '@/lib/file-data';
import {
  Newspaper as ContentIcon,
} from 'lucide-react';
import React, { useState } from 'react';
import { FileListItem } from '@/components/file-list-item';
import Link from 'next/link';
import { AddContentMenu } from '@/components/add-content-menu';
import { NavHistory } from '@/components/nav-history';
import { Breadcrumbs } from '@/components/breadcrumbs';

type FolderPageProps = {
  params: {
    folderName: string;
  };
};


export default function FolderPage({ params }: FolderPageProps) {
  const resolvedParams = React.use(params);
  const folderName = decodeURIComponent(resolvedParams.folderName);
  const folder = folderData.find((f) => f.name === folderName);

  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [content, setContent] = useState<any[]>([]);

  const handleAddFolder = (newFolderName: string) => {
    // In a real app, you'd persist this. For now, just update state.
    setContent(prevContent => [...prevContent, { name: newFolderName, type: 'folder' }]);
  };


  if (!folder) {
    // This case will be hit for newly created folders that don't exist in mock data.
    // We can create a placeholder folder object.
    const newFolder = {
        name: folderName,
        files: [],
        icon: ContentIcon,
        color: 'text-gray-400'
    };

    return (
        <main className="flex-1 p-6 glass-card">
            <div className="flex items-center justify-between mb-6">
              <Breadcrumbs />
              <NavHistory />
            </div>
            <div className="flex items-center justify-between mb-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <h2 className="text-lg font-semibold text-slate-300 flex items-center gap-2">
                    <ContentIcon className="w-6 h-6 text-blue-400" />
                    <span>{newFolder.name}</span>
                </h2>
                <AddContentMenu
                    showNewFolderDialog={showNewFolderDialog}
                    setShowNewFolderDialog={setShowNewFolderDialog}
                    onAddFolder={handleAddFolder}
                />
            </div>
            
            <div className="space-y-3">
                {content.length > 0 ? (
                    content.map((item, index) => {
                        if (item.type === 'folder') {
                            return (
                                <Link key={index} href={`/folder/${encodeURIComponent(item.name)}`}>
                                    <div className="glass-card p-4 rounded-xl group hover:bg-white/10 transition-colors cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <ContentIcon className="w-6 h-6 text-yellow-400" />
                                        <h3 className="text-lg font-semibold text-white">{item.name}</h3>
                                    </div>
                                    </div>
                                </Link>
                            )
                        }
                        return null;
                    })
                ) : (
                    <p className="text-slate-400 animate-fade-in" style={{ animationDelay: '0.15s' }}>No content in this folder.</p>
                )}
            </div>
        </main>
    );
  }

  return (
    <main className="flex-1 p-6 glass-card">
        <div className="flex items-center justify-between mb-6">
            <Breadcrumbs />
            <NavHistory />
        </div>
        <div className="flex items-center justify-between mb-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <h2 className="text-lg font-semibold text-slate-300 flex items-center gap-2">
                <ContentIcon className="w-6 h-6 text-blue-400" />
                <span>{folder.name}</span>
            </h2>
             <AddContentMenu
                showNewFolderDialog={showNewFolderDialog}
                setShowNewFolderDialog={setShowNewFolderDialog}
                onAddFolder={handleAddFolder}
            />
        </div>
        <div className="space-y-3">
        {folder.files.length > 0 || content.length > 0 ? (
            <>
                {folder.files.map((file, index) => (
                <div key={file.name} className="animate-fade-in" style={{ animationDelay: `${index * 0.05 + 0.15}s`}}>
                    <FileListItem
                        name={file.name}
                        size={file.size}
                        date={file.date}
                        icon={ContentIcon}
                    />
                </div>
                ))}
                {content.map((item, index) => {
                    if (item.type === 'folder') {
                        return (
                            <Link key={index} href={`/folder/${encodeURIComponent(item.name)}`}>
                                <div className="glass-card p-4 rounded-xl group hover:bg-white/10 transition-colors cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <ContentIcon className="w-6 h-6 text-yellow-400" />
                                    <h3 className="text-lg font-semibold text-white">{item.name}</h3>
                                </div>
                                </div>
                            </Link>
                        )
                    }
                    return null;
                })}
            </>
        ) : (
            <p className="text-slate-400 animate-fade-in" style={{ animationDelay: '0.15s' }}>No content in this folder.</p>
        )}
        </div>
    </main>
  );
}
