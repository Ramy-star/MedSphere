
'use server';
/**
 * @fileOverview AI flow for the Questions Creator feature using a tool-based approach.
 *
 * - generateQuestions - A single flow that generates questions, exams, and flashcards
 *   in a structured format directly using AI model tools.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { reformatMarkdown } from './reformat-markdown-flow';
import type { Lecture } from '@/lib/types';
import { googleAI } from '@genkit-ai/google-genai';

// --- Zod Schemas for Structured Output ---

const MCQSchema = z.object({
  q: z.string().describe("The full question text, including the number if applicable."),
  o: z.array(z.string()).describe("An array of strings, each representing one option."),
  a: z.string().describe("The string of the correct option."),
});

const WrittenSubQuestionSchema = z.object({
  q: z.string().describe("The sub-question text."),
  a: z.string().describe("The answer text for the sub-question. Preserve any HTML tags if they exist in the source."),
});

const WrittenCaseSchema = z.object({
  case: z.string().describe("The full text of the clinical case description."),
  subqs: z.array(WrittenSubQuestionSchema),
});

const FlashcardSchema = z.object({
  id: z.string().describe("A unique text identifier for the card (e.g., 'card-1')."),
  front: z.string().describe("The full text for the front of the card (the question)."),
  back: z.string().describe("The full text for the back of the card (the answer)."),
});


// --- Tool Definition ---

const processLectureContentTool = ai.defineTool(
  {
    name: 'processLectureContent',
    description: 'Processes the generated educational content and structures it into questions, exams, and flashcards.',
    inputSchema: z.object({
        mcqs_level_1: z.array(MCQSchema).optional().describe("Array of Level 1 multiple-choice questions."),
        mcqs_level_2: z.array(MCQSchema).optional().describe("Array of Level 2 multiple-choice questions."),
        written: z.array(WrittenCaseSchema).optional().describe("Array of written clinical cases with sub-questions."),
        flashcards: z.array(FlashcardSchema).optional().describe("Array of flashcards."),
    }),
    outputSchema: z.void(),
  },
  async (data) => {
    // This tool's purpose is purely for structuring the output.
    // The actual data is extracted from the tool call in the flow.
  }
);


// --- Main Generation Flow ---

const GenerateQuestionsInputSchema = z.object({
  documentContent: z.string().describe('The text content extracted from the uploaded document.'),
  images: z.array(z.string()).optional().describe("A list of images from the document, as Base64 data URIs."),
  lectureName: z.string().describe("The name of the lecture, e.g., 'L1 Blood'."),
  generationOptions: z.object({
    generateQuestions: z.boolean(),
    generateExam: z.boolean(),
    generateFlashcards: z.boolean(),
  }),
  prompts: z.object({
    gen: z.string(),
    examGen: z.string(),
    flashcardGen: z.string(),
  }),
});
export type GenerateQuestionsInput = z.infer<typeof GenerateQuestionsInputSchema>;

export type GeneratedQuestionData = {
    textQuestions: string;
    jsonQuestions: any;
    textExam: string;
    jsonExam: any;
    textFlashcard: string;
    jsonFlashcard: any;
};

const generateQuestionsPrompt = ai.definePrompt({
    name: 'generateQuestionsPrompt',
    input: { schema: GenerateQuestionsInputSchema },
    tools: [processLectureContentTool],
    prompt: `
        You are an expert at creating educational material from medical documents.
        Your task is to generate content based on the user's request and the provided document.
        Use the 'processLectureContent' tool to structure all the generated content. You must call this tool exactly once with all generated content.

        DOCUMENT CONTENT (TEXT):
        {{{documentContent}}}

        {{#if images.length}}
        DOCUMENT CONTENT (IMAGES):
        {{#each images}}
          {{media url=this}}
        {{/each}}
        {{/if}}

        ---

        GENERATION TASKS:

        {{#if generationOptions.generateQuestions}}
        1.  **QUESTIONS:**
            - **Instructions:** {{{prompts.gen}}}
            - **Output:** Generate MCQs (Level 1 & 2) and Written Questions based on these instructions. Structure the output using the 'mcqs_level_1', 'mcqs_level_2', and 'written' fields in the 'processLectureContent' tool.
        {{/if}}

        {{#if generationOptions.generateExam}}
        2.  **EXAM:**
            - **Instructions:** {{{prompts.examGen}}}
            - **Output:** Generate exam-style MCQs based on these instructions. For simplicity, place them all in the 'mcqs_level_1' field of the tool. If you are also generating regular questions, just add these to the same list.
        {{/if}}

        {{#if generationOptions.generateFlashcards}}
        3.  **FLASHCARDS:**
            - **Instructions:** {{{prompts.flashcardGen}}}
            - **Output:** Generate flashcards based on these instructions. Structure the output using the 'flashcards' field in the 'processLectureContent' tool.
        {{/if}}

        ---
        Final instruction: Call the 'processLectureContent' tool with all the generated content.
    `,
});

export async function generateQuestions(input: GenerateQuestionsInput): Promise<GeneratedQuestionData> {
    
    try {
        const { output } = await ai.generate({
          model: googleAI('gemini-pro'), // Explicitly use gemini-pro for tool calling
          prompt: await generateQuestionsPrompt.render(input),
          tools: [processLectureContentTool],
        });
        
        const toolCall = output.toolCalls?.[0];

        if (!toolCall || toolCall.name !== 'processLectureContent') {
            throw new Error("AI failed to generate structured content using the required tool.");
        }
        
        const toolInput = toolCall.input;
        const lectureId = input.lectureName.toLowerCase().replace(/\s+/g, '-').slice(0, 50);

        const generatedData: GeneratedQuestionData = {
            textQuestions: '',
            jsonQuestions: {},
            textExam: '',
            jsonExam: {},
            textFlashcard: '',
            jsonFlashcard: {},
        };

        // Process and Reformat Questions/Exams
        if (input.generationOptions.generateQuestions || input.generationOptions.generateExam) {
            const lectureJson: Partial<Lecture> = {
                id: lectureId,
                name: input.lectureName,
            };

            if (toolInput.mcqs_level_1) lectureJson.mcqs_level_1 = toolInput.mcqs_level_1;
            if (toolInput.mcqs_level_2) lectureJson.mcqs_level_2 = toolInput.mcqs_level_2;
            if (toolInput.written) {
                for (const writtenCase of toolInput.written) {
                    if (writtenCase.subqs && Array.isArray(writtenCase.subqs)) {
                        for (const subq of writtenCase.subqs) {
                            if (subq.a) {
                                subq.a = await reformatMarkdown({ rawText: subq.a });
                            }
                        }
                    }
                }
                lectureJson.written = toolInput.written;
            }

            generatedData.jsonQuestions = lectureJson; // Store as a single object for both
            generatedData.jsonExam = lectureJson;      // This simplifies the client logic

            // Generate text representations
            let questionsText = '';
            if (lectureJson.mcqs_level_1?.length) {
                questionsText += 'MCQs Level 1:\n' + lectureJson.mcqs_level_1.map(q => `${q.q}\n${q.o.join('\n')}\nAnswer: ${q.a}`).join('\n\n');
            }
            if (lectureJson.mcqs_level_2?.length) {
                questionsText += '\n\nMCQs Level 2:\n' + lectureJson.mcqs_level_2.map(q => `${q.q}\n${q.o.join('\n')}\nAnswer: ${q.a}`).join('\n\n');
            }
            if (lectureJson.written?.length) {
                questionsText += '\n\nWritten Cases:\n' + lectureJson.written.map(c => `Case: ${c.case}\n` + c.subqs.map(s => `${s.q}\nAnswer: ${s.a}`).join('\n')).join('\n\n');
            }
            generatedData.textQuestions = questionsText;
            generatedData.textExam = questionsText; // Same text for both
        }
        
        // Process Flashcards
        if (input.generationOptions.generateFlashcards && toolInput.flashcards) {
            const flashcardJson = {
                id: lectureId,
                name: input.lectureName,
                flashcards: toolInput.flashcards,
            };
            generatedData.jsonFlashcard = flashcardJson;
            generatedData.textFlashcard = toolInput.flashcards.map((f: Flashcard) => `Front: ${f.front}\nBack: ${f.back}`).join('\n\n');
        }
        
        return generatedData;
    } catch (error: any) {
        console.error("Error in generateQuestions flow:", error);
        
        // Check for specific non-retriable errors from the GenAI service
        if (error.message && (error.message.includes('400 Bad Request') || error.message.includes('INVALID_ARGUMENT'))) {
            throw new Error(`The AI model rejected the request due to invalid input. This might be due to the document's content or length. Details: ${error.message}`);
        }
        
        // Re-throw other errors to be handled by the client
        throw error;
    }
}
