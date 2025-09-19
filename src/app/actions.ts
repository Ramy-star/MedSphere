// src/app/actions.ts
'use server';
import { suggestMedicalStudyTags as suggestMedicalStudyTagsFlow } from '@/ai/flows/suggest-medical-study-tags';
import type { SuggestMedicalStudyTagsInput } from '@/ai/flows/suggest-medical-study-tags';

export async function suggestMedicalStudyTags(input: SuggestMedicalStudyTagsInput) {
    try {
        const result = await suggestMedicalStudyTagsFlow(input);
        return { success: true, data: result };
    } catch (error) {
        console.error('AI Tagging Error:', error);
        return { success: false, error: 'Failed to suggest tags due to an internal error.' };
    }
}
