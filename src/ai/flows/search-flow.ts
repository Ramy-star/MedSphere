
'use client';
import type { Content } from '@/lib/contentService';
import Fuse from 'fuse.js';

type SearchFilters = {
    type: 'all' | 'lecture' | 'quiz' | 'exam' | 'flashcard';
    level: string | 'all';
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
      { name: 'type', weight: 0.1 },
      { name: 'metadata.mime', weight: 0.2 },
    ],
    includeScore: true,
    threshold: 0.3,
    ignoreLocation: true,
  });
}

const itemTypeMap: Record<SearchFilters['type'], Content['type'] | null> = {
    all: null,
    lecture: 'FILE',
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

  // 1. Filter by Type first
  if (filters.type !== 'all') {
    const targetType = itemTypeMap[filters.type];
    if (targetType) {
        filteredItems = filteredItems.filter(item => item.type === targetType);
    }
  }

  // 2. Filter by Level (if a level is selected)
  if (filters.level !== 'all') {
    const levelId = filters.level;
    const descendantIds = new Set<string>();
    
    // Find all children and grandchildren of the selected level
    const queue: string[] = [levelId];
    
    while(queue.length > 0) {
        const currentId = queue.shift()!;
        const children = items.filter(item => item.parentId === currentId);
        for (const child of children) {
            descendantIds.add(child.id);
            if (child.type !== 'FILE') { // Don't traverse into files
                queue.push(child.id);
            }
        }
    }
    filteredItems = filteredItems.filter(item => descendantIds.has(item.id));
  }

  // 3. Filter out all folders
  let fileResults = filteredItems.filter(item => 
      item.type === 'FILE' || 
      item.type === 'LINK' || 
      item.type === 'INTERACTIVE_QUIZ' || 
      item.type === 'INTERACTIVE_EXAM' || 
      item.type === 'INTERACTIVE_FLASHCARD'
  );

  // 4. If there's a search query, perform fuzzy search on the final filtered items.
  if (query.trim()) {
    const fuseForFiltered = new Fuse(fileResults, {
      keys: fuse.options.keys,
      includeScore: true,
      threshold: 0.3,
      ignoreLocation: true,
    });
    return fuseForFiltered.search(query).map(result => result.item);
  }

  // 5. If no query, return the hard-filtered results, sorted by date.
  return fileResults.sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });
}


export async function search(query: string, items: Content[], filters: SearchFilters): Promise<Content[]> {
    return await searchFlow(query, items, filters);
}