import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [googleAI({apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY})],
  // Switch to a supported and robust model like gemini-1.5-flash-latest.
  model: 'googleai/gemini-1.5-flash-latest',
});
