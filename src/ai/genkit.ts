import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// Validate API key on initialization
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey || apiKey === 'your-api-key-here') {
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('[GENKIT] ✗ CRITICAL: GEMINI_API_KEY is not configured');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('');
  console.error('AI features will NOT work without a valid API key!');
  console.error('');
  console.error('📋 To fix this:');
  console.error('   1. Visit: https://aistudio.google.com/app/apikey');
  console.error('   2. Click "Create API Key" (free tier available)');
  console.error('   3. Copy your API key');
  console.error('   4. Update .env.local file with your key:');
  console.error('      GEMINI_API_KEY=your-actual-key-here');
  console.error('');
  console.error('📌 For Vercel deployment:');
  console.error('   Add GEMINI_API_KEY to your Vercel Environment Variables');
  console.error('   Settings → Environment Variables → Add New');
  console.error('');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
} else {
  console.log('[GENKIT] ✓ API key found, initializing AI...');
}

export const ai = genkit({
  plugins: [googleAI({apiKey: apiKey || 'dummy-key-will-fail'})],
  model: 'googleai/gemini-2.5-flash',
});
