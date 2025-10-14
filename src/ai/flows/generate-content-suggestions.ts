'use server';

/**
 * @fileOverview This flow generates content suggestions based on the URL.
 *
 * - generateContentSuggestions - A function that generates alternative content suggestions.
 * - GenerateContentSuggestionsInput - The input type for the generateContentSuggestions function.
 * - GenerateContentSuggestionsOutput - The return type for the generateContentSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateContentSuggestionsInputSchema = z.object({
  url: z.string().describe('The URL of the page the user is on.'),
});
export type GenerateContentSuggestionsInput = z.infer<typeof GenerateContentSuggestionsInputSchema>;

const GenerateContentSuggestionsOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('An array of content suggestions.'),
});
export type GenerateContentSuggestionsOutput = z.infer<typeof GenerateContentSuggestionsOutputSchema>;

export async function generateContentSuggestions(input: GenerateContentSuggestionsInput): Promise<GenerateContentSuggestionsOutput> {
  return generateContentSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateContentSuggestionsPrompt',
  input: {schema: GenerateContentSuggestionsInputSchema},
  output: {schema: GenerateContentSuggestionsOutputSchema},
  prompt: `You are an AI assistant helping users find relevant content when a file is deleted. Given the URL of the page they are on, suggest alternative actions or content that might be helpful.

URL: {{{url}}}

Suggestions:`,
});

const generateContentSuggestionsFlow = ai.defineFlow(
  {
    name: 'generateContentSuggestionsFlow',
    inputSchema: GenerateContentSuggestionsInputSchema,
    outputSchema: GenerateContentSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
