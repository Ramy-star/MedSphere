'use server';
/**
 * @fileOverview A flow for searching files.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { folderData, File } from '@/lib/file-data';

const allFilesData = folderData.flatMap(f => f.files);

const SearchInputSchema = z.object({
  query: z.string(),
});

const SearchOutputSchema = z.array(
  z.object({
    name: z.string(),
    size: z.string(),
    date: z.string(),
  })
);

type SearchInput = z.infer<typeof SearchInputSchema>;
type SearchOutput = z.infer<typeof SearchOutputSchema>;

async function searchFiles(input: SearchInput): Promise<SearchOutput> {
  const { query } = input;
  if (!query) {
    return allFilesData;
  }
  const lowerCaseQuery = query.toLowerCase();
  
  const searchResults = allFilesData.filter(file => 
    file.name.toLowerCase().includes(lowerCaseQuery) ||
    file.size.toLowerCase().includes(lowerCaseQuery) ||
    file.date.toLowerCase().includes(lowerCaseQuery)
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

export async function search(query: string): Promise<SearchOutput> {
  return await searchFlow({ query });
}
