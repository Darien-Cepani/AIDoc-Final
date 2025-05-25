
'use server';
/**
 * @fileOverview Incrementally updates a consolidated summary of AI chat conclusions.
 *
 * - updateChatSummary - A function to merge a new chat conclusion into an existing summary.
 * - UpdateChatSummaryInput - Input type for the updateChatSummary function.
 * - UpdateChatSummaryOutput - Output type for the updateChatSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Schema for the new chat conclusion to be integrated
const NewChatConclusionSchema = z.object({
  chatDate: z.string().optional().describe("ISO date string of when the chat occurred."),
  aiIdentifiedPotentialConditions: z.array(z.object({
    condition: z.string().describe("A potential medical condition suggested by the AI during the chat."),
    certainty: z.number().min(0).max(100).describe("The AI's estimated certainty for this condition."),
  })).optional().describe("Potential conditions discussed with high certainty (e.g., >= 85%)."),
  keySymptomsDiscussed: z.array(z.string()).optional().describe("Key symptoms discussed or extracted during the chat."),
  chatTitle: z.string().optional().describe("The title or main topic of the chat session."),
});
export type NewChatConclusion = z.infer<typeof NewChatConclusionSchema>;

// Schema for the user's general profile context
const UserProfileContextSchema = z.object({
  age: z.number().optional().nullable().describe("User's age."),
  gender: z.string().optional().nullable().describe("User's gender."),
  existingConditions: z.array(z.string()).optional().describe("User's known pre-existing conditions."),
});
export type UserProfileContext = z.infer<typeof UserProfileContextSchema>;

// Input schema for the flow
const UpdateChatSummaryInputSchema = z.object({
  previousChatSummary: z.string().nullable().optional().describe("The existing consolidated summary of all previous chat conclusions. If null or empty, a new summary will be initiated."),
  newChatConclusion: NewChatConclusionSchema.describe("The details of the latest significant chat conclusion to integrate."),
  userProfileContext: UserProfileContextSchema.optional().describe("Brief context about the user to help tailor the summary."),
});
export type UpdateChatSummaryInput = z.infer<typeof UpdateChatSummaryInputSchema>;

// Output schema for the flow
const UpdateChatSummaryOutputSchema = z.object({
  updatedChatSummary: z.string().describe("The new, updated consolidated summary incorporating the latest chat conclusion."),
});
export type UpdateChatSummaryOutput = z.infer<typeof UpdateChatSummaryOutputSchema>;

export async function updateChatSummary(input: UpdateChatSummaryInput): Promise<UpdateChatSummaryOutput> {
  return updateChatSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'updateChatSummaryPrompt',
  input: {schema: UpdateChatSummaryInputSchema},
  output: {schema: UpdateChatSummaryOutputSchema},
  prompt: `You are an AI assistant specializing in medical information synthesis.
Your task is to incrementally update a consolidated summary of a user's AI health chat conclusions.

User Profile Context (for tailoring the summary if needed):
{{#if userProfileContext}}
- Age: {{userProfileContext.age}}
- Gender: {{userProfileContext.gender}}
{{#if userProfileContext.existingConditions}}
- Known Conditions: {{#each userProfileContext.existingConditions}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}
{{else}}
- No specific user profile context provided for this update.
{{/if}}

Previous Consolidated Chat Summary:
{{#if previousChatSummary}}
{{{previousChatSummary}}}
{{else}}
This is the first significant chat conclusion to summarize.
{{/if}}

New Significant Chat Conclusion to Integrate:
- Chat Title/Topic: {{newChatConclusion.chatTitle}}
- Chat Date: {{newChatConclusion.chatDate}}
{{#if newChatConclusion.keySymptomsDiscussed}}
- Key Symptoms Discussed: {{#each newChatConclusion.keySymptomsDiscussed}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}
{{#if newChatConclusion.aiIdentifiedPotentialConditions}}
- Potential Conditions Identified by AI (with certainty):
  {{#each newChatConclusion.aiIdentifiedPotentialConditions}}
  - {{condition}} ({{certainty}}%)
  {{/each}}
{{/if}}

Instructions:
1.  Review the 'Previous Consolidated Chat Summary'.
2.  Analyze the 'New Significant Chat Conclusion to Integrate'.
3.  Combine the information into a concise, updated summary ('updatedChatSummary').
    - Your primary goal is to integrate the new chat conclusion with the previous summary.
    - If the 'Previous Consolidated Chat Summary' is empty or null, create a new summary based on the 'New Significant Chat Conclusion to Integrate'. Start this new summary with a clear heading like "Summary of AI Health Chat Interactions:".
    - If there was a previous summary, append or integrate the new information logically. Avoid excessive repetition but ensure key new findings are captured.
    - The 'updatedChatSummary' **must not be an empty string** if there is new information to incorporate or if a new summary is being created. If no new significant conclusions were present in the 'New Significant Chat Conclusion to Integrate', and the previous summary was also empty, you can state "No significant chat conclusions to summarize at this time."
    - The summary should be easy to read, highlighting patterns or recurring themes if they emerge.
    - Aim for a chronological or thematic organization if possible.
    - Use clear, simple language suitable for a patient.
    - Use markdown for light formatting (like bullet points or bolding key terms) if it enhances readability.

Example of how to integrate:
If previous summary was:
"- Discussed persistent headaches (*July 10th*). AI suggested tension headache (70%)."
And new conclusion is:
"- Chat Title: Follow-up on Headaches, Chat Date: *July 15th*, Symptoms: Headache, stiff neck, AI Condition: **Migraine** (85%)"
Updated summary might be:
"Summary of AI Health Chat Interactions:
- Ongoing discussion about headaches.
  - *July 10th*: Persistent headaches, AI suggested tension headache (70%).
  - *July 15th* (Follow-up): Symptoms included headache, stiff neck. AI now suggests **Migraine** (85% certainty)."

Focus on clarity and accurately reflecting the new information in the context of the old. Ensure 'updatedChatSummary' is never empty if there's content to report, even if it's just the initial "No significant chat conclusions..." message.
`,
});

const updateChatSummaryFlow = ai.defineFlow(
  {
    name: 'updateChatSummaryFlow',
    inputSchema: UpdateChatSummaryInputSchema,
    outputSchema: UpdateChatSummaryOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output || !output.updatedChatSummary) {
      // Fallback in case AI fails or returns empty string
      if (!input.previousChatSummary && (!input.newChatConclusion.keySymptomsDiscussed || input.newChatConclusion.keySymptomsDiscussed.length === 0) && (!input.newChatConclusion.aiIdentifiedPotentialConditions || input.newChatConclusion.aiIdentifiedPotentialConditions.length === 0)) {
        return { updatedChatSummary: "No significant chat conclusions to summarize at this time." };
      }
      return {
        updatedChatSummary: input.previousChatSummary || "Error: Could not update chat summary.",
      };
    }
    // Ensure summary is not empty string if AI somehow provides one
    if (output.updatedChatSummary.trim() === "") {
        if (!input.previousChatSummary && (!input.newChatConclusion.keySymptomsDiscussed || input.newChatConclusion.keySymptomsDiscussed.length === 0) && (!input.newChatConclusion.aiIdentifiedPotentialConditions || input.newChatConclusion.aiIdentifiedPotentialConditions.length === 0)) {
            return { updatedChatSummary: "No significant chat conclusions to summarize at this time." };
        }
        return { updatedChatSummary: input.previousChatSummary || "Summary generation resulted in empty content."};
    }
    return output;
  }
);

    
