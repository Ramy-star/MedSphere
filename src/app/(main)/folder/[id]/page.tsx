
'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { FolderGrid } from '@/components/FolderGrid';
import FileExplorerHeader from '@/components/FileExplorerHeader';
import { contentService, ContentItem } from '@/lib/contentService';
import { allSubjects } from '@/lib/file-data';

async function getAncestors(id: string): Promise<ContentItem[]> {
    let ancestors: ContentItem[] = [];
    if (id === 'root') return [];

    let current = await contentService.getById(id);
    
    while (current && current.id !== 'root') {
        ancestors.unshift(current);
        if (current.parentId) {
            current = await contentService.getById(current.parentId);
        } else {
            // Check if this is a subject root folder
            const subjectRootPrefix = 'subject-root-';
            if (current.id.startsWith(subjectRootPrefix)) {
                const subjectId = current.id.substring(subjectRootPrefix.length);
                const [subjectName, semesterName] = subjectId.split('-');
                const subject = allSubjects.find(s => s.name.replace(/\s+/g, '') === subjectName && s.semester.replace(/\s+/g, '') === semesterName);
                if (subject) {
                    // Manually construct the breadcrumbs for subjects
                    ancestors.unshift({ id: 'level', name: subject.level, type: 'LINK' });
                    ancestors.unshift({ id: 'semester', name: subject.semester, type: 'LINK' });
                    ancestors.unshift({ id: 'subject', name: subject.name, type: 'LINK' });
                }

            }
            break;
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
