
'use server';
/**
 * @fileOverview Generates an overall health summary for a user by fetching their profile data,
 * consolidated document analysis summary, and consolidated chat summary from Firestore.
 * This information is then passed to an AI model for synthesis and formatting.
 *
 * - generateOverallHealthSummary - Main exported function.
 * - GenerateOverallHealthSummaryInput - Input type for this flow (userId).
 * - GenerateOverallHealthSummaryOutput - Output type (summary, lastUpdated, and debug fields).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Schema for the user profile data that will be passed to the AI prompt
const UserProfileForAISchema = z.object({
  name: z.string().optional().describe("User's name."),
  age: z.number().optional().nullable().describe("User's current age."),
  gender: z.string().optional().nullable().describe("User's gender."),
  height: z.number().optional().nullable().describe("User's height in cm."),
  weight: z.number().optional().nullable().describe("User's weight in kg."),
  bmi: z.number().optional().nullable().describe("User's calculated BMI."),
  existingConditions: z.array(z.string()).optional().describe("User's known pre-existing medical conditions."),
  allergies: z.array(z.string()).optional().describe("User's known allergies."),
});
type UserProfileForAI = z.infer<typeof UserProfileForAISchema>;

// External input to the flow: just the userId
const GenerateOverallHealthSummaryInputSchema = z.object({
  userId: z.string().describe("The ID of the user for whom to generate the summary."),
  // userProfile is now fetched internally based on userId
});
export type GenerateOverallHealthSummaryInput = z.infer<typeof GenerateOverallHealthSummaryInputSchema>;

// Output of the flow, including debug fields
const GenerateOverallHealthSummaryOutputSchema = z.object({
  overallHealthSummary: z.string().describe("A holistic, easy-to-understand summary of the user's health, formatted with markdown."),
  lastUpdated: z.string().describe("ISO string timestamp of when this summary was generated."),
  debug_fetchedDocSummary: z.string().optional().describe("DEBUG: Raw consolidated document summary fetched from Firestore."),
  debug_fetchedChatSummary: z.string().optional().describe("DEBUG: Raw consolidated chat summary fetched from Firestore."),
  debug_promptInputToAI: z.string().optional().describe("DEBUG: JSON string of the full input object sent to the AI prompt."),
});
export type GenerateOverallHealthSummaryOutput = z.infer<typeof GenerateOverallHealthSummaryOutputSchema>;

// Main exported function
export async function generateOverallHealthSummary(input: GenerateOverallHealthSummaryInput): Promise<GenerateOverallHealthSummaryOutput> {
  return generateOverallHealthSummaryFlow(input);
}

// Define specific placeholder strings
const PLACEHOLDER_NO_DOC_SUMMARY = "NO_DOCUMENT_ANALYSIS_SUMMARY_AVAILABLE_FOR_REVIEW";
const PLACEHOLDER_NO_CHAT_SUMMARY = "NO_AI_HEALTH_CHAT_SUMMARY_AVAILABLE_FOR_REVIEW";

// Schema for the data object that will be passed to the AI prompt
const AIPromptInputDataSchema = z.object({
  userProfile: UserProfileForAISchema.optional(),
  documentAnalysisContent: z.string().describe("Consolidated text from medical document analyses. This will be the actual summary or a specific placeholder if none exists."),
  chatSessionContent: z.string().describe("Consolidated text from AI chat sessions. This will be the actual summary or a specific placeholder if none exists."),
});

const prompt = ai.definePrompt({
  name: 'generateOverallHealthSummaryPrompt_v3',
  input: { schema: AIPromptInputDataSchema },
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
    name: 'generateOverallHealthSummaryFlow_v3',
    inputSchema: GenerateOverallHealthSummaryInputSchema,
    outputSchema: GenerateOverallHealthSummaryOutputSchema,
  },
  async (input) => {
    console.log('[generateOverallHealthSummaryFlow] Received input for userId:', input.userId);

    let userProfileForAI: UserProfileForAI = {};
    let docSummaryFromDb: string | null = null;
    let chatSummaryFromDb: string | null = null;
    let allUserData: any = null;

    if (input.userId) {
      try {
        const userDocRef = doc(db, 'users', input.userId);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          console.log('[generateOverallHealthSummaryFlow] User document found in Firestore.');
          allUserData = userDocSnap.data();
          console.log('[generateOverallHealthSummaryFlow] Full userData from Firestore:', JSON.stringify(allUserData, null, 2));

          // Populate userProfileForAI from fetched data
          userProfileForAI = {
            name: allUserData.name || undefined,
            age: allUserData.age === undefined ? null : allUserData.age,
            gender: allUserData.gender === undefined ? null : allUserData.gender,
            height: allUserData.height === undefined ? null : allUserData.height,
            weight: allUserData.weight === undefined ? null : allUserData.weight,
            bmi: undefined, // Will be calculated if height and weight are present
            existingConditions: allUserData.existingConditions || [],
            allergies: allUserData.allergies || [],
          };

          if (userProfileForAI.height && userProfileForAI.weight && userProfileForAI.height > 0) {
            const heightM = userProfileForAI.height / 100;
            userProfileForAI.bmi = parseFloat((userProfileForAI.weight / (heightM * heightM)).toFixed(1));
          }
          
          docSummaryFromDb = allUserData.consolidatedDocumentAnalysisSummary || null;
          chatSummaryFromDb = allUserData.consolidatedChatSummary || null;

          console.log('[generateOverallHealthSummaryFlow] Fetched docSummaryFromDb (from Firestore):', docSummaryFromDb);
          console.log('[generateOverallHealthSummaryFlow] Fetched chatSummaryFromDb (from Firestore):', chatSummaryFromDb);

        } else {
          console.warn(`[generateOverallHealthSummaryFlow] User document not found for userId: ${input.userId}`);
        }
      } catch (error) {
        console.error("[generateOverallHealthSummaryFlow] Error fetching user document:", error);
      }
    } else {
        console.warn('[generateOverallHealthSummaryFlow] No userId provided in input.');
    }

    // Prepare content for the AI prompt, using placeholders if DB data is null/empty
    const documentAnalysisContentForPrompt = (docSummaryFromDb && docSummaryFromDb.trim() !== "") ? docSummaryFromDb : PLACEHOLDER_NO_DOC_SUMMARY;
    const chatSessionContentForPrompt = (chatSummaryFromDb && chatSummaryFromDb.trim() !== "") ? chatSummaryFromDb : PLACEHOLDER_NO_CHAT_SUMMARY;

    console.log('[generateOverallHealthSummaryFlow] documentAnalysisContentForPrompt (to AI):', documentAnalysisContentForPrompt);
    console.log('[generateOverallHealthSummaryFlow] chatSessionContentForPrompt (to AI):', chatSessionContentForPrompt);


    const isProfileEffectivelyEmpty = !userProfileForAI.name && userProfileForAI.age === null && userProfileForAI.gender === null &&
                                      (!userProfileForAI.existingConditions || userProfileForAI.existingConditions.length === 0) &&
                                      (!userProfileForAI.allergies || userProfileForAI.allergies.length === 0);

    if (isProfileEffectivelyEmpty && documentAnalysisContentForPrompt === PLACEHOLDER_NO_DOC_SUMMARY && chatSessionContentForPrompt === PLACEHOLDER_NO_CHAT_SUMMARY) {
      const noDataSummary = "A comprehensive health summary cannot be generated at this time due to insufficient information in your profile and no available insights from document analyses or chat sessions.\n\nDisclaimer: This summary is AI-generated for informational purposes only and is not a substitute for professional medical advice. Consult with a qualified healthcare provider for any health concerns.";
      console.log('[generateOverallHealthSummaryFlow] Bailing out early: Not enough data for summary.');
      return {
        overallHealthSummary: noDataSummary,
        lastUpdated: new Date().toISOString(),
        debug_fetchedDocSummary: docSummaryFromDb || "",
        debug_fetchedChatSummary: chatSummaryFromDb || "",
        debug_promptInputToAI: JSON.stringify({ userProfile: userProfileForAI, documentAnalysisContent: documentAnalysisContentForPrompt, chatSessionContent: chatSessionContentForPrompt }, null, 2),
      };
    }

    const promptInputData: z.infer<typeof AIPromptInputDataSchema> = {
      userProfile: userProfileForAI,
      documentAnalysisContent: documentAnalysisContentForPrompt,
      chatSessionContent: chatSessionContentForPrompt,
    };
    console.log('[generateOverallHealthSummaryFlow] promptInputData (full object to AI):', JSON.stringify(promptInputData, null, 2));

    const {output: aiOutput} = await prompt(promptInputData);

    if (!aiOutput || !aiOutput.overallHealthSummary || aiOutput.overallHealthSummary.trim() === "") {
      const failureSummary = "Could not generate an AI health summary at this time. This might be due to a temporary issue or lack of sufficient distinct information for synthesis.\n\nDisclaimer: This summary is AI-generated for informational purposes only and is not a substitute for professional medical advice. Consult with a qualified healthcare provider for any health concerns.";
      console.warn('[generateOverallHealthSummaryFlow] AI returned empty or no summary.');
      return {
        overallHealthSummary: failureSummary,
        lastUpdated: new Date().toISOString(),
        debug_fetchedDocSummary: docSummaryFromDb || "",
        debug_fetchedChatSummary: chatSummaryFromDb || "",
        debug_promptInputToAI: JSON.stringify(promptInputData, null, 2),
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
        debug_fetchedDocSummary: docSummaryFromDb || "",
        debug_fetchedChatSummary: chatSummaryFromDb || "",
        debug_promptInputToAI: JSON.stringify(promptInputData, null, 2),
    };
  }
);

    