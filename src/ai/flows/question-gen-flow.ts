'use server';
/**
 * @fileOverview AI flow for the Questions Creator feature.
 * This file implements a two-step process: text generation and then text-to-JSON conversion.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { reformatMarkdown } from './reformat-markdown-flow';

// --- Zod Schemas for input ---

const GenerateTextInputSchema = z.object({
  prompt: z.string().describe('The detailed instructions for the kind of text to generate (e.g., questions, exam).'),
  documentContent: z.string().describe('The text content extracted from the document.'),
});
export type GenerateTextInput = z.infer<typeof GenerateTextInputSchema>;

const ConvertQuestionsToJsonInputSchema = z.object({
  lectureName: z.string().describe('The name of the lecture for context.'),
  questionsText: z.string().describe('The text-based questions to be converted to JSON.'),
});
export type ConvertQuestionsToJsonInput = z.infer<typeof ConvertQuestionsToJsonInputSchema>;

const ConvertFlashcardsToJsonInputSchema = z.object({
    lectureName: z.string().describe('The name of the lecture for context.'),
    flashcardsText: z.string().describe('The text-based flashcards to be converted to JSON.'),
});
export type ConvertFlashcardsToJsonInput = z.infer<typeof ConvertFlashcardsToJsonInputSchema>;


// --- 1. Text Generation Flow ---

const generateTextPrompt = ai.definePrompt({
    name: 'generateTextPrompt',
    input: { schema: GenerateTextInputSchema },
    prompt: `
        You are an expert medical content creator. Based on the DOCUMENT CONTENT below, please fulfill the following TASK.
        
        TASK:
        {{{prompt}}}

        ---
        DOCUMENT CONTENT:
        {{{documentContent}}}
    `,
});

export async function generateText(input: GenerateTextInput): Promise<string> {
    try {
        const { text } = await generateTextPrompt(input);
        return text;
    } catch(e: any) {
        console.error("Error in generateText flow:", e);
        // Provide a more specific error message if available
        const message = e.cause?.message || e.message || 'The AI model failed to generate text.';
        throw new Error(message);
    }
}


// --- 2. JSON Conversion Flows ---

const MCQSchema = z.object({
  q: z.string().describe("The full question text."),
  o: z.array(z.string()).describe("An array of strings for options."),
  a: z.string().describe("The string of the correct option."),
});

const WrittenSubQuestionSchema = z.object({
  q: z.string().describe("The sub-question text."),
  a: z.string().describe("The answer text for the sub-question."),
});

const WrittenCaseSchema = z.object({
  case: z.string().describe("The clinical case description."),
  subqs: z.array(WrittenSubQuestionSchema),
});

const FlashcardSchema = z.object({
    id: z.string().describe("A unique identifier for the card (e.g., 'card-1')."),
    front: z.string().describe("The text for the front of the card."),
    back: z.string().describe("The text for the back of the card."),
});

const QuestionsOutputSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    mcqs_level_1: z.array(MCQSchema).optional(),
    mcqs_level_2: z.array(MCQSchema).optional(),
    written: z.array(WrittenCaseSchema).optional(),
});

const FlashcardsOutputSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    flashcards: z.array(FlashcardSchema).optional(),
});

const convertQuestionsToJsonPrompt = ai.definePrompt({
    name: 'convertQuestionsToJsonPrompt',
    input: { schema: ConvertQuestionsToJsonInputSchema },
    output: { schema: QuestionsOutputSchema },
    prompt: `
        You are a data conversion expert. Convert the following text, which contains medical questions, into a structured JSON object.
        The JSON object must conform to the specified output schema.
        Set the 'id' and 'name' of the JSON output to the provided lecture name.
        
        LECTURE NAME: {{{lectureName}}}

        TEXT TO CONVERT:
        {{{questionsText}}}
    `,
});

const convertFlashcardsToJsonPrompt = ai.definePrompt({
    name: 'convertFlashcardsToJsonPrompt',
    input: { schema: ConvertFlashcardsToJsonInputSchema },
    output: { schema: FlashcardsOutputSchema },
    prompt: `
        You are a data conversion expert. Convert the following text, which contains flashcards, into a structured JSON object.
        The JSON object must conform to the specified output schema. Each flashcard should have a unique 'id'.
        Set the 'id' and 'name' of the JSON output to the provided lecture name.
        
        LECTURE NAME: {{{lectureName}}}

        TEXT TO CONVERT:
        {{{flashcardsText}}}
    `,
});

export async function convertQuestionsToJson(input: ConvertQuestionsToJsonInput): Promise<object> {
    try {
        const { output } = await convertQuestionsToJsonPrompt(input);
        if (!output) {
            throw new Error("AI returned no output for JSON conversion.");
        }
        
        // Reformat markdown in written answers
        if (output.written) {
            for (const writtenCase of output.written) {
                if (writtenCase.subqs && Array.isArray(writtenCase.subqs)) {
                    for (const subq of writtenCase.subqs) {
                        if (subq.a) {
                            subq.a = await reformatMarkdown({ rawText: subq.a });
                        }
                    }
                }
            }
        }

        return output;
    } catch(e: any) {
        console.error("Error in convertQuestionsToJson flow:", e);
        const message = e.cause?.message || e.message || 'The AI model failed to convert questions to JSON.';
        throw new Error(message);
    }
}

export async function convertFlashcardsToJson(input: ConvertFlashcardsToJsonInput): Promise<object> {
    try {
        const { output } = await convertFlashcardsToJsonPrompt(input);
         if (!output) {
            throw new Error("AI returned no output for Flashcard JSON conversion.");
        }
        return output;
    } catch(e: any) {
        console.error("Error in convertFlashcardsToJson flow:", e);
        const message = e.cause?.message || e.message || 'The AI model failed to convert flashcards to JSON.';
        throw new Error(message);
    }
}
