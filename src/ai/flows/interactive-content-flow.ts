'use server';
/**
 * @fileOverview An AI agent for creating interactive learning content like quizzes.
 *
 * - generateInteractiveContent - A function that creates quizzes based on document content.
 * - InteractiveContentInput - The input type for the function.
 * - InteractiveContentOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Schema for a single quiz question
const QuizQuestionSchema = z.object({
  questionText: z.string().describe('The text of the multiple-choice question.'),
  options: z.array(z.string()).describe('An array of possible answers.'),
  correctAnswerIndex: z.number().describe('The 0-based index of the correct answer in the options array.'),
  explanation: z.string().describe('A brief explanation of why the correct answer is right.'),
});

// Schema for the entire quiz
const QuizSchema = z.object({
  contentType: z.literal('quiz').describe("The type of content, must be 'quiz'."),
  questions: z.array(QuizQuestionSchema).describe('An array of quiz questions.'),
});

// Input schema for the flow
export const InteractiveContentInputSchema = z.object({
  documentContent: z.string().describe('The text content of the document to base the content on.'),
  request: z.string().describe("The user's request, e.g., 'create a 5-question quiz'"),
});
export type InteractiveContentInput = z.infer<typeof InteractiveContentInputSchema>;

// The final output can be a quiz (more types like flashcards can be added later)
export const InteractiveContentOutputSchema = QuizSchema;
export type InteractiveContentOutput = z.infer<typeof InteractiveContentOutputSchema>;


const interactiveContentPrompt = ai.definePrompt({
  name: 'interactiveContentPrompt',
  input: { schema: InteractiveContentInputSchema },
  output: { schema: InteractiveContentOutputSchema },
  prompt: `You are an expert medical educator. Based on the provided document content, fulfill the user's request.
The user wants you to generate interactive learning content.

Your response MUST be a valid JSON object that strictly adheres to the requested output schema.

DOCUMENT CONTENT:
---
{{{documentContent}}}
---

USER REQUEST:
---
{{{request}}}
---
`,
});


export async function generateInteractiveContent(
  input: InteractiveContentInput,
  options?: { signal?: AbortSignal }
): Promise<InteractiveContentOutput> {
  try {
    const { output } = await interactiveContentPrompt(input, {
      config: {
        signal: options?.signal,
      },
    });
    if (!output) {
      throw new Error('The AI model did not return the expected output format.');
    }
    return output;
  } catch (error) {
    if ((error as any).name === 'AbortError') {
      console.log('Interactive content generation was aborted.');
    }
    throw error;
  }
}
