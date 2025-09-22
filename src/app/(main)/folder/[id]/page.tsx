
'use client';

import { useEffect, useState, use, useRef } from 'react';
import { FolderGrid } from '@/components/FolderGrid';
import FileExplorerHeader from '@/components/FileExplorerHeader';
import { contentService, ContentItem } from '@/lib/contentService';
import { AddContentMenu } from '@/components/add-content-menu';
import { saveFile } from '@/lib/indexedDBService';


async function getAncestors(id: string): Promise<ContentItem[]> {
    let ancestors: ContentItem[] = [];
    if (id === 'root') return [];

    let current = await contentService.getById(id);
    while (current && current.parentId && current.parentId !== 'root') {
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
  const [forceUpdateKey, setForceUpdateKey] = useState(0);

  const addContentPopoverRef = useRef<HTMLButtonElement>(null);


  useEffect(() => {
    async function fetchFolderData() {
      const fetchedFolder = await contentService.getById(id);
      setFolder(fetchedFolder);
      if (fetchedFolder) {
        const fetchedAncestors = await getAncestors(id);
        setAncestors(fetchedAncestors);
      }
    }
    fetchFolderData();
  }, [id, forceUpdateKey]);
  
  const handleAddFolder = async (folderName: string) => {
    await contentService.createFolder(id, folderName);
    setForceUpdateKey(v => v + 1);
  };

  const handleUploadFile = async (file: File) => {
    const newFileItem = await contentService.uploadFile(id, { name: file.name, size: file.size, mime: file.type });
    await saveFile(newFileItem.id, file);
    setForceUpdateKey(v => v + 1);
  };

  const handleAddContentClick = () => {
    addContentPopoverRef.current?.click();
  }

  return (
    <main className="flex-1 p-6 glass-card">
       <FileExplorerHeader currentFolder={folder ?? undefined} ancestors={ancestors}>
          <AddContentMenu 
            showNewFolderDialog={showNewFolderDialog} 
            setShowNewFolderDialog={setShowNewFolderDialog}
            onAddFolder={handleAddFolder}
            onUploadFile={handleUploadFile}
            popoverRef={addContentPopoverRef}
          />
        </FileExplorerHeader>
      <FolderGrid parentId={id} key={forceUpdateKey} onAddContentClick={handleAddContentClick}/>
    </main>
  );
}
