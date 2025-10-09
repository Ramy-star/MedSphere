
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
    try {
        const { text } = await ai.generate({
            prompt: chatPrompt,
            input,
            stream: false,
            config: {
              // The signal needs to be passed in the config block for ai.generate
              // However, the prompt object itself might have a different way of handling it.
              // Let's try passing it here as per standard generate options.
            },
            ...options, // Pass the options object which may contain the signal
        });
        return text;
    } catch (error) {
        if ((error as any).name === 'AbortError') {
            console.log('Chat request was aborted.');
            // When aborted, we don't want to show an error, just stop.
            // Re-throwing the error to be handled by the UI.
        }
        // Re-throw other errors to be handled by the caller
        throw error;
    }
}
