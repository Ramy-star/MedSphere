'use client';

import { FolderGrid } from '@/components/FolderGrid';
import FileExplorerHeader from '@/components/FileExplorerHeader';

export default function HomePage() {
  return (
    <main className="flex-1 p-6 glass-card">
      <FileExplorerHeader />
      <FolderGrid parentId={null} />
    </main>
  );
}
