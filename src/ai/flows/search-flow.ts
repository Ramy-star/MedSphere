
'use server';
/**
 * @fileOverview A client-side utility for searching files using Fuse.js for fuzzy search.
 */
import type { Content } from '@/lib/contentService';
import Fuse from 'fuse.js';

let fuse: Fuse<Content> | null = null;
let allItemsCache: Content[] = [];

/**
 * Initializes the Fuse.js instance with the provided items.
 * This should be called whenever the master list of items changes.
 * @param items The array of Content items to build the search index from.
 */
function initializeFuse(items: Content[]) {
  // Only re-initialize if the items have actually changed.
  if (items === allItemsCache) {
    return;
  }
  
  allItemsCache = items;
  fuse = new Fuse(items, {
    keys: [
      { name: 'name', weight: 0.7 }, // Give more weight to the name
      { name: 'type', weight: 0.3 }  // Less weight to the type
    ],
    includeScore: true,
    threshold: 0.2, // Keep a reasonably strict threshold for the fuzzy search
    ignoreLocation: true,
  });
}

/**
 * Performs a fuzzy search on an array of content items using Fuse.js.
 * It now prioritizes fuzzy matches over direct "includes" matches.
 * @param query The search query string.
 * @param items The array of Content items to search through.
 * @returns A promise that resolves to an array of matching Content items, sorted by relevance.
 */
async function searchFlow(query: string, items: Content[]): Promise<Content[]> {
  if (!query) {
    return [];
  }

  // Ensure Fuse is initialized with the latest items
  initializeFuse(items);
  
  if (!fuse) {
      return [];
  }
  
  const lowerCaseQuery = query.toLowerCase();

  // Step 1: Perform fuzzy search first.
  const fuzzyResults = fuse.search(query);
  const fuzzyMatches = fuzzyResults.map(result => result.item);
  
  // Step 2: If there are fuzzy matches, return them as the primary result.
  if (fuzzyMatches.length > 0) {
    return fuzzyMatches;
  }

  // Step 3: If no fuzzy matches, fall back to simple substring matching as a last resort.
  const directMatches = items.filter(item => 
    item.name.toLowerCase().includes(lowerCaseQuery)
  );

  return directMatches;
}


export async function search(query: string, items: Content[]): Promise<Content[]> {
    return await searchFlow(query, items);
}
