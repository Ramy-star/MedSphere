'use client';

import { useEffect, useState } from 'react';
import { FolderGrid } from '@/components/FolderGrid';
import FileExplorerHeader from '@/components/FileExplorerHeader';
import { contentService, ContentItem } from '@/lib/contentService';
import { AddContentMenu } from '@/components/add-content-menu';

export default function FolderPage({ params }: { params: { id: string } }) {
  const [folder, setFolder] = useState<ContentItem | null>(null);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [_, setForceUpdate] = useState(0);

  useEffect(() => {
    async function fetchFolder() {
      const fetchedFolder = await contentService.getById(params.id);
      setFolder(fetchedFolder);
      const children = await contentService.getChildren(params.id);
      setContent(children);
    }
    fetchFolder();
  }, [params.id]);
  
  const handleAddFolder = async (folderName: string) => {
    await contentService.createFolder(params.id, folderName);
    setForceUpdate(v => v + 1); // Force re-render of FolderGrid
  };

  const handleUploadFile = async (file: File) => {
    await contentService.uploadFile(params.id, { name: file.name, size: file.size, mime: file.type });
    setForceUpdate(v => v + 1); // Force re-render of FolderGrid
  };

  return (
    <main className="flex-1 p-6 glass-card">
       <FileExplorerHeader currentFolder={folder ?? undefined}>
          <AddContentMenu 
            showNewFolderDialog={showNewFolderDialog} 
            setShowNewFolderDialog={setShowNewFolderDialog}
            onAddFolder={handleAddFolder}
            onUploadFile={handleUploadFile}
          />
        </FileExplorerHeader>
      <FolderGrid parentId={params.id} key={_} />
    </main>
  );
}
