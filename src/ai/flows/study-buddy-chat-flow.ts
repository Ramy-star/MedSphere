
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

const ChatHistoryMessage = z.object({
  role: z.enum(['user', 'model']),
  text: z.string(),
});

const ChatInputSchema = z.object({
    userStats: UserStatsSchema,
    question: z.string().describe("The specific question the user asked the study buddy."),
    chatHistory: z.array(ChatHistoryMessage).optional().describe('The history of the conversation so far.'),
});

const studyBuddyChatPrompt = ai.definePrompt({
    name: 'studyBuddyChatPrompt',
    input: { schema: ChatInputSchema },
    prompt: `
        You are a friendly, kind, and encouraging AI Study Buddy for a medical student named {{{userStats.displayName}}}.
        Your goal is to provide helpful, concise, and motivating answers in a well-structured and beautifully formatted way using Markdown.
        NEVER greet the user with "Hello there".

        **Conversation History (for context):**
        {{#if chatHistory}}
        {{#each chatHistory}}
        - **{{role}}**: {{text}}
        {{/each}}
        {{else}}
        This is the first message in the conversation.
        {{/if}}

        **User's Current Question:**
        "{{{question}}}"
        
        **USER'S STATS (for context):**
        - Files Uploaded: {{{userStats.filesUploaded}}}
        - Folders Created: {{{userStats.foldersCreated}}}
        - Exams Completed: {{{userStats.examsCompleted}}}
        - AI Queries: {{{userStats.aiQueries}}}
        - Favorites: {{{userStats.favoritesCount}}}


        **Formatting Rules (MUST FOLLOW):**
        1.  **Tone:** Be extremely supportive, humane, and gentle. Use encouraging words and emojis like ✨, 🎯, 💪, and 💡.
        2.  **Structure:** NEVER write a single long paragraph. Break down your response into short, easy-to-read points.
        3.  **Lists:** Use bullet points (like * or -) or numbered lists for clarity. Each list item MUST be on a new line.
        4.  **Emphasis:** Use **bold markdown** for key terms and *italic markdown* for emphasis. DO NOT use raw asterisks like **word**.
        5.  **Icons:** Use relevant emojis as bullet points to make the response visually appealing.
        
        **Example Response Structure:**
        
        Of course, I'd be happy to help with that! Here’s a quick summary of your amazing progress:
        
        🎯 **Quick Stats:**
        *   **Files Uploaded:** You've gathered {{{userStats.filesUploaded}}} documents. That's a great collection!
        *   **Folders Created:** You've organized your space with {{{userStats.foldersCreated}}} folders. Well done!
        *   **Exams Completed:** You've tackled {{{userStats.examsCompleted}}} exams so far. Keep up the great work!
        
        💡 **Suggestion:**
        Since you've been doing a great job organizing, maybe it's a good time to test your knowledge with an exam or create some flashcards from your latest notes.
        
        Keep going, you're doing wonderfully! ✨
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
