
'use server';

import { generateContentSuggestions } from '@/ai/flows/generate-content-suggestions';

/**
 * Fetches AI-powered content suggestions based on a URL.
 * @param url The URL for which to generate suggestions.
 * @returns A promise that resolves to an array of suggestion strings.
 */
export async function getSuggestions(url: string): Promise<string[]> {
  try {
    const result = await generateContentSuggestions({ url });
    return result.suggestions;
  } catch (error) {
    console.error('AI suggestion generation failed:', error);
    // Return a default set of suggestions as a fallback
    return [
      'Return to the homepage',
      'Search for content on our site',
      'Contact support for assistance',
    ];
  }
}
