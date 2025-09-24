
'use server';
/**
 * @fileOverview A client-side utility for searching files.
 */
import type { Content } from '@/lib/contentService';


/**
 * Performs a case-insensitive search on an array of content items.
 * @param query The search query string.
 * @param items The array of Content items to search through.
 * @returns A promise that resolves to an array of matching Content items.
 */
export async function search(query: string, items: Content[]): Promise<Content[]> {
   if (!query) {
    return [];
  }
  const lowerCaseQuery = query.toLowerCase();
  
  // A simple client-side search implementation.
  return items.filter(item => item.name.toLowerCase().includes(lowerCaseQuery));
}
