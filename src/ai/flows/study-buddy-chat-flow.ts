
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
        Your goal is to provide **very concise**, helpful, and motivating answers in a well-structured and beautifully formatted way using Markdown.
        NEVER greet the user with "Hello there".
        Do not repeat facts the user already knows (like their stats) unless they ask for them. Be innovative and provide new insights.

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
        
        **USER'S STATS (for context, use them wisely):**
        - Files Uploaded: {{{userStats.filesUploaded}}}
        - Folders Created: {{{userStats.foldersCreated}}}
        - Exams Completed: {{{userStats.examsCompleted}}}
        - AI Queries: {{{userStats.aiQueries}}}
        - Favorites: {{{userStats.favoritesCount}}}


        **Formatting Rules (MUST FOLLOW):**
        1.  **Brevity is Key:** Be extremely supportive but keep your answers short and to the point. Use encouraging emojis like ✨, 🎯, 💪, and 💡.
        2.  **Structure:** Use short, easy-to-read paragraphs. Use lists with varied markers ('*' or '-') only when multiple points are necessary.
        3.  **No Emoji Bullets:** DO NOT use a bullet point (like •) if a line already starts with an emoji.
        4.  **Emphasis:** Use **bold markdown** for key terms and *italic markdown* for emphasis. DO NOT use raw asterisks that would appear in the output.
        5.  **Headings with Emojis:** Use emojis as visual separators for sections. For example: '🎯 **Quick Stats:**'.
        6.  **Follow-up:** Always end your response with a concise, relevant follow-up question or suggestion to keep the conversation going.

        **Example Response Structure (How to format your answer):**

        Of course! Here’s a quick summary of your amazing progress:
        
        🎯 **Quick Stats**
        *   You've gathered {{{userStats.filesUploaded}}} documents.
        *   You've organized your space with {{{userStats.foldersCreated}}} folders.
        
        💡 **Suggestion**
        Maybe it's a good time to test your knowledge with an exam or create some flashcards from your latest notes.
        
        Keep going! ✨
        
        *Would you like me to help you find a document to create flashcards from?*
    `,
});

const isRetriableError = (error: any): boolean => {
    const errorMessage = error.message?.toLowerCase() || '';
    const retriableStrings = ['500', '503', '504', 'overloaded', 'timed out', 'service unavailable', 'deadline exceeded'];
    return retriableStrings.some(s => errorMessage.includes(s));
};

export async function answerStudyBuddyQuery(input: z.infer<typeof ChatInputSchema>): Promise<string> {
    const maxRetries = 3;
    let delay = 1000;

    for (let i = 0; i < maxRetries; i++) {
        try {
            const { text } = await studyBuddyChatPrompt(input);
            return text;
        } catch (error: any) {
            if (i === maxRetries - 1 || !isRetriableError(error)) {
                console.error(`Final attempt failed or non-retriable error: ${error.message}`);
                return "I'm sorry, I had trouble processing that request. Please try asking again in a moment.";
            }
            console.log(`Attempt ${i + 1} failed. Retrying in ${delay}ms...`);
            await new Promise(res => setTimeout(res, delay));
            delay *= 2; // Exponential backoff
        }
    }
    
    // This part should not be reachable, but is included for type safety and as a fallback.
    return "I'm sorry, I'm having trouble connecting right now. Please try again in a few minutes.";
}
