/**
 * @fileOverview Shared types for the quote generation flow.
 */

import {z} from 'genkit';

export const QuoteOutputSchema = z.object({
  quote: z.string().describe('The motivational medical quote.'),
  author: z.string().describe('The author of the quote. If unknown, it should be "Anonymous".'),
});

export type QuoteOutput = z.infer<typeof QuoteOutputSchema>;
