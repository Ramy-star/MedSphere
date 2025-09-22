
'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { FolderGrid } from '@/components/FolderGrid';
import FileExplorerHeader from '@/components/FileExplorerHeader';
import { contentService, ContentItem } from '@/lib/contentService';

async function getAncestors(id: string): Promise<ContentItem[]> {
    let ancestors: ContentItem[] = [];
    if (id === 'root') return [];

    let current = await contentService.getById(id);

    if (current) {
        ancestors.unshift(current);
    }

    while (current && current.parentId) {
        current = await contentService.getById(current.parentId);
        if (current && current.id !== 'root') {
            ancestors.unshift(current);
        }
    }
    return ancestors;
}


export default function FolderPage({ params }: { params: { id: string } }) {
  const { id } = use(params);

  const [folder, setFolder] = useState<ContentItem | null>(null);
  const [ancestors, setAncestors] = useState<ContentItem[]>([]);


  const fetchFolderData = useCallback(async () => {
    const fetchedFolder = await contentService.getById(id);
    setFolder(fetchedFolder);
    if (fetchedFolder) {
      const fetchedAncestors = await getAncestors(id);
      setAncestors(fetchedAncestors);
    }
  }, [id]);

  useEffect(() => {
    fetchFolderData();
  }, [id, fetchFolderData]);
  
  return (
    <main className="flex-1 p-6 glass-card">
       <FileExplorerHeader currentFolder={folder ?? undefined} ancestors={ancestors} onContentAdded={fetchFolderData} />
      <FolderGrid parentId={id} />
    </main>
  );
}
