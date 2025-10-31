import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// Validate API key on initialization
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('[GENKIT] ✗ CRITICAL: GEMINI_API_KEY environment variable is not set');
  console.error('[GENKIT] AI features will not work without this key');
  console.error('[GENKIT] Please add GEMINI_API_KEY to your Vercel environment variables');
}

export const ai = genkit({
  plugins: [googleAI({apiKey: apiKey || 'dummy-key-will-fail'})],
  model: 'googleai/gemini-2.5-flash',
});
