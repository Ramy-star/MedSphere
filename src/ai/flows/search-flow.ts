
'use client';
import type { Content } from '@/lib/contentService';
import Fuse from 'fuse.js';
import { DateRange } from 'react-day-picker';

type SearchFilters = {
    type: 'all' | 'file' | 'folder' | 'link' | 'quiz' | 'exam' | 'flashcard';
    subject: string | 'all';
    dateRange?: DateRange;
};

let fuse: Fuse<Content> | null = null;
let allItemsCache: Content[] = [];

/**
 * Initializes the Fuse.js instance with the provided items.
 */
function initializeFuse(items: Content[]) {
  if (items === allItemsCache && fuse) {
    return;
  }
  
  allItemsCache = items;
  fuse = new Fuse(items, {
    keys: [
      { name: 'name', weight: 0.7 },
      { name: 'type', weight: 0.3 },
      { name: 'metadata.mime', weight: 0.2 },
    ],
    includeScore: true,
    threshold: 0.3,
    ignoreLocation: true,
  });
}

const itemTypeMap: Record<SearchFilters['type'], Content['type'] | null> = {
    all: null,
    file: 'FILE',
    folder: 'FOLDER',
    link: 'LINK',
    quiz: 'INTERACTIVE_QUIZ',
    exam: 'INTERACTIVE_EXAM',
    flashcard: 'INTERACTIVE_FLASHCARD',
};

/**
 * Performs a filtered and fuzzy search on content items.
 * @param query The search query string.
 * @param items The array of Content items to search through.
 * @param filters The filters to apply to the search.
 * @returns A promise that resolves to an array of matching Content items.
 */
async function searchFlow(query: string, items: Content[], filters: SearchFilters): Promise<Content[]> {
  initializeFuse(items);
  if (!fuse) return [];

  let filteredItems = items;

  // 1. Apply hard filters (type, subject, date)
  if (filters.type !== 'all') {
    const targetType = itemTypeMap[filters.type];
    if (targetType) {
        if (targetType === 'FOLDER') {
            // Include all folder-like types
            filteredItems = filteredItems.filter(item => ['FOLDER', 'SUBJECT', 'SEMESTER', 'LEVEL'].includes(item.type));
        } else {
            filteredItems = filteredItems.filter(item => item.type === targetType);
        }
    }
  }

  if (filters.dateRange?.from) {
      filteredItems = filteredItems.filter(item => {
          if (!item.createdAt) return false;
          const itemDate = new Date(item.createdAt);
          const fromDate = filters.dateRange!.from!;
          const toDate = filters.dateRange!.to;
          if (toDate) {
              return itemDate >= fromDate && itemDate <= toDate;
          }
          return itemDate.toDateString() === fromDate.toDateString();
      });
  }

  // If a subject is selected, we need to find all descendants of that subject folder
  if (filters.subject !== 'all') {
    const subjectId = filters.subject;
    const descendantIds = new Set<string>();
    const queue: string[] = [subjectId];
    descendantIds.add(subjectId);

    while (queue.length > 0) {
        const currentId = queue.shift()!;
        const children = items.filter(item => item.parentId === currentId);
        for (const child of children) {
            if (!descendantIds.has(child.id)) {
                descendantIds.add(child.id);
                queue.push(child.id);
            }
        }
    }
    filteredItems = filteredItems.filter(item => descendantIds.has(item.id));
  }


  // 2. If there's a search query, perform fuzzy search on the already filtered items.
  if (query.trim()) {
    const fuseForFiltered = new Fuse(filteredItems, {
      keys: fuse.options.keys,
      includeScore: true,
      threshold: 0.3,
      ignoreLocation: true,
    });
    return fuseForFiltered.search(query).map(result => result.item);
  }

  // 3. If no query, return the hard-filtered results, sorted by date.
  return filteredItems.sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });
}


export async function search(query: string, items: Content[], filters: SearchFilters): Promise<Content[]> {
    return await searchFlow(query, items, filters);
}
