'use client';

import { useEffect, useState } from 'react';
import { FolderGrid } from '@/components/FolderGrid';
import FileExplorerHeader from '@/components/FileExplorerHeader';
import { contentService, ContentItem } from '@/lib/contentService';

export default function FolderPage({ params }: { params: { id: string } }) {
  const [folder, setFolder] = useState<ContentItem | null>(null);

  useEffect(() => {
    async function fetchFolder() {
      const fetchedFolder = await contentService.getById(params.id);
      setFolder(fetchedFolder);
    }
    fetchFolder();
  }, [params.id]);

  return (
    <main className="flex-1 p-6 glass-card">
      <FileExplorerHeader currentFolder={folder ?? undefined} />
      <FolderGrid parentId={params.id} />
    </main>
  );
}
