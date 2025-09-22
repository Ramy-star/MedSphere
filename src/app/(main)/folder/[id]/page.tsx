
'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { FolderGrid } from '@/components/FolderGrid';
import FileExplorerHeader from '@/components/FileExplorerHeader';
import { contentService, Content } from '@/lib/contentService';
import { allSubjectIcons } from '@/lib/file-data';
import { notFound } from 'next/navigation';
import { LucideIcon, Folder } from 'lucide-react';


export default function FolderPage({ params }: { params: { id: string } }) {
  const { id } = use(params);

  const [current, setCurrent] = useState<Content | null>(null);
  const [ancestors, setAncestors] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFolderData = useCallback(async () => {
    setLoading(true);
    const fetchedCurrent = await contentService.getById(id);

    if (!fetchedCurrent) {
        setLoading(false);
        // Maybe show a 'not found' component later
        return;
    }

    setCurrent(fetchedCurrent);
    
    const fetchedAncestors = await contentService.getAncestors(id);
    setAncestors(fetchedAncestors);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchFolderData();
  }, [id, fetchFolderData]);
  
  if (loading) {
      return <main className="flex-1 p-6 glass-card">
        {/* Can add a skeleton loader here */}
      </main>
  }

  if (!current) {
      notFound();
  }

  let Icon: LucideIcon = Folder;
  let iconColor = 'text-yellow-400';

  if (current.type === 'SUBJECT' && current.iconName) {
      Icon = allSubjectIcons[current.iconName] || Folder;
      iconColor = current.color || 'text-yellow-400';
  }

  const extendedCurrent = {
      ...current,
      icon: Icon,
      iconColor: iconColor
  }

  return (
    <main className="flex-1 p-6 glass-card flex flex-col">
       <FileExplorerHeader currentFolder={extendedCurrent} ancestors={ancestors} onContentAdded={fetchFolderData} />
       <div className="relative flex-1">
          <FolderGrid parentId={id} onContentAdded={fetchFolderData} />
       </div>
    </main>
  );
}
