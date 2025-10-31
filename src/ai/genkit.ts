import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [googleAI({apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY})],
  // Switch to gemini-pro which often has more lenient rate limits than flash for non-streaming.
  model: 'googleai/gemini-1.5-flash-latest',
});
