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
  hasQuestions: z.boolean().optional().describe('Whether the context includes a set of questions.'),
  questionsContent: z.string().optional().describe('The content of the questions file, if available.'),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;


const chatPrompt = ai.definePrompt({
  name: 'chatPrompt',
  input: { schema: ChatInputSchema },
  prompt: chatPromptText,
});

const isRetriableError = (error: any): boolean => {
    const errorMessage = error.message?.toLowerCase() || '';
    const retriableStrings = ['500', '503', '504', 'overloaded', 'timed out', 'service unavailable', 'deadline exceeded'];
    return retriableStrings.some(s => errorMessage.includes(s));
};

export async function chatAboutDocument(
  input: ChatInput,
  options?: { signal?: AbortSignal }
): Promise<string> {
  
  const maxRetries = 3;
  let delay = 1000; // start with 1 second

  for (let i = 0; i < maxRetries; i++) {
    try {
      // Use the original input for all attempts
      const { text } = await chatPrompt(input, {
        config: {
          signal: options?.signal,
        },
      });
      return text;
    } catch (error: any) {
      // Check for AbortError first, and re-throw immediately if found.
      if (error.name === 'AbortError') {
        console.log('Chat request was aborted by the user.');
        throw error; // Re-throw to be handled by the UI.
      }
      
      // If it's the last retry or not a retriable error, throw the error.
      if (i === maxRetries - 1 || !isRetriableError(error)) {
        console.error("Final attempt failed or non-retriable error:", error);
        throw error;
      }
      
      // Log the retry attempt.
      console.log(`Attempt ${i + 1} failed. Retrying in ${delay}ms...`);
      
      // Wait for the specified delay.
      await new Promise(res => setTimeout(res, delay));
      
      // Double the delay for the next attempt (exponential backoff).
      delay *= 2;
    }
  }

  // This part should not be reachable, but is included for type safety.
  throw new Error('Chat failed after multiple retries.');
}

    