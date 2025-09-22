'use server';
/**
 * @fileOverview A flow for searching files.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { contentService, Content } from '@/lib/contentService';

const SearchInputSchema = z.object({
  query: z.string(),
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

async function searchFiles(input: SearchInput): Promise<SearchOutput> {
  const { query } = input;
  const allFilesData = await contentService.getAll();
  
  if (!query) {
    return allFilesData.filter(item => item.type === 'FILE');
  }

  const lowerCaseQuery = query.toLowerCase();
  
  const searchResults = allFilesData.filter(file => 
    file.name.toLowerCase().includes(lowerCaseQuery)
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
