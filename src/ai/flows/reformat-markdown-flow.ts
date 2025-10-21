
'use server';
/**
 * @fileOverview An AI flow for re-formatting text into well-structured Markdown.
 *
 * - reformatMarkdown - A function that takes a string of text and reformats it.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { chatPromptText } from '../prompts/chat-prompt'; // Re-using the detailed formatting rules

const ReformatInputSchema = z.object({
  rawText: z.string().describe('The raw text content that needs re-formatting.'),
});

const ReformatOutputSchema = z.object({
    formattedText: z.string().describe('The beautifully formatted Markdown text.'),
});


const reformatPrompt = ai.definePrompt({
  name: 'reformatMarkdownPrompt',
  input: { schema: ReformatInputSchema },
  // Although we expect markdown, we will treat it as a string for simplicity.
  // The prompt is strong enough to enforce the markdown structure.
  prompt: `
    You are an expert text formatter. Your ONLY job is to take the following text and reformat it into perfect, clean Markdown based on the detailed formatting rules provided below.
    Do not add any new content, do not answer any questions, just re-apply the formatting.
    The final output should be ONLY the formatted text and nothing else.

    ## START OF FORMATTING RULES
    ${chatPromptText}
    ## END OF FORMATTING RULES

    ## TEXT TO REFORMAT
    {{{rawText}}}
  `,
});


export async function reformatMarkdown(input: z.infer<typeof ReformatInputSchema>): Promise<string> {
    try {
        const { text } = await reformatPrompt(input);
        return text;
    } catch (error) {
        console.error("Error during markdown reformatting:", error);
        // In case of an error, return the original text to avoid breaking the save functionality
        return input.rawText;
    }
}
