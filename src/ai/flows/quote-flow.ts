'use server';
/**
 * @fileOverview A flow for generating a daily medical quote.
 *
 * - getQuote - A function that returns a motivational medical quote.
 */

import {ai} from '@/ai/genkit';
import {QuoteOutputSchema, type QuoteOutput} from './quote-types';

const quotePrompt = ai.definePrompt({
  name: 'quotePrompt',
  output: { schema: QuoteOutputSchema },
  prompt: `You are an expert curator of inspirational quotes. Your task is to provide a single, impactful, and motivational quote related to the fields of medicine, healing, or the journey of a medical student. The quote should be concise and profound. Return the quote and the name of the person who said it. If the author is unknown, use "Anonymous".`,
});

const quoteFlow = ai.defineFlow(
  {
    name: 'quoteFlow',
    outputSchema: QuoteOutputSchema,
  },
  async () => {
    const {output} = await quotePrompt();
    return output!;
  }
);

export async function getQuote(): Promise<QuoteOutput> {
  return await quoteFlow();
}
