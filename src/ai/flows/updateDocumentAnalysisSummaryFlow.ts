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
  uploadDate: z.string().optional().describe("ISO date string of when the document was uploaded."),
  documentDate: z.string().optional().nullable().describe("Actual date from document content (YYYY-MM-DD), if available."),
  suggestedCategory: z.string().optional().describe("AI-suggested category for this document (e.g., 'Lab Results', 'Consultation Note')."),
  documentAISummary: z.string().describe("The AI-generated summary for this specific new document (in English)."),
  identifiedConditionsInDoc: z.array(z.string()).optional().describe("Medical conditions (in English) explicitly mentioned or diagnosed in this new document."),
  keyMetricsExtracted: z.array(z.object({
    name: z.string(),
    value: z.string(),
    unit: z.string().optional(),
    normalRange: z.string().optional().nullable().describe("Normal range for the metric, if available from the document."),
    date: z.string().optional().nullable().describe("Specific date of the metric reading (YYYY-MM-DD), if available."),
  })).optional().describe("Key health metrics (names and units in English) extracted from this new document, especially abnormal ones, including their normal ranges and specific dates if known."),
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
  updatedDocumentAnalysisSummary: z.string().describe("The new, updated consolidated summary (in English) incorporating the latest document's findings."),
});
export type UpdateDocumentAnalysisSummaryOutput = z.infer<typeof UpdateDocumentAnalysisSummaryOutputSchema>;

