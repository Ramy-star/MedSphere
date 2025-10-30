import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [googleAI({apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY})],
  // Switch to gemini-1.5-flash-latest which is faster and better for interactive use cases.
  model: 'googleai/gemini-2.5-flash-latest',
});
