'use client';

import { useState } from 'react';
import { FolderGrid } from '@/components/FolderGrid';
import FileExplorerHeader from '@/components/FileExplorerHeader';
import { AddContentMenu } from '@/components/add-content-menu';
import { contentService } from '@/lib/contentService';

export default function HomePage() {
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [_, setForceUpdate] = useState(0);

  const handleAddFolder = async (folderName: string) => {
    await contentService.createFolder(null, folderName);
    setForceUpdate(v => v + 1); // Force re-render of FolderGrid
  };
  
  const handleUploadFile = async (file: File) => {
    await contentService.uploadFile(null, { name: file.name, size: file.size, mime: file.type });
    setForceUpdate(v => v + 1); // Force re-render of FolderGrid
  };

  return (
    <main className="flex-1 p-6 glass-card">
      <FileExplorerHeader>
        <AddContentMenu 
          showNewFolderDialog={showNewFolderDialog} 
          setShowNewFolderDialog={setShowNewFolderDialog}
          onAddFolder={handleAddFolder}
          onUploadFile={handleUploadFile}
        />
      </FileExplorerHeader>
      <FolderGrid parentId={null} key={_} />
    </main>
  );
}
