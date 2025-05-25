
'use server';
/**
 * @fileOverview Incrementally updates a consolidated summary of user's document analyses.
 *
 * - updateDocumentAnalysisSummary - A function to merge new document findings into an existing summary.
 * - UpdateDocumentAnalysisSummaryInput - Input type for this function.
 * - UpdateDocumentAnalysisSummaryOutput - Output type for this function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Schema for the analysis of a new document
const NewDocumentAnalysisSchema = z.object({
  documentName: z.string().describe("The name of the newly analyzed document."),
  uploadDate: z.string().optional().describe("ISO date string of when the document was uploaded or its stated date."),
  suggestedCategory: z.string().optional().describe("AI-suggested category for this document (e.g., 'Lab Results', 'Consultation Note')."),
  documentAISummary: z.string().describe("The AI-generated summary for this specific new document."),
  identifiedConditionsInDoc: z.array(z.string()).optional().describe("Medical conditions explicitly mentioned or diagnosed in this new document."),
  keyMetricsExtracted: z.array(z.object({
    name: z.string(),
    value: z.string(),
    unit: z.string().optional(),
    normalRange: z.string().optional().nullable().describe("Normal range for the metric, if available from the document."), // Added normalRange
  })).optional().describe("Key health metrics extracted from this new document, especially abnormal ones, including their normal ranges if known."),
});
export type NewDocumentAnalysis = z.infer<typeof NewDocumentAnalysisSchema>;

// Schema for the user's general profile context
const UserProfileContextSchema = z.object({
  age: z.number().optional().nullable().describe("User's age."),
  gender: z.string().optional().nullable().describe("User's gender."),
  existingConditions: z.array(z.string()).optional().describe("User's known pre-existing conditions."),
});
export type UserProfileContext = z.infer<typeof UserProfileContextSchema>;

// Input schema for the flow
const UpdateDocumentAnalysisSummaryInputSchema = z.object({
  previousDocSummary: z.string().nullable().optional().describe("The existing consolidated summary of all previous document analyses. If null or empty, a new summary will be initiated."),
  newDocumentAnalysis: NewDocumentAnalysisSchema.describe("The analysis results of the latest document to integrate."),
  userProfileContext: UserProfileContextSchema.optional().describe("Brief context about the user to help tailor the summary."),
});
export type UpdateDocumentAnalysisSummaryInput = z.infer<typeof UpdateDocumentAnalysisSummaryInputSchema>;

// Output schema for the flow
const UpdateDocumentAnalysisSummaryOutputSchema = z.object({
  updatedDocumentAnalysisSummary: z.string().describe("The new, updated consolidated summary incorporating the latest document's findings."),
});
export type UpdateDocumentAnalysisSummaryOutput = z.infer<typeof UpdateDocumentAnalysisSummaryOutputSchema>;

export async function updateDocumentAnalysisSummary(input: UpdateDocumentAnalysisSummaryInput): Promise<UpdateDocumentAnalysisSummaryOutput> {
  return updateDocumentAnalysisSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'updateDocumentAnalysisSummaryPrompt',
  input: {schema: UpdateDocumentAnalysisSummaryInputSchema},
  output: {schema: UpdateDocumentAnalysisSummaryOutputSchema},
  prompt: `You are an AI medical data analyst. Your task is to incrementally update a consolidated summary of a user's medical document analyses.

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

Previous Consolidated Document Analysis Summary:
{{#if previousDocSummary}}
{{{previousDocSummary}}}
{{else}}
This is the first document analysis to summarize.
{{/if}}

New Document Analysis to Integrate:
- Document Name: "{{newDocumentAnalysis.documentName}}" ({{newDocumentAnalysis.suggestedCategory}}, Uploaded: *{{newDocumentAnalysis.uploadDate}}*)
- AI Summary of this Document: {{{newDocumentAnalysis.documentAISummary}}}
{{#if newDocumentAnalysis.identifiedConditionsInDoc}}
- Conditions Mentioned in this Document: {{#each newDocumentAnalysis.identifiedConditionsInDoc}}**{{{this}}}**{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}
{{#if newDocumentAnalysis.keyMetricsExtracted}}
- Key Metrics in this Document:
  {{#each newDocumentAnalysis.keyMetricsExtracted}}
  - {{name}}: {{value}} {{unit}} {{#if normalRange}}(Normal: {{normalRange}}){{else}}(Normal range not specified in doc){{/if}}
  {{/each}}
{{/if}}

Instructions:
1.  Review the 'Previous Consolidated Document Analysis Summary'.
2.  Analyze the 'New Document Analysis to Integrate'. Pay attention to any metrics reported outside their 'Normal Range' if provided.
3.  Combine the information into a concise, updated summary ('updatedDocumentAnalysisSummary').
    - Your primary goal is to integrate the new document's findings with the previous summary.
    - If the 'Previous Consolidated Document Analysis Summary' is empty or null, create a new summary based on the 'New Document Analysis to Integrate'. Start this new summary with a clear heading like "Summary of Analyzed Medical Documents:".
    - If there was a previous summary, append or integrate the new document's findings logically. Group related findings if possible (e.g., multiple lab reports about blood sugar over time).
    - The 'updatedDocumentAnalysisSummary' **must not be an empty string** if there is new information to incorporate or if a new summary is being created. If the new document was non-medical or had no significant findings, and the previous summary was also empty, you can state "No significant medical information extracted from documents yet."
    - Highlight significant new findings, trends, or newly identified conditions/metrics. If a metric is provided with a normal range and its value is outside this range, consider mentioning it. Use **bold** for conditions. Use *italics* for dates.
    - The summary should be easy to read. Use clear, simple language suitable for a patient.
    - Use markdown for light formatting (like bullet points) if it enhances readability.

Example of how to integrate:
If previous summary was:
"Summary of Analyzed Medical Documents:
- Blood test (*Jan 2023*): Glucose 110 mg/dL (slightly elevated).
 - Consultation note (*Feb 2023*): Discussed diet and exercise."
And new document is:
"- Document: 'Lab Report Bloodwork' (Lab Results, Uploaded: *July 2023*), Summary: Follow-up blood work. Glucose now 102 mg/dL. Other values normal. Identified Conditions: **Pre-diabetes** (resolved). Key Metrics: Glucose: 102 mg/dL (Normal: 70-100 mg/dL)."
Updated summary might be:
"Summary of Analyzed Medical Documents:
- Blood Glucose Monitoring:
  - *Jan 2023* (Blood test): Glucose 110 mg/dL (slightly elevated).
  - *July 2023* ('Lab Report Bloodwork'): Glucose 102 mg/dL (Normal: 70-100 mg/dL - improved, still slightly above upper normal). Condition **Pre-diabetes** mentioned as resolved.
- Consultation (*Feb 2023*): Discussed diet and exercise."

Focus on clarity and accurately reflecting the new information in the context of the old. Ensure 'updatedDocumentAnalysisSummary' is never empty if there's content to report.
`,
});

const updateDocumentAnalysisSummaryFlow = ai.defineFlow(
  {
    name: 'updateDocumentAnalysisSummaryFlow',
    inputSchema: UpdateDocumentAnalysisSummaryInputSchema,
    outputSchema: UpdateDocumentAnalysisSummaryOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output || !output.updatedDocumentAnalysisSummary) {
      // Fallback in case AI fails
      if (!input.previousDocSummary && input.newDocumentAnalysis.documentAISummary.toLowerCase().includes("non-medical") && (!input.newDocumentAnalysis.identifiedConditionsInDoc || input.newDocumentAnalysis.identifiedConditionsInDoc.length === 0)) {
         return { updatedDocumentAnalysisSummary: "No significant medical information extracted from documents yet."};
      }
      return {
        updatedDocumentAnalysisSummary: input.previousDocSummary || "Error: Could not update document analysis summary.",
      };
    }
    if (output.updatedDocumentAnalysisSummary.trim() === "") {
        if (!input.previousDocSummary && input.newDocumentAnalysis.documentAISummary.toLowerCase().includes("non-medical") && (!input.newDocumentAnalysis.identifiedConditionsInDoc || input.newDocumentAnalysis.identifiedConditionsInDoc.length === 0)) {
           return { updatedDocumentAnalysisSummary: "No significant medical information extracted from documents yet."};
        }
        return { updatedDocumentAnalysisSummary: input.previousDocSummary || "Document summary generation resulted in empty content."};
    }
    return output;
  }
);

    
