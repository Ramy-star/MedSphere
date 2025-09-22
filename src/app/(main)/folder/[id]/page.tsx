
'use client';

import { useEffect, useState, use } from 'react';
import { FolderGrid } from '@/components/FolderGrid';
import FileExplorerHeader from '@/components/FileExplorerHeader';
import { contentService, ContentItem } from '@/lib/contentService';

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
  const [forceUpdateKey, setForceUpdateKey] = useState(0);


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
  
  const handleContentAdded = () => {
    setForceUpdateKey(v => v + 1);
  };

  return (
    <main className="flex-1 p-6 glass-card">
       <FileExplorerHeader currentFolder={folder ?? undefined} ancestors={ancestors} onContentAdded={handleContentAdded} />
      <FolderGrid parentId={id} key={forceUpdateKey} />
    </main>
  );
}
