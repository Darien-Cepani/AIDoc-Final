
'use server';
/**
 * @fileOverview Generates an overall health summary for a user based on consolidated chat and document insights.
 *
 * - generateOverallHealthSummary - A function that synthesizes health data into a summary.
 * - GenerateOverallHealthSummaryInput - Input type for the summary generation.
 * - GenerateOverallHealthSummaryOutput - Output type for the summary generation.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
// Removed: import { doc, getDoc } from 'firebase/firestore';
// Removed: import { db } from '@/lib/firebase';

const UserProfileContextSchema = z.object({
  name: z.string().optional().describe("User's name for personalization."),
  age: z.number().optional().nullable().describe("User's current age."),
  gender: z.string().optional().nullable().describe("User's gender."),
  height: z.number().optional().nullable().describe("User's height in cm."),
  weight: z.number().optional().nullable().describe("User's weight in kg."),
  bmi: z.number().optional().nullable().describe("User's calculated BMI."),
  existingConditions: z.array(z.string()).optional().describe("User's known pre-existing medical conditions."),
  allergies: z.array(z.string()).optional().describe("User's known allergies."),
});
export type UserProfileDataForAI = z.infer<typeof UserProfileContextSchema>;


// Input schema now expects consolidated summaries from the client
const GenerateOverallHealthSummaryInputSchema = z.object({
  // userId: z.string().describe("The ID of the user for whom to generate the summary."), // No longer needed for summary fetching here
  userProfile: UserProfileContextSchema.optional().describe("Key information from the user's health profile."),
  consolidatedDocumentAnalysisSummary: z.string().nullable().optional().describe("A running summary of all analyzed medical documents."),
  consolidatedChatSummary: z.string().nullable().optional().describe("A running summary of significant conclusions from AI chat sessions."),
});
export type GenerateOverallHealthSummaryInput = z.infer<typeof GenerateOverallHealthSummaryInputSchema>;

const GenerateOverallHealthSummaryOutputSchema = z.object({
  overallHealthSummary: z.string().describe("A holistic, easy-to-understand summary of the user's health, formatted with markdown."),
  lastUpdated: z.string().describe("ISO string timestamp of when this summary was generated."),
});
export type GenerateOverallHealthSummaryOutput = z.infer<typeof GenerateOverallHealthSummaryOutputSchema>;

export async function generateOverallHealthSummary(input: GenerateOverallHealthSummaryInput): Promise<GenerateOverallHealthSummaryOutput> {
  return generateOverallHealthSummaryFlow(input);
}

const PLACEHOLDER_NO_DOC_SUMMARY = "NO_DOCUMENT_ANALYSIS_SUMMARY_AVAILABLE_FOR_REVIEW";
const PLACEHOLDER_NO_CHAT_SUMMARY = "NO_AI_HEALTH_CHAT_SUMMARY_AVAILABLE_FOR_REVIEW";

const prompt = ai.definePrompt({
  name: 'generateOverallHealthSummaryPrompt_v3', // Renamed to reflect significant changes
  input: { schema: z.object({
      userProfile: UserProfileContextSchema.optional(),
      documentAnalysisContent: z.string().describe("Consolidated text from medical document analyses. This will be the actual summary or a specific placeholder if none exists."),
      chatSessionContent: z.string().describe("Consolidated text from AI chat sessions. This will be the actual summary or a specific placeholder if none exists."),
    })
  },
  output: { schema: z.object({ overallHealthSummary: z.string() }) }, // AI only generates the summary string
  prompt: `You are an AI medical data analyst. Your task is to generate a comprehensive, easy-to-understand overall health summary for a user, formatted using markdown.

**User Profile Context:**
{{#if userProfile}}
-   Name: {{#if userProfile.name}}{{{userProfile.name}}}{{else}}Not Provided{{/if}}
-   Age: {{#if userProfile.age}}{{userProfile.age}} years{{else}}Not Provided{{/if}}
-   Gender: {{#if userProfile.gender}}{{{userProfile.gender}}}{{else}}Not Provided{{/if}}
{{#if userProfile.height}}-   Height: {{userProfile.height}} cm{{/if}}
{{#if userProfile.weight}}-   Weight: {{userProfile.weight}} kg{{/if}}
{{#if userProfile.bmi}}-   BMI: {{userProfile.bmi}}{{/if}}
{{#if userProfile.existingConditions.length}}
-   Known Conditions: {{#each userProfile.existingConditions}}**{{{this}}}**{{#unless @last}}, {{/unless}}{{/each}}
{{else}}
-   Known Conditions: None reported.
{{/if}}
{{#if userProfile.allergies.length}}
-   Allergies: {{#each userProfile.allergies}}**{{{this}}}**{{#unless @last}}, {{/unless}}{{/each}}
{{else}}
-   Allergies: None reported.
{{/if}}
{{else}}
User profile information is limited or not provided.
{{/if}}

**Consolidated Insights from Medical Documents:**
{{{documentAnalysisContent}}}

**Consolidated Insights from AI Chat Sessions:**
{{{chatSessionContent}}}

**Your Task & Crucial Analysis Instructions:**
Synthesize ALL information provided above (User Profile, the text under "Consolidated Insights from Medical Documents", and the text under "Consolidated Insights from AI Chat Sessions") into a holistic overview.

1.  **Analyze 'Consolidated Insights from Medical Documents' (passed as \`documentAnalysisContent\` input variable):**
    *   If the provided text for this section is *exactly* "${PLACEHOLDER_NO_DOC_SUMMARY}", then you must state in your summary that no specific insights can be drawn from documents at this time.
    *   However, if the text contains ANY OTHER CONTENT (e.g., mentioning conditions like **elevated red blood cell count**, specific metrics, *dates*, or even introductory text like "This is the first document analysis to summarize..."), YOU MUST extract and integrate that information into your overall summary. Do not ignore these findings.

2.  **Analyze 'Consolidated Insights from AI Chat Sessions' (passed as \`chatSessionContent\` input variable):**
    *   If the provided text for this section is *exactly* "${PLACEHOLDER_NO_CHAT_SUMMARY}", then you must state in your summary that no specific insights can be drawn from chat sessions at this time.
    *   However, if the text contains ANY OTHER CONTENT (e.g., mentioning AI-identified conditions like **Gastroesophageal Reflux Disease (GERD)** or **Colorectal Cancer** with certainty scores, or key symptoms), YOU MUST extract and integrate that information. Do not ignore these findings.

3.  **Prioritize User Profile if Other Sources are Placeholders**: If both document and chat insights are their respective placeholder messages, focus your summary on the user's profile information. Acknowledge the status of the other summaries.

4.  **Structure for Readability**:
    *   Begin with a brief, overall opening statement{{#if userProfile.name}}, addressing {{{userProfile.name}}}{{/if}}.
    *   Use bullet points for lists of conditions, symptoms, key findings, or recommendations.
    *   Use short, clear paragraphs.

5.  **Content Focus**:
    *   Discuss any recurring health themes or patterns.
    *   Point out potential areas of concern that might warrant discussion with a doctor.
    *   Mention positive health indicators or improvements if evident.

6.  **Formatting**:
    *   Make key medical conditions, significant diagnoses, or critical metrics **bold**.
    *   Make *italic* any specific dates (e.g., *May 19th, 2025*), document names, or source references found within the provided summaries.

7.  **Tone**: Maintain an empathetic and informative tone.

8.  **Disclaimer**: Conclude your entire response with the following disclaimer, exactly as written, on a new line:
    "Disclaimer: This summary is AI-generated for informational purposes only and is not a substitute for professional medical advice. Consult with a qualified healthcare provider for any health concerns."

If ALL three sources (User Profile is sparse, and Document Insights and Chat Insights are their placeholder messages) provide genuinely no specific health information, your 'overallHealthSummary' should clearly state that a comprehensive summary cannot be generated due to insufficient information, followed by the disclaimer. Do not invent information.
`,
});

const generateOverallHealthSummaryFlow = ai.defineFlow(
  {
    name: 'generateOverallHealthSummaryFlow',
    inputSchema: GenerateOverallHealthSummaryInputSchema, // Expects userProfile and consolidated summaries from client
    outputSchema: GenerateOverallHealthSummaryOutputSchema,
  },
  async (input) => {
    console.log('[generateOverallHealthSummaryFlow] Received input:', JSON.stringify(input, null, 2).substring(0, 500) + "...");

    // Use summaries directly from input
    const docSummaryFromClient = input.consolidatedDocumentAnalysisSummary;
    const chatSummaryFromClient = input.consolidatedChatSummary;

    console.log('[generateOverallHealthSummaryFlow] docSummaryFromClient (received):', docSummaryFromClient);
    console.log('[generateOverallHealthSummaryFlow] chatSummaryFromClient (received):', chatSummaryFromClient);

    const documentAnalysisContentForPrompt = (docSummaryFromClient && docSummaryFromClient.trim() !== "") ? docSummaryFromClient : PLACEHOLDER_NO_DOC_SUMMARY;
    const chatSessionContentForPrompt = (chatSummaryFromClient && chatSummaryFromClient.trim() !== "") ? chatSummaryFromClient : PLACEHOLDER_NO_CHAT_SUMMARY;

    console.log('[generateOverallHealthSummaryFlow] documentAnalysisContentForPrompt (to AI):', documentAnalysisContentForPrompt);
    console.log('[generateOverallHealthSummaryFlow] chatSessionContentForPrompt (to AI):', chatSessionContentForPrompt);

    const isProfileEffectivelyEmpty = !input.userProfile ||
                                     (!input.userProfile.name?.trim() &&
                                      (input.userProfile.age === undefined || input.userProfile.age === null) &&
                                      !input.userProfile.gender?.trim() &&
                                      (!input.userProfile.existingConditions || input.userProfile.existingConditions.length === 0) &&
                                      (!input.userProfile.allergies || input.userProfile.allergies.length === 0));

    if (isProfileEffectivelyEmpty && documentAnalysisContentForPrompt === PLACEHOLDER_NO_DOC_SUMMARY && chatSessionContentForPrompt === PLACEHOLDER_NO_CHAT_SUMMARY) {
      console.log('[generateOverallHealthSummaryFlow] Bailing out early: Not enough data for summary.');
      return {
        overallHealthSummary: "A comprehensive health summary cannot be generated at this time due to insufficient information in your profile and no available insights from document analyses or chat sessions.\n\nDisclaimer: This summary is AI-generated for informational purposes only and is not a substitute for professional medical advice. Consult with a qualified healthcare provider for any health concerns.",
        lastUpdated: new Date().toISOString(),
      };
    }

    const promptInputData = {
      userProfile: input.userProfile,
      documentAnalysisContent: documentAnalysisContentForPrompt,
      chatSessionContent: chatSessionContentForPrompt,
    };
    console.log('[generateOverallHealthSummaryFlow] promptInputData (full object to AI):', JSON.stringify(promptInputData, null, 2));

    const {output: aiOutput} = await prompt(promptInputData);

    if (!aiOutput || !aiOutput.overallHealthSummary || aiOutput.overallHealthSummary.trim() === "") {
      console.warn('[generateOverallHealthSummaryFlow] AI returned empty or no summary.');
      return {
        overallHealthSummary: "Could not generate an AI health summary at this time. This might be due to a temporary issue or lack of sufficient distinct information for synthesis.\n\nDisclaimer: This summary is AI-generated for informational purposes only and is not a substitute for professional medical advice. Consult with a qualified healthcare provider for any health concerns.",
        lastUpdated: new Date().toISOString(),
      };
    }
    
    let summaryText = aiOutput.overallHealthSummary;
    const disclaimer = "Disclaimer: This summary is AI-generated for informational purposes only and is not a substitute for professional medical advice. Consult with a qualified healthcare provider for any health concerns.";
    if (!summaryText.includes(disclaimer)) {
        summaryText = summaryText.trim() + "\n\n" + disclaimer;
        console.log('[generateOverallHealthSummaryFlow] Disclaimer appended by flow logic.');
    }
    console.log('[generateOverallHealthSummaryFlow] Final AI-generated summary (with disclaimer):', summaryText);

    return {
        overallHealthSummary: summaryText,
        lastUpdated: new Date().toISOString(),
    };
  }
);

    