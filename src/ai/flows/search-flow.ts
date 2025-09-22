'use server';
/**
 * @fileOverview A flow for searching files.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { contentService, Content } from '@/lib/contentService';

const SearchInputSchema = z.object({
  query: z.string(),
  items: z.array(z.any()), // Pass items to be searched
});

const SearchOutputSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    parentId: z.string().nullable(),
    metadata: z.any().optional(),
    createdAt: z.string().optional(),
    iconName: z.string().optional(),
    color: z.string().optional(),
  })
);

type SearchInput = z.infer<typeof SearchInputSchema>;
type SearchOutput = z.infer<typeof SearchOutputSchema>;

// This function now just filters a given array
async function searchFiles(input: SearchInput): Promise<SearchOutput> {
  const { query, items } = input;
  
  if (!query) {
    // Return nothing if query is empty, the client can decide what to show.
    return [];
  }

  const lowerCaseQuery = query.toLowerCase();
  
  const searchResults = items.filter(item => 
    item.name.toLowerCase().includes(lowerCaseQuery)
  );
  
  return searchResults;
}

const searchFlow = ai.defineFlow(
  {
    name: 'searchFlow',
    inputSchema: SearchInputSchema,
    outputSchema: SearchOutputSchema,
  },
  searchFiles
);

// The exported function is now for client-side use primarily
export async function search(query: string, items: Content[]): Promise<SearchOutput> {
   if (!query) {
    return [];
  }
  const lowerCaseQuery = query.toLowerCase();
  return items.filter(item => item.name.toLowerCase().includes(lowerCaseQuery));
}
