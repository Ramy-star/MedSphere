// src/ai/flows/suggest-medical-study-tags.ts
'use server';
/**
 * @fileOverview This file defines a Genkit flow for suggesting relevant tags for medical study files using AI.
 *
 * - suggestMedicalStudyTags - A function that accepts medical study file content and suggests relevant tags.
 * - SuggestMedicalStudyTagsInput - The input type for the suggestMedicalStudyTags function.
 * - SuggestMedicalStudyTagsOutput - The return type for the suggestMedicalStudyTags function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestMedicalStudyTagsInputSchema = z.object({
  fileContent: z.string().describe('The content of the medical study file.'),
});
export type SuggestMedicalStudyTagsInput = z.infer<typeof SuggestMedicalStudyTagsInputSchema>;

const SuggestMedicalStudyTagsOutputSchema = z.object({
  tags: z.array(z.string()).describe('An array of suggested tags for the medical study file.'),
});
export type SuggestMedicalStudyTagsOutput = z.infer<typeof SuggestMedicalStudyTagsOutputSchema>;

export async function suggestMedicalStudyTags(input: SuggestMedicalStudyTagsInput): Promise<SuggestMedicalStudyTagsOutput> {
  return suggestMedicalStudyTagsFlow(input);
}

const suggestMedicalStudyTagsPrompt = ai.definePrompt({
  name: 'suggestMedicalStudyTagsPrompt',
  input: {schema: SuggestMedicalStudyTagsInputSchema},
  output: {schema: SuggestMedicalStudyTagsOutputSchema},
  prompt: `You are an expert in medical study categorization. Given the content of a medical study file, suggest relevant tags to categorize it.

File Content: {{{fileContent}}}

Suggest at least 5 relevant tags:`, 
});

const suggestMedicalStudyTagsFlow = ai.defineFlow(
  {
    name: 'suggestMedicalStudyTagsFlow',
    inputSchema: SuggestMedicalStudyTagsInputSchema,
    outputSchema: SuggestMedicalStudyTagsOutputSchema,
  },
  async input => {
    const {output} = await suggestMedicalStudyTagsPrompt(input);
    return output!;
  }
);
