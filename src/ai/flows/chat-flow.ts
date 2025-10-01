'use server';
/**
 * @fileOverview An AI agent for chatting about document content.
 *
 * - chatAboutDocument - A function that answers questions about a document.
 * - ChatInput - The input type for the chatAboutDocument function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ChatInputSchema = z.object({
  question: z.string().describe('The question the user is asking about the document.'),
  documentContent: z.string().describe('The full text content of the document.'),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;


const chatPrompt = ai.definePrompt({
  name: 'chatPrompt',
  input: { schema: ChatInputSchema },
  prompt: `You are an expert medical teaching assistant. Your goal is to help a medical student understand a document.
  
You will be given the content of a document and a question from the user.
Answer the user's question based *only* on the provided document content.
If the answer is not in the document, say "I'm sorry, I can't find the answer to that in the provided document."

DOCUMENT CONTENT:
---
{{{documentContent}}}
---

USER'S QUESTION:
{{{question}}}
`,
});

const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    const { text } = await chatPrompt(input);
    return text;
  }
);


export async function chatAboutDocument(input: ChatInput): Promise<string> {
    return await chatFlow(input);
}
