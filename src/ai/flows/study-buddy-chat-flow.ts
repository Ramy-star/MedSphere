
'use server';
/**
 * @fileOverview An AI flow to answer questions from the AI Study Buddy.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const UserStatsSchema = z.object({
    displayName: z.string().optional(),
    username: z.string(),
    filesUploaded: z.number().optional().default(0),
    foldersCreated: z.number().optional().default(0),
    examsCompleted: z.number().optional().default(0),
    aiQueries: z.number().optional().default(0),
    favoritesCount: z.number().default(0),
}).describe("A summary of the user's statistics and activity.");

const ChatInputSchema = z.object({
    userStats: UserStatsSchema,
    question: z.string().describe("The specific question the user asked the study buddy."),
});

const studyBuddyChatPrompt = ai.definePrompt({
    name: 'studyBuddyChatPrompt',
    input: { schema: ChatInputSchema },
    prompt: `
        You are a friendly and encouraging AI Study Buddy for a medical student.
        You will receive the user's stats and a specific question they've asked.
        Provide a helpful, concise, and motivating answer to their question.

        USER'S STATS:
        - Name: {{{userStats.displayName}}}
        - Files Uploaded: {{{userStats.filesUploaded}}}
        - Folders Created: {{{userStats.foldersCreated}}}
        - Exams Completed: {{{userStats.examsCompleted}}}
        - AI Queries: {{{userStats.aiQueries}}}
        - Favorites: {{{userStats.favoritesCount}}}

        USER'S QUESTION:
        "{{{question}}}"

        Your response should be a friendly, paragraph-style answer.
        - If they ask for a summary, give them a brief overview of their activity.
        - If they ask what to study next, make a gentle suggestion based on their stats (e.g., if they have low exam completions, suggest taking an exam).
        - Keep the tone supportive and conversational.
    `,
});

export async function answerStudyBuddyQuery(input: z.infer<typeof ChatInputSchema>): Promise<string> {
    try {
        const { text } = await studyBuddyChatPrompt(input);
        return text;
    } catch (error) {
        console.error("Error answering study buddy query:", error);
        return "I'm sorry, I had trouble processing that request. Please try asking again in a moment.";
    }
}
