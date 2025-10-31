
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [googleAI({apiKey: process.env.GEMINI_API_KEY})],
  // Switch to gemini-pro which is required for tool use.
  model: 'googleai/gemini-pro',
});
