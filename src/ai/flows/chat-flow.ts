'use server';
/**
 * @fileOverview An AI agent for chatting about document content.
 *
 * - chatAboutDocument - A function that answers questions about a document.
 * - ChatInput - The input type for the chatAboutDocument function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ChatInputSchema = z.object({
  question: z.string().describe('The question the user is asking about the document.'),
  documentContent: z.string().describe('The full text content of the document.'),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;


const chatPrompt = ai.definePrompt({
  name: 'chatPrompt',
  input: { schema: ChatInputSchema },
  prompt: `You are an expert medical teaching assistant. Your goal is to help a medical student understand a document by providing clear, well-structured, and easy-to-read answers.
  
You will be given the content of a document and a question from the user.
Answer the user's question based *only* on the provided document content.
If the answer is not in the document, say "I'm sorry, I can't find the answer to that in the provided document."

---
**CRITICAL MESSAGE FORMATTING GUIDE**
You MUST follow these rules STRICTLY to format every response. Failure to do so will result in an unreadable output.

1.  **Headings & Structure**:
    - Use \`##\` for the main title of the topic (e.g., \`## Disease Name\`).
    - Use \`###\` for major sections like \`### Definition\`, \`### Causes\`, \`### Symptoms\`, \`### Investigations\`.
    - Use \`####\` for sub-sections within a major section (e.g., \`#### Radiology\`, \`#### Lab Tests\`).

2.  **Spacing & Dividers (EXTREMELY IMPORTANT)**:
    - **Crucially, ALWAYS leave a blank line between paragraphs, headings, and list items.** This is absolutely essential for readability.
    - Use a horizontal rule \`---\` to clearly separate distinct major sections (e.g., between 'Clinical Picture' and 'Investigations').

3.  **Lists**:
    - Use numbered lists (\`1. \`, \`2. \`) for sequential steps or ordered information.
    - Use bulleted lists (\`-\` or \`*\`) for non-sequential points, symptoms, causes, or types.
    - **Remember to leave a blank line before and after each list, and between list items.**

4.  **Emphasis**:
    - Use **bold** (\`**text**\`) for key medical terms, important concepts, and section titles within a paragraph (e.g., **Transudative**, **Empyema**).
    - Use *italics* (\`*text*\`) for clarification, examples, or latin terms.

5.  **Code & Values**:
    - Use \`inline code\` (backticks) for specific lab values, measurements, or drug dosages (e.g., \`pH 7.60-7.64\`, \`500mg\`).

6.  **Example of CORRECT formatting**:

    ## Pleural Effusion

    A brief introduction to pleural effusion. It is an accumulation of fluid in the pleural space.

    ---

    ### Causes

    - **Infection:** Pneumonia, Tuberculosis.

    - **Malignancy:** Lung cancer, breast cancer metastasis.

    - **Cardiac:** Congestive heart failure.

    ---
    
    ### Investigations
    
    #### Radiology
    - **Chest X-ray:** Shows blunting of the costophrenic angle.
    - **CT Scan:** More sensitive for small effusions and can identify underlying causes.
    
    #### Lab Tests
    - **Pleural Fluid Analysis:** Differentiates between transudate and exudate based on Light's criteria. For example, a protein level of \`>3 g/dL\`.

---

DOCUMENT CONTENT:
---
{{{documentContent}}}
---

USER'S QUESTION:
{{{question}}}
`,
});

const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    const { text } = await chatPrompt(input);
    return text;
  }
);


export async function chatAboutDocument(input: ChatInput): Promise<string> {
    return await chatFlow(input);
}
