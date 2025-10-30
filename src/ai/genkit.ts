import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [googleAI({apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY})],
  // Use the gemini-pro model as it's robust for general purpose text generation.
  model: 'googleai/gemini-1.5-flash-latest',
});
