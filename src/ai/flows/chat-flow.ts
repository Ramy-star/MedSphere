
'use server';
/**
 * @fileOverview An AI agent for chatting about document content.
 *
 * - chatAboutDocument - A function that answers questions about a document.
 * - ChatInput - The input type for the chatAboutDocument function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { chatPromptText } from '../prompts/chat-prompt';

const ChatHistoryMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  text: z.string(),
});

const ChatInputSchema = z.object({
  question: z.string().describe('The question the user is asking about the document.'),
  documentContent: z.string().describe('The full text content of the document.'),
  chatHistory: z.array(ChatHistoryMessageSchema).describe('The history of the conversation so far.'),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;


const chatPrompt = ai.definePrompt({
  name: 'chatPrompt',
  input: { schema: ChatInputSchema },
  prompt: chatPromptText,
});

export async function chatAboutDocument(input: ChatInput, options?: { signal?: AbortSignal }): Promise<string> {
    const controller = new AbortController();
    const signal = controller.signal;
    options?.signal?.addEventListener('abort', () => controller.abort());

    try {
        const { text } = await chatPrompt(input, { custom: { signal } });
        return text;
    } catch (error) {
        if ((error as any).name === 'AbortError') {
            console.log('Chat request was aborted.');
        }
        // Re-throw the error to be handled by the caller
        throw error;
    }
}