export async function updateDocumentAnalysisSummary(input: UpdateDocumentAnalysisSummaryInput): Promise<UpdateDocumentAnalysisSummaryOutput> {
  return updateDocumentAnalysisSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'updateDocumentAnalysisSummaryPrompt_v2',
  input: {schema: UpdateDocumentAnalysisSummaryInputSchema},
  output: {schema: UpdateDocumentAnalysisSummaryOutputSchema},
  prompt: `You are an AI medical data analyst. Your task is to incrementally update a consolidated summary of a user's medical document analyses. **All output must be in English.**

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
- Document Name: "{{newDocumentAnalysis.documentName}}" (Category: {{newDocumentAnalysis.suggestedCategory}}, Document Date: {{#if newDocumentAnalysis.documentDate}}*{{newDocumentAnalysis.documentDate}}*{{else}}Date not specified in doc{{/if}}, Uploaded: *{{newDocumentAnalysis.uploadDate}}*)
- AI Summary of this Document (in English): {{{newDocumentAnalysis.documentAISummary}}}
{{#if newDocumentAnalysis.identifiedConditionsInDoc}}
- Conditions Mentioned in this Document (in English): {{#each newDocumentAnalysis.identifiedConditionsInDoc}}**{{{this}}}**{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}
{{#if newDocumentAnalysis.keyMetricsExtracted}}
- Key Metrics in this Document (names/units in English):
  {{#each newDocumentAnalysis.keyMetricsExtracted}}
  - {{name}}: {{value}} {{#if unit}}{{unit}}{{/if}} {{#if date}}(*{{date}}*){{/if}} {{#if normalRange}}(Normal: {{normalRange}}){{else}}(Normal range not specified in doc){{/if}}
  {{/each}}
{{/if}}

Instructions:
1.  Review the 'Previous Consolidated Document Analysis Summary'.
2.  Analyze the 'New Document Analysis to Integrate'. Pay attention to the document's internal date ('Document Date') if available, for chronological ordering. Note any metrics reported outside their 'Normal Range' if provided, and newly **identified conditions**.
3.  Combine the information into a concise, updated summary ('updatedDocumentAnalysisSummary') **in English**.
    -   **Crucially, ensure all distinct and significant information from the \`previousDocSummary\` is preserved and carried over into the \`updatedDocumentAnalysisSummary\`.** The new information should be added or woven in logically (e.g., chronologically based on 'Document Date' or 'Upload Date', or by medical topic). Do not simply replace or discard older relevant findings unless explicitly superseded by new, more definitive information from the \`newDocumentAnalysis\`.
    -   If \`previousDocSummary\` is empty, indicates it's the first document, or contains a placeholder like 'No significant medical information extracted...', then the \`updatedDocumentAnalysisSummary\` should be primarily based on the \`newDocumentAnalysis\`, structured as a good starting point for future consolidations. Start this new summary with a clear heading like "Summary of Analyzed Medical Documents:".
    *   Highlight significant new findings, trends, or newly identified conditions/metrics from the 'New Document Analysis to Integrate'. Use **bold** for new conditions. Use *italics* for the new document's date (prioritize 'Document Date' if available, otherwise 'Upload Date').
    -   The 'updatedDocumentAnalysisSummary' **must not be an empty string** if there is new information to incorporate or if a new summary is being created. If the new document was non-medical or had no significant findings, and the previous summary was also effectively empty, you can state "No significant medical information extracted from documents yet."
    -   The summary should be easy to read. Use clear, simple language suitable for a patient.
    -   Use markdown for light formatting (like bullet points) if it enhances readability.

Example of how to integrate:
If previous summary was:
"Summary of Analyzed Medical Documents:
- Blood test (*Jan 2023*): Glucose 110 mg/dL (slightly elevated).
 - Consultation note (*Feb 2023*): Discussed diet and exercise."
And new document is:
"- Document: 'Lab Report Bloodwork' (Category: Lab Results, Document Date: *July 15, 2023*, Uploaded: *July 20, 2023*), Summary: Follow-up blood work. Glucose now 102 mg/dL. Identified Conditions: **Pre-diabetes** (noted as resolved). Key Metrics: Glucose: 102 mg/dL (Normal: 70-100 mg/dL)."
Updated summary might be:
"Summary of Analyzed Medical Documents:
- Consultation note (*Feb 2023*): Discussed diet and exercise.
- Blood Glucose Monitoring:
  - *Jan 2023* (Blood test): Glucose 110 mg/dL (slightly elevated).
  - *July 15, 2023* ('Lab Report Bloodwork'): Glucose 102 mg/dL (Normal: 70-100 mg/dL - improved, still slightly above upper normal). Document notes **Pre-diabetes** as resolved."

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
      const isNewDocNonMedical = input.newDocumentAnalysis.documentAISummary.toLowerCase().includes("non-medical") || 
                                 input.newDocumentAnalysis.suggestedCategory?.toLowerCase().includes("non-medical") ||
                                 input.newDocumentAnalysis.suggestedCategory?.toLowerCase().includes("rejected");
      const isPrevSummaryPlaceholder = !input.previousDocSummary || 
                                       input.previousDocSummary.trim() === "" ||
                                       input.previousDocSummary.toLowerCase().includes("first document analysis to summarize") ||
                                       input.previousDocSummary.toLowerCase().includes("no significant medical information extracted");

      if (isPrevSummaryPlaceholder && isNewDocNonMedical) {
         return { updatedDocumentAnalysisSummary: "No significant medical information extracted from documents yet."};
      }
      
      const newDocDate = input.newDocumentAnalysis.documentDate || input.newDocumentAnalysis.uploadDate || 'Unknown Date';
      const newDocSummaryText = `\n\n--- New Document: "${input.newDocumentAnalysis.documentName}" (*${newDocDate}*) ---\n${input.newDocumentAnalysis.documentAISummary}`;
      return {
        updatedDocumentAnalysisSummary: (input.previousDocSummary && !isPrevSummaryPlaceholder ? input.previousDocSummary : "Summary of Analyzed Medical Documents:") + (isNewDocNonMedical ? "\n(New document was non-medical or had no significant findings.)" : newDocSummaryText),
      };
    }
    if (output.updatedDocumentAnalysisSummary.trim() === "") {
        const isNewDocNonMedical = input.newDocumentAnalysis.documentAISummary.toLowerCase().includes("non-medical") || 
                                 input.newDocumentAnalysis.suggestedCategory?.toLowerCase().includes("non-medical") ||
                                 input.newDocumentAnalysis.suggestedCategory?.toLowerCase().includes("rejected");
        const isPrevSummaryPlaceholder = !input.previousDocSummary || 
                                       input.previousDocSummary.trim() === "" ||
                                       input.previousDocSummary.toLowerCase().includes("first document analysis to summarize") ||
                                       input.previousDocSummary.toLowerCase().includes("no significant medical information extracted");
        if (isPrevSummaryPlaceholder && isNewDocNonMedical) {
           return { updatedDocumentAnalysisSummary: "No significant medical information extracted from documents yet."};
        }
        return { updatedDocumentAnalysisSummary: input.previousDocSummary || "Document summary generation resulted in empty content. New document info may not have been added."};
    }
    return output;
  }
);
