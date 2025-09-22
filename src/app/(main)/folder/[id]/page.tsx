
'use client';

import { useEffect, useState, use } from 'react';
import { FolderGrid } from '@/components/FolderGrid';
import FileExplorerHeader from '@/components/FileExplorerHeader';
import { contentService, ContentItem } from '@/lib/contentService';
import { AddContentMenu } from '@/components/add-content-menu';

async function getAncestors(id: string): Promise<ContentItem[]> {
    let ancestors: ContentItem[] = [];
    let current = await contentService.getById(id);
    while (current && current.parentId) {
        current = await contentService.getById(current.parentId);
        if (current) {
            ancestors.unshift(current);
        }
    }
    return ancestors;
}


export default function FolderPage({ params }: { params: { id: string } }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;

  const [folder, setFolder] = useState<ContentItem | null>(null);
  const [ancestors, setAncestors] = useState<ContentItem[]>([]);
  const [content, setContent] = useState<ContentItem[]>([]);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [_, setForceUpdate] = useState(0);

  useEffect(() => {
    async function fetchFolderData() {
      const fetchedFolder = await contentService.getById(id);
      setFolder(fetchedFolder);
      if (fetchedFolder) {
        const children = await contentService.getChildren(id);
        setContent(children);
        const fetchedAncestors = await getAncestors(id);
        setAncestors(fetchedAncestors);
      }
    }
    fetchFolderData();
  }, [id]);
  
  const handleAddFolder = async (folderName: string) => {
    await contentService.createFolder(id, folderName);
    setForceUpdate(v => v + 1); // Force re-render of FolderGrid
  };

  const handleUploadFile = async (file: File) => {
    await contentService.uploadFile(id, { name: file.name, size: file.size, mime: file.type });
    setForceUpdate(v => v + 1); // Force re-render of FolderGrid
  };

  return (
    <main className="flex-1 p-6 glass-card">
       <FileExplorerHeader currentFolder={folder ?? undefined} ancestors={ancestors}>
          <AddContentMenu 
            showNewFolderDialog={showNewFolderDialog} 
            setShowNewFolderDialog={setShowNewFolderDialog}
            onAddFolder={handleAddFolder}
            onUploadFile={handleUploadFile}
          />
        </FileExplorerHeader>
      <FolderGrid parentId={id} key={_} />
    </main>
  );
}
