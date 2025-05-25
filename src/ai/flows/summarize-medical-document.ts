
'use server';

/**
 * @fileOverview Summarizes key information from uploaded medical documents and organizes it chronologically.
 *
 * - summarizeMedicalDocument - A function that handles the summarization process.
 * - SummarizeMedicalDocumentInput - The input type for the summarizeMedicalDocument function.
 * - SummarizeMedicalDocumentOutput - The return type for the summarizeMedicalDocument function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeMedicalDocumentInputSchema = z.object({
  documentDataUri: z
    .string()
    .describe(
      "The medical document, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});

export type SummarizeMedicalDocumentInput = z.infer<
  typeof SummarizeMedicalDocumentInputSchema
>;

const KeyMetricSchema = z.object({
  name: z.string().describe('Name of the health metric, e.g., "Heart Rate", "Blood Glucose"'),
  value: z.string().describe('Value of the metric, e.g., "72", "120/80"'),
  unit: z.string().optional().describe('Unit of the metric, e.g., "bpm", "mg/dL"'),
  date: z.string().optional().describe('Date of the metric reading, if available (YYYY-MM-DD)'),
  normalRange: z.string().optional().nullable().describe('Normal range for the metric, if explicitly available in the document (e.g., "60-100", "<120", "3.5-5.0"). This is crucial for interpretation.')
});
export type KeyMetric = z.infer<typeof KeyMetricSchema>;


const DocumentValidationSchema = z.object({
    isMedicalDocument: z.boolean().describe("Whether the AI believes this is a medical document (or relevant media like a medical video/image)."),
    rejectionReason: z.string().optional().describe("If not a medical document or if file type is unsupported, a brief reason."),
});

const SummarizeMedicalDocumentOutputSchema = z.object({
  validation: DocumentValidationSchema.optional().describe("AI's assessment of the document's relevance and validity."),
  overallSummary: z.string().describe('A concise, chronological summary of the medical document/media. If not a medical doc, this might be an error or note. If video, describe key visual/audio points if possible.'),
  keyMetrics: z.array(KeyMetricSchema).optional().describe('List of key health metrics extracted, with values, units, dates, and importantly, their normal ranges if stated in the document.'),
  identifiedConditions: z.array(z.string()).optional().describe('List of medical conditions mentioned or diagnosed in the document/media.'),
  mentionedMedications: z.array(z.string()).optional().describe('List of medications mentioned in the document/media.'),
  suggestedCategory: z.string().optional().describe('A suggested category for this document/media, e.g., "Lab Results", "Consultation Note", "Prescription", "Imaging Report", "Medical Video". Choose from a predefined list if possible or suggest a new one. If not a medical document, suggest "Non-Medical" or "Other".'),
});

export type SummarizeMedicalDocumentOutput = z.infer<
  typeof SummarizeMedicalDocumentOutputSchema
>;

export async function summarizeMedicalDocument(
  input: SummarizeMedicalDocumentInput
): Promise<SummarizeMedicalDocumentOutput> {
  return summarizeMedicalDocumentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeMedicalDocumentPrompt',
  input: {schema: SummarizeMedicalDocumentInputSchema},
  output: {schema: SummarizeMedicalDocumentOutputSchema},
  prompt: `You are a medical expert AI. Your task is to analyze the provided document or media (image, video, text).

First, assess the document/media:
1.  **Validation**: Determine if this document/media is medically relevant.
    - Set \\\`validation.isMedicalDocument\\\` to true or false.
    - If it's not medically relevant, set \\\`validation.rejectionReason\\\` (e.g., "Appears to be a general text file, not a medical report.", "Video content is not related to medical information.") and set \\\`suggestedCategory\\\` to "Non-Medical" or "Uncategorized". The \\\`overallSummary\\\` should state it's not a medical document/media. Skip health-specific extraction.

If it IS medically relevant:
Extract the following information and structure it according to the output schema:
1.  **overallSummary**: Provide a concise, chronological summary of the document's/media's key contents. For videos, try to describe key visual elements or transcribe relevant audio if possible. If the video content cannot be processed for detailed summary, state that clearly.
2.  **keyMetrics**: Identify and list important health metrics. For each metric, include its name, value, unit (if applicable), the date of the reading (if available, format as YYYY-MM-DD)), and crucially, the **normalRange** if explicitly stated in the document (e.g., "60-100", "<120", "3.5-5.0"). If no normal range is stated for a metric, omit the normalRange field or set it to null for that metric.
3.  **identifiedConditions**: List any medical conditions, diagnoses, or significant symptoms mentioned or visually/audibly apparent.
4.  **mentionedMedications**: List any medications prescribed or mentioned.
5.  **suggestedCategory**: Suggest a category for this document/media. Choose one from: "Lab Results", "Consultation Note", "Prescription", "Imaging Report", "Medical Video", "Symptom Diary (Image/Video)", "Hospital Discharge Summary", "Immunization Record", "Surgical Report", "Pathology Report", "Other". If none fit well, suggest a concise new category.

Medical Document/Media: {{media url=documentDataUri}}

Ensure the output is in the specified JSON format. For keyMetrics, if a normal range is not present in the document, ensure the normalRange field for that specific metric is null or omitted from the output for that metric.
`,
});

// Helper function to extract MIME type from data URI
function getMimeTypeFromDataUri(dataUri: string): string | null {
  const match = dataUri.match(/^data:([A-Za-z-+\/]+);base64,/);
  return match ? match[1] : null;
}

const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'text/markdown',
  'video/mp4',
  'video/webm',
  'video/quicktime', // .mov
  'video/ogg',
];


const summarizeMedicalDocumentFlow = ai.defineFlow(
  {
    name: 'summarizeMedicalDocumentFlow',
    inputSchema: SummarizeMedicalDocumentInputSchema,
    outputSchema: SummarizeMedicalDocumentOutputSchema,
  },
  async input => {
    const mimeType = getMimeTypeFromDataUri(input.documentDataUri);

    if (!mimeType || !SUPPORTED_MIME_TYPES.includes(mimeType.toLowerCase())) {
      const rejectionReason = `Unsupported file type: ${mimeType || 'unknown'}. Please upload PDF, common image formats (PNG, JPG, WEBP), common video formats (MP4, WEBM, MOV, OGG), or plain text/markdown files.`;
      return {
        validation: {
          isMedicalDocument: false,
          rejectionReason: rejectionReason,
        },
        overallSummary: rejectionReason,
        keyMetrics: [],
        identifiedConditions: [],
        mentionedMedications: [],
        suggestedCategory: "Rejected/Invalid",
      };
    }
    
    const {output} = await prompt(input);
    if (!output) {
      // If the AI returns no output at all, it's a failure.
      return {
        validation: {
          isMedicalDocument: false,
          rejectionReason: "AI failed to generate a response for the document/media.",
        },
        overallSummary: "AI processing failed. The document/media could not be analyzed.",
        keyMetrics: [],
        identifiedConditions: [],
        mentionedMedications: [],
        suggestedCategory: "Processing Error",
      };
    }
    
    const finalValidation = output.validation || { isMedicalDocument: false, rejectionReason: "AI assessment missing." };
    if (output.validation === undefined) { 
        if (output.suggestedCategory === "Non-Medical" || output.overallSummary?.toLowerCase().includes("not a medical document")) {
            finalValidation.isMedicalDocument = false;
            finalValidation.rejectionReason = output.overallSummary || "Assessed as non-medical by AI.";
        } else if (output.keyMetrics?.length || output.identifiedConditions?.length) {
            finalValidation.isMedicalDocument = true; 
        } else if (mimeType.startsWith('video/') && !output.overallSummary?.toLowerCase().includes("not a medical")) {
            finalValidation.isMedicalDocument = true; 
            finalValidation.rejectionReason = output.overallSummary?.includes("unable to process video") || output.overallSummary?.includes("cannot summarize video") ? output.overallSummary : undefined;
        }
         else {
            finalValidation.isMedicalDocument = false; 
            finalValidation.rejectionReason = "Unable to determine if medical document/media from content.";
        }
    }


    return {
        validation: finalValidation,
        overallSummary: output.overallSummary || (finalValidation.isMedicalDocument ? "No summary available." : finalValidation.rejectionReason || "Document/media could not be processed as medical content."),
        keyMetrics: finalValidation.isMedicalDocument ? (output.keyMetrics || []).map(km => ({...km, normalRange: km.normalRange === undefined ? null : km.normalRange })) : [], // Ensure normalRange is null if undefined
        identifiedConditions: finalValidation.isMedicalDocument ? (output.identifiedConditions || []) : [],
        mentionedMedications: finalValidation.isMedicalDocument ? (output.mentionedMedications || []) : [],
        suggestedCategory: output.suggestedCategory || (finalValidation.isMedicalDocument ? (mimeType.startsWith('video/') ? "Medical Video" : "Uncategorized") : "Non-Medical"),
    };
  }
);

