
'use server';
/**
 * @fileOverview An AI flow for the AI Study Buddy feature on the profile page.
 *
 * - getStudyBuddyInsight - Generates personalized insights and suggestions.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const UserStatsSchema = z.object({
    displayName: z.string().optional().describe("The user's display name."),
    username: z.string().describe("The user's username."),
    filesUploaded: z.number().optional().default(0),
    foldersCreated: z.number().optional().default(0),
    examsCompleted: z.number().optional().default(0),
    aiQueries: z.number().optional().default(0),
    favoritesCount: z.number().default(0),
}).describe("A summary of the user's statistics and activity.");

const SuggestedActionSchema = z.object({
    label: z.string().describe("The user-facing text for the button, e.g., 'Summarize my progress'."),
    prompt: z.string().describe("The specific question/prompt that will be sent to the AI if this button is clicked."),
});

const StudyBuddyOutputSchema = z.object({
    greeting: z.string().describe("A short, friendly greeting based on the time of day and the user's first name."),
    mainInsight: z.string().describe("A key insight or observation about the user's activity. Keep it concise and encouraging."),
    suggestedActions: z.array(SuggestedActionSchema).min(1).max(3).describe("A list of 1 to 3 relevant questions the user might want to ask next."),
});

const studyBuddyPrompt = ai.definePrompt({
    name: 'studyBuddyPrompt',
    input: { schema: UserStatsSchema.extend({ timeOfDay: z.string(), firstName: z.string() }) },
    output: { schema: StudyBuddyOutputSchema },
    prompt: `
        You are a friendly and encouraging AI Study Buddy for a medical student.
        Your goal is to provide a personalized, insightful, and motivating message based on the user's recent activity stats.

        The current time of day is: {{{timeOfDay}}}
        The user's first name is: {{{firstName}}}
        The user's stats are:
        - Files Uploaded: {{{filesUploaded}}}
        - Folders Created: {{{foldersCreated}}}
        - Exams Completed: {{{examsCompleted}}}
        - Favorites Added: {{{favoritesCount}}}
        - AI Queries: {{{aiQueries}}}

        Follow these rules precisely:
        1.  **Greeting:** Start with a brief, warm greeting appropriate for the time of day (morning, afternoon, evening). Address the user by their first name ONLY.
        2.  **Main Insight:** Based on the stats, generate ONE key insight. Make it feel personal and observant.
            - If they have high activity, praise their hard work.
            - If activity is low, gently encourage them to get started.
        3.  **Suggested Actions:** Provide 2-3 relevant, actionable questions the user can ask you. The 'label' should be the button text, and the 'prompt' is the full question you will receive.
            - If they have uploaded files but not used the AI much, suggest asking for a summary or quiz.
            - If they have been studying hard, suggest a review of their progress.
            - Always phrase the labels as questions from the user's perspective (e.g., "What should I focus on?").

        Example Output:
        {
          "greeting": "Good morning, {{{firstName}}}!",
          "mainInsight": "You've been busy organizing! I see you've created {{foldersCreated}} new folders.",
          "suggestedActions": [
            { "label": "What should I study next?", "prompt": "Based on my recent activity, what subject do you recommend I study next?" },
            { "label": "Summarize my progress.", "prompt": "Can you give me a brief summary of my study progress so far?" }
          ]
        }
    `,
});

export async function getStudyBuddyInsight(stats: z.infer<typeof UserStatsSchema>) {
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    const firstName = stats.displayName?.split(' ')[0] || stats.username;
    
    try {
        const { output } = await studyBuddyPrompt({ ...stats, timeOfDay, firstName });
        return output!;
    } catch (error) {
        console.error("Error generating study buddy insight:", error);
        // Return a default, safe response on error
        return {
            greeting: `Hello, ${firstName}!`,
            mainInsight: "Ready to dive into your studies? Let's make today productive. You can ask me to summarize your progress or suggest what to study next.",
            suggestedActions: [
                { label: "Summarize my progress", prompt: "Can you give me a brief summary of my study progress so far?" },
                { label: "What should I study next?", prompt: "Based on my recent activity, what subject do you recommend I study next?" }
            ]
        };
    }
}
