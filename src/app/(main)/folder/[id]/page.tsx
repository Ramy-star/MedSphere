
'use client';

import { useEffect, useState, useCallback, Suspense, use } from 'react';
import { FolderGrid } from '@/components/FolderGrid';
import FileExplorerHeader from '@/components/FileExplorerHeader';
import { contentService, Content } from '@/lib/contentService';
import { allSubjectIcons } from '@/lib/file-data';
import { notFound } from 'next/navigation';
import { LucideIcon, Folder, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';


function FolderPageContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [current, setCurrent] = useState<Content | null>(null);
  const [ancestors, setAncestors] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFolderData = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedCurrent = await contentService.getById(id);

      if (!fetchedCurrent) {
        notFound();
        return;
      }

      setCurrent(fetchedCurrent);
      
      const fetchedAncestors = await contentService.getAncestors(id);
      setAncestors(fetchedAncestors);
    } catch (error) {
      console.error("Failed to fetch folder data", error);
      notFound();
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchFolderData();
  }, [fetchFolderData]);
  
  if (loading) {
      return <main className="flex-1 p-4 md:p-6 glass-card flex flex-col h-full overflow-hidden">
        <div className="mb-6 space-y-4">
            <Skeleton className="h-5 w-1/3" />
            <div className="flex items-center justify-between min-h-[40px]">
                <div className="flex items-center gap-4">
                    <Skeleton className="w-10 h-10 rounded-lg" />
                    <Skeleton className="h-8 w-48" />
                </div>
            </div>
        </div>
        <div className="relative flex-1 overflow-y-auto mt-4 pr-2 -mr-2 space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
        </div>
      </main>
  }

  if (!current) {
      // This should ideally not be reached if loading is false and fetch was successful.
      // But as a fallback, we can either show notFound or a specific error message.
      notFound();
  }

  let Icon: LucideIcon = Folder;
  let iconColor = 'text-yellow-400';

  if (current.type === 'SUBJECT' && current.iconName) {
      Icon = allSubjectIcons[current.iconName] || Folder;
      iconColor = current.color || 'text-yellow-400';
  } else if (current.type === 'SEMESTER') {
      Icon = Calendar;
      iconColor = 'text-green-400';
  }


  const extendedCurrent = {
      ...current,
      icon: Icon,
      iconColor: iconColor
  }

  return (
    <main className="flex-1 p-4 md:p-6 glass-card flex flex-col h-full overflow-hidden">
       <FileExplorerHeader currentFolder={extendedCurrent} ancestors={ancestors} onContentAdded={fetchFolderData} />
       <div className="relative flex-1 overflow-y-auto mt-4 pr-2 -mr-2">
          <FolderGrid parentId={id} onContentAdded={fetchFolderData} />
       </div>
    </main>
  );
}


export default function FolderPage({ params }: { params: Promise<{ id: string }> }) {
  // Use a Suspense boundary to handle client-side rendering issues
  return (
    <Suspense fallback={
        <main className="flex-1 p-4 md:p-6 glass-card flex flex-col h-full overflow-hidden">
            <div className="mb-6 space-y-4">
                <Skeleton className="h-5 w-1/3" />
                <div className="flex items-center justify-between min-h-[40px]">
                    <div className="flex items-center gap-4">
                        <Skeleton className="w-10 h-10 rounded-lg" />
                        <Skeleton className="h-8 w-48" />
                    </div>
                </div>
            </div>
            <div className="relative flex-1 overflow-y-auto mt-4 pr-2 -mr-2 space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
            </div>
        </main>
    }>
      <FolderPageContent params={params} />
    </Suspense>
  )
}
