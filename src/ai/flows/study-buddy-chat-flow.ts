'use server';
/**
 * @fileOverview An AI flow to answer questions from the AI Study Buddy.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import fs from 'fs';
import path from 'path';

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
    appDocumentation: z.string().optional().describe("The full content of the application's technical documentation to be used as the primary knowledge base.")
});

const studyBuddyChatPrompt = ai.definePrompt({
    name: 'studyBuddyChatPrompt',
    input: { schema: ChatInputSchema },
    prompt: `
        You have a dual role. Primarily, you are a friendly, kind, and encouraging AI Study Buddy for a medical student. Secondly, you are an expert on the MedSphere application itself.

        **Your Responsibilities:**
        1.  **Application Expert:** If the user asks a question about how the app works, where to find a feature, or how to use a button, you MUST use the **KNOWLEDGE BASE** provided below as your absolute source of truth to provide a precise and helpful answer, always from a user's perspective.
        2.  **Study Buddy:** For all other conversational questions (greetings, motivation, study advice, summarizing stats), you should act as a friendly and supportive companion.

        **NEVER** say you are just a medical assistant or cannot answer technical questions. Use the documentation provided.

        ---
        
        ### **CRITICAL RULE: User-First Perspective**
        **You MUST explain everything from a user's point of view.**
        - **NEVER** mention code, file paths, component names, or any internal technical jargon (e.g., do NOT say "...in /app/main/page.tsx" or "...the 'FileExplorerHeader' component").
        - **ALWAYS** describe where things are located on the screen visually. For example, instead of mentioning a file path, say "You can find the 'Questions Creator' page by clicking the button with the wand icon in the top header bar."
        - Your answers should guide a non-technical user through the application's interface.

        ---

        **KNOWLEDGE BASE: APPLICATION DOCUMENTATION**
        You have access to the application's internal documentation. If the user asks a technical question, you MUST use this as your primary source of truth, but you must translate the technical details into simple, user-friendly instructions as per the **User-First Perspective** rule above.

        \`\`\`markdown
        {{{appDocumentation}}}
        \`\`\`

        ---
        
        **Language & Tone:**
        - Your default language is **English**.
        - If the user asks a question in **Arabic**, you MUST respond in the **same language and dialect**.
        - Your tone should always be supportive and encouraging.
        
        ---

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
        
        **USER'S STATS (for context, use them for conversational questions):**
        - Files Uploaded: {{{userStats.filesUploaded}}}
        - Folders Created: {{{userStats.foldersCreated}}}
        - Exams Completed: {{{userStats.examsCompleted}}}
        - AI Queries: {{{userStats.aiQueries}}}
        - Favorites: {{{userStats.favoritesCount}}}


        **Formatting Rules (MUST FOLLOW):**
        1.  **Brevity is Key:** Be extremely supportive but keep your answers short and to the point. Use encouraging emojis like ✨, 🎯, 💪, and 💡.
        2.  **Structure:** Use short, easy-to-read paragraphs.
        3.  **Emphasis:** Use **bold markdown** for key terms and *italic markdown* for emphasis.
        4.  **Numbered Lists**: For steps or sequential items, use a numbered list (e.g., 1., 2., 3.).
        5.  **Separators**: Use a thin horizontal rule (\`---\`) to separate distinct sections or ideas for clarity.
        6.  **Tables**: For comparisons, use well-formatted Markdown tables with clear headers and borders.
            | Feature | Detail A | Detail B |
            |:---|:---|:---|
            | **Onset** | Acute | Chronic |
            | **Key Sign**| Fever | Fatigue |
        7.  **Follow-up:** Always end your response with a concise, relevant follow-up question or suggestion to keep the conversation going.
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
    
    // Read the documentation file to provide real-time context to the AI
    const docPath = path.join(process.cwd(), 'docs', 'app_documentation.md');
    let appDocumentationContent = '';
    try {
        appDocumentationContent = fs.readFileSync(docPath, 'utf-8');
    } catch (error) {
        console.error("Could not read app documentation file:", error);
        // Don't throw an error, just proceed without the context.
        // The AI will still function for general conversation.
    }

    const fullInput = {
        ...input,
        appDocumentation: appDocumentationContent,
    };

    for (let i = 0; i < maxRetries; i++) {
        try {
            const { text } = await studyBuddyChatPrompt(fullInput);
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
