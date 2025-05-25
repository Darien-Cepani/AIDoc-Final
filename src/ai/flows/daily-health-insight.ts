
'use server';
/**
 * @fileOverview Provides daily health insights and inspirational quotes.
 *
 * - dailyHealthInsight - A function that generates a health tip and an inspirational quote.
 * - DailyHealthInsightInput - The input type for the dailyHealthInsight function.
 * - DailyHealthInsightOutput - The return type for the dailyHealthInsight function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DailyHealthInsightInputSchema = z.object({
  userName: z.string().optional().describe("The user's name for personalization."),
  healthContext: z.string().optional().describe("A brief summary of the user's health status or goals, e.g., 'Wants to lose weight', 'Managing diabetes'.")
});
export type DailyHealthInsightInput = z.infer<typeof DailyHealthInsightInputSchema>;

const DailyHealthInsightOutputSchema = z.object({
  healthTip: z.string().describe('A concise, actionable health tip for the day. Make it positive and encouraging.'),
  inspirationalQuote: z.string().describe('A short, uplifting inspirational quote related to health, well-being, or perseverance.'),
});
export type DailyHealthInsightOutput = z.infer<typeof DailyHealthInsightOutputSchema>;

export async function dailyHealthInsight(input: DailyHealthInsightInput): Promise<DailyHealthInsightOutput> {
  return dailyHealthInsightFlow(input);
}

const prompt = ai.definePrompt({
  name: 'dailyHealthInsightPrompt',
  input: {schema: DailyHealthInsightInputSchema},
  output: {schema: DailyHealthInsightOutputSchema},
  prompt: `You are an AI wellness coach. Your goal is to provide a unique, positive, and actionable health tip for the day, and a short, uplifting inspirational quote.
{{#if userName}}Address the user as {{userName}}.{{/if}}
{{#if healthContext}}The user's current focus is: {{{healthContext}}}. Tailor the health tip slightly towards this if appropriate, but keep it general enough for daily advice.{{/if}}

Generate a new health tip and a new inspirational quote each time. Avoid repetition.

Health Tip Focus:
- Keep it simple and easy to implement.
- Focus on small, positive changes.
- Examples: hydration, a short walk, mindful eating, a quick stretch, good sleep hygiene.

Inspirational Quote Focus:
- Short and memorable.
- Related to health, well-being, resilience, or daily positivity.

Ensure the output strictly follows the JSON schema.
`,
});

const dailyHealthInsightFlow = ai.defineFlow(
  {
    name: 'dailyHealthInsightFlow',
    inputSchema: DailyHealthInsightInputSchema,
    outputSchema: DailyHealthInsightOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      // Fallback in case AI fails
      return {
        healthTip: "Remember to drink plenty of water today!",
        inspirationalQuote: "The journey of a thousand miles begins with a single step. - Lao Tzu"
      };
    }
    return output;
  }
);
