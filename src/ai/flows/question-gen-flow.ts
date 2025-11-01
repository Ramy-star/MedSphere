'use server';
/**
 * @fileOverview AI flow for the Questions Creator feature.
 * This file implements separate flows for generating different types of educational content.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { reformatMarkdown } from './reformat-markdown-flow';

// --- Zod Schemas for input ---

const GenerateInputSchema = z.object({
  prompt: z.string().describe('The detailed instructions for the kind of text to generate.'),
  documentContent: z.string().describe('The text content extracted from the document.'),
});
export type GenerateInput = z.infer<typeof GenerateInputSchema>;


const ConvertInputSchema = z.object({
  lectureName: z.string().describe('The name of the lecture for context.'),
  text: z.string().describe('The text-based content to be converted to JSON.'),
});
export type ConvertInput = z.infer<typeof ConvertInputSchema>;


// --- 1. Text Generation Flows ---

const generatePrompt = ai.definePrompt({
    name: 'generateQuestionContentPrompt',
    input: { schema: GenerateInputSchema },
    prompt: `
        You are an expert medical content creator. Based on the DOCUMENT CONTENT below, please fulfill the following TASK.
        
        TASK:
        {{{prompt}}}

        ---
        DOCUMENT CONTENT:
        {{{documentContent}}}
    `,
});

async function runTextGeneration(input: GenerateInput): Promise<string> {
    try {
        const { text } = await generatePrompt(input);
        return text;
    } catch(e: any) {
        console.error("Error in text generation flow:", e);
        const message = e.cause?.message || e.message || 'The AI model failed to generate text.';
        throw new Error(message);
    }
}

export async function generateQuestionsText(input: GenerateInput): Promise<string> {
    return runTextGeneration(input);
}

export async function generateExamText(input: GenerateInput): Promise<string> {
    return runTextGeneration(input);
}

export async function generateFlashcardsText(input: GenerateInput): Promise<string> {
    return runTextGeneration(input);
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
    input: { schema: ConvertInputSchema },
    output: { schema: QuestionsOutputSchema },
    prompt: `
        You are a data conversion machine. Your ONLY job is to perform a direct, 1-to-1 conversion of the provided text into a JSON object.
        - **DO NOT** change, rephrase, add, or omit any content.
        - **DO NOT** create new questions or answers.
        - Your output MUST be ONLY the JSON object, perfectly matching the provided schema.
        - The 'id' and 'name' of the JSON output MUST be the provided lecture name.
        - Every question, option, and answer from the text MUST be present in the JSON.
        - The order of questions and options MUST be preserved exactly.

        **EXAMPLE INPUT TEXT:**
        Level 1 MCQs:
        1. What is the capital of France?
        a) Berlin
        b) Madrid
        c) Paris
        d) Rome
        e) London
        Answer: c) Paris

        2. What is 2 + 2?
        a) 3
        b) 4
        c) 5
        d) 6
        e) 7
        Answer: b) 4
        
        **EXAMPLE JSON OUTPUT for the input above:**
        {
          "id": "Example Lecture",
          "name": "Example Lecture",
          "mcqs_level_1": [
            {
              "q": "1. What is the capital of France?",
              "o": ["a) Berlin", "b) Madrid", "c) Paris", "d) Rome", "e) London"],
              "a": "c) Paris"
            },
            {
              "q": "2. What is 2 + 2?",
              "o": ["a) 3", "b) 4", "c) 5", "d) 6", "e) 7"],
              "a": "b) 4"
            }
          ]
        }

        ---
        LECTURE NAME: {{{lectureName}}}
        
        TEXT TO CONVERT:
        {{{text}}}
    `,
});


const convertFlashcardsToJsonPrompt = ai.definePrompt({
    name: 'convertFlashcardsToJsonPrompt',
    input: { schema: ConvertInputSchema },
    output: { schema: FlashcardsOutputSchema },
    prompt: `
        You are a data conversion expert. Convert the following text, which contains flashcards, into a structured JSON object.
        The JSON object must conform to the specified output schema. Each flashcard should have a unique 'id'.
        Set the 'id' and 'name' of the JSON output to the provided lecture name.
        
        LECTURE NAME: {{{lectureName}}}

        TEXT TO CONVERT:
        {{{text}}}
    `,
});

export async function convertQuestionsToJson(input: ConvertInput): Promise<object> {
    try {
        const { output } = await convertQuestionsToJsonPrompt(input);
        if (!output) {
            throw new Error("AI returned no output for JSON conversion.");
        }
        
        // Reformat markdown in answers for written questions
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

export async function convertFlashcardsToJson(input: ConvertInput): Promise<object> {
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
