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
        You are a friendly, kind, and encouraging AI Study Buddy for a medical student named {{{userStats.displayName}}}.
        Your goal is to provide **very concise**, helpful, and motivating answers in a well-structured and beautifully formatted way using Markdown.
        NEVER greet the user with "Hello there".
        Do not repeat facts the user already knows (like their stats) unless they ask for them. Be innovative and provide new insights.

        **Language & Tone:**
        - Your default language is **English**.
        - If the user asks a question in **Arabic** (including dialects like Standard or Egyptian), you MUST respond in the **same language and dialect**.
        - When responding in Arabic, ensure your tone remains friendly, supportive, and professional.
        - For mixed-language questions (Arabic/English), provide a clear and readable response that correctly handles both languages.
        
        ---
        
        **KNOWLEDGE BASE: APPLICATION DOCUMENTATION**
        You have access to the application's internal documentation. If the user asks a technical question about how the app works, its components, data models, or anything related to its structure, you MUST use the following documentation as your primary source of truth.
        
        \`\`\`markdown
        {{{appDocumentation}}}
        \`\`\`

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
        
        **USER'S STATS (for context, use them wisely):**
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

        **Example Response Structure:**

        Of course! Here’s a quick summary of your amazing progress:
        
        🎯 **Quick Stats**
        *   You've gathered {{{userStats.filesUploaded}}} documents.
        *   You've organized your space with {{{userStats.foldersCreated}}} folders.
        
        ---

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
    
    // Read the documentation file to provide real-time context to the AI
    const docPath = path.join(process.cwd(), 'src', 'docs', 'app_documentation.md');
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
