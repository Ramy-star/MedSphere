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
    label: z.string().describe("The user-facing text for the button, e.g., 'Start a new exam'."),
    action: z.enum([
        "CREATE_QUIZ",
        "TAKE_EXAM",
        "REVIEW_FILES",
        "EXPLORE_SUBJECTS",
        "VIEW_FAVORITES",
        "ASK_AI"
    ]).describe("A machine-readable action key to identify what the button should do."),
});

const StudyBuddyOutputSchema = z.object({
    greeting: z.string().describe("A short, friendly greeting based on the time of day."),
    mainInsight: z.string().describe("A key insight or observation about the user's activity. Keep it concise and encouraging."),
    suggestedActions: z.array(SuggestedActionSchema).min(1).max(3).describe("A list of 1 to 3 relevant suggested actions for the user to take next."),
});

const studyBuddyPrompt = ai.definePrompt({
    name: 'studyBuddyPrompt',
    input: { schema: UserStatsSchema },
    output: { schema: StudyBuddyOutputSchema },
    prompt: `
        You are a friendly and encouraging AI Study Buddy for a medical student.
        Your goal is to provide a personalized, insightful, and motivating message based on the user's recent activity stats.

        The current time of day is: {{timeOfDay}}
        The user's stats are:
        - Display Name: {{{displayName}}}
        - Username: {{{username}}}
        - Files Uploaded: {{{filesUploaded}}}
        - Folders Created: {{{foldersCreated}}}
        - Exams Completed: {{{examsCompleted}}}
        - Favorites Added: {{{favoritesCount}}}

        Follow these rules precisely:
        1.  **Greeting:** Start with a brief, warm greeting appropriate for the time of day (morning, afternoon, evening). Address the user by their display name if available, otherwise their username.
        2.  **Main Insight:** Based on the stats, generate ONE key insight. Make it feel personal and observant.
            - If they have high activity (e.g., many files uploaded or exams completed), praise their hard work.
            - If activity is low, gently encourage them to get started.
            - If they have many favorites, comment on their curation skills.
        3.  **Suggested Actions:** Provide 1 to 3 actionable suggestions that are relevant to their stats.
            - If they have uploaded files but not completed many exams, suggest creating a quiz or taking an exam.
            - If they seem to be organizing (creating folders), suggest they review their files.
            - If their activity is low, suggest exploring subjects or reviewing favorites.
            - Always make the labels encouraging and clear (e.g., "Test your knowledge" instead of just "Exam").

        Example Output Structure:
        {
          "greeting": "Good morning, Dr. [Name]!",
          "mainInsight": "You've been busy organizing! I see you've created {{foldersCreated}} new folders.",
          "suggestedActions": [
            { "label": "Review your subjects", "action": "EXPLORE_SUBJECTS" },
            { "label": "Ask the AI a question", "action": "ASK_AI" }
          ]
        }
    `,
});

export async function getStudyBuddyInsight(stats: z.infer<typeof UserStatsSchema>) {
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    
    try {
        const { output } = await studyBuddyPrompt({ ...stats, timeOfDay });
        return output;
    } catch (error) {
        console.error("Error generating study buddy insight:", error);
        // Return a default, safe response on error
        return {
            greeting: `Hello, ${stats.displayName || stats.username}!`,
            mainInsight: "Ready to dive into your studies? Let's make today productive.",
            suggestedActions: [
                { label: "Explore your subjects", action: "EXPLORE_SUBJECTS" },
                { label: "Take an exam", action: "TAKE_EXAM" }
            ]
        };
    