
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
  documentInfo: z.object({
    downloadUrl: z.string().url().describe("Publicly accessible download URL for the document from Cloud Storage."),
    originalFileName: z.string().describe("The original name of the file."),
    mimeType: z.string().describe("The MIME type of the file."),
  })
});

export type SummarizeMedicalDocumentInput = z.infer<
  typeof SummarizeMedicalDocumentInputSchema
>;

const KeyMetricSchema = z.object({
  name: z.string().describe('Name of the health metric, e.g., "Heart Rate", "Blood Glucose". Ensure this name is in English.'),
  value: z.string().describe('Value of the metric, e.g., "72", "120/80"'),
  unit: z.string().optional().describe('Unit of the metric, e.g., "bpm", "mg/dL". Ensure this unit is in English or a standard international abbreviation.'),
  date: z.string().optional().describe('Date of the specific metric reading, if available (YYYY-MM-DD)'),
  normalRange: z.string().optional().nullable().describe('Normal range for the metric, if explicitly available in the document (e.g., "60-100", "<120", "3.5-5.0", or from a "Reference Range" column). This is crucial for interpretation.')
});
export type KeyMetric = z.infer<typeof KeyMetricSchema>;


const DocumentValidationSchema = z.object({
    isMedicalDocument: z.boolean().describe("Whether the AI believes this is a medical document (or relevant media like a medical video/image)."),
    rejectionReason: z.string().optional().describe("If not a medical document or if file type is unsupported, a brief reason (in English)."),
});

const SummarizeMedicalDocumentOutputSchema = z.object({
  validation: DocumentValidationSchema.optional().describe("AI's assessment of the document's relevance and validity."),
  overallSummary: z.string().describe('A concise, chronological summary (2-5 sentences) of the medical document/media, in English. If not a medical doc, this might be an error or note. If video, describe key visual/audio points if possible, in English. If an image (e.g., X-ray), describe what you see and any visible abnormalities or key features, explaining their potential medical significance in simple terms.'),
  documentDate: z.string().optional().describe("The primary date mentioned in the document (e.g., report date, test date, consultation date) in YYYY-MM-DD format, if identifiable by the AI."),
  keyMetrics: z.array(KeyMetricSchema).optional().describe('List of key health metrics extracted (names and units in English), with values, units, dates, and importantly, their normal/reference ranges if stated in the document.'),
  identifiedConditions: z.array(z.string()).optional().describe('List of medical conditions (in English) mentioned or diagnosed in the document/media.'),
  mentionedMedications: z.array(z.string()).optional().describe('List of medications (in English) mentioned in the document/media.'),
  suggestedCategory: z.string().optional().describe('A suggested category for this document/media, in English, e.g., "Lab Results", "Consultation Note", "Prescription", "Imaging Report", "Medical Video". Choose from a predefined list if possible or suggest a new one. If not a medical document, suggest "Non-Medical" or "Other".'),
});

export type SummarizeMedicalDocumentOutput = z.infer<
  typeof SummarizeMedicalDocumentOutputSchema
>;

export async function summarizeMedicalDocument(
  input: SummarizeMedicalDocumentInput
): Promise<SummarizeMedicalDocumentOutput> {
  return summarizeMedicalDocumentFlow(input);
}

// Helper to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

const prompt = ai.definePrompt({
  name: 'summarizeMedicalDocumentPrompt_v4_multilingual_robust', // Updated version
  input: {schema: z.object({ preparedDataUri: z.string(), originalMimeType: z.string(), originalFileName: z.string()}) },
  output: {schema: SummarizeMedicalDocumentOutputSchema},
  prompt: `You are an expert medical AI. Your task is to analyze the provided document or media (original filename: '{{{originalFileName}}}', MIME type: '{{{originalMimeType}}}', content represented as a data URI), which may be in **any language**.
**ALL your output fields (overallSummary, documentDate, metric names, metric units, condition names, medication names, category, rejectionReason) MUST be in English.**

First, assess the document/media based on its content:
1.  **Validation**: Determine if this document/media is medically relevant.
    - Set 'validation.isMedicalDocument' to true or false.
    - If it's not medically relevant (e.g., a general text file, non-medical image/video), set 'validation.rejectionReason' (in English, e.g., "Content does not appear to be medically relevant.", "Video content is not related to medical information.") and set 'suggestedCategory' to "Non-Medical" or "Uncategorized". The 'overallSummary' should state it's not a medical document/media (in English). Skip health-specific extraction.
    - If the content seems like a medical document but is largely uninterpretable or of very poor quality, set 'validation.isMedicalDocument' to 'false' with an appropriate 'validation.rejectionReason' (e.g., "Document content is unreadable or too blurry for analysis.").

If it IS medically relevant:
Extract the following information and structure it according to the output schema. **All textual output must be in English.**

1.  **documentDate**: Identify the primary date of the report, test, or medical event described in the document. This is often labeled as 'Report Date', 'Test Date', 'Date of Service', or similar. Format this as **YYYY-MM-DD**. If multiple dates are present, choose the most prominent one representing the date of the main findings or event. If no clear date is found, omit this field.
2.  **overallSummary**: Provide a concise (target 2-5 sentences, max 7 sentences), chronological summary and **interpretation** of the document's/media's key contents, **in English, suitable for a patient to understand**.
    - If the document is an image (e.g., X-ray, photo of a rash, medical illustration), describe what you see, identify any visible abnormalities or key features, and explain their potential medical significance in simple terms. **Do not just state it's an image; interpret it.**
    - For videos, try to describe key visual elements or transcribe relevant audio if possible, **in English**. If the video content cannot be processed for detailed summary, state that clearly but briefly in the summary.
    - **Crucially, DO NOT include any disclaimers, boilerplate text, apologies, or repetitive statements about AI limitations, your identity as an AI, or advice to consult doctors *within this 'overallSummary' field or any other data field*. Stick strictly to summarizing the document's medical content.**
3.  **keyMetrics**: Identify and list important health metrics. For each metric:
    -   'name': The name of the metric (e.g., "Heart Rate," "Blood Glucose"). **Ensure the name is in English.**
    -   'value': The value of the metric.
    -   'unit': The unit (e.g., "bpm," "mg/dL"). **Translate or standardize to common English units/abbreviations if possible. If unsure about conversion, provide original unit but translate the unit name to English.**
    -   'date': Specific date of this metric reading, if available (YYYY-MM-DD). If not specific to the metric, this can be omitted if a general 'documentDate' is found.
    -   'normalRange': The normal range (often labeled as 'Reference Range', 'Reference Interval', 'Normal Values') if explicitly stated in the document (e.g., "60-100", "<120", "3.5-5.0"). Extract this as accurately as possible. If no normal range is stated, omit this field or set it to null for that metric.
    -   **Do NOT include any disclaimers or explanatory text within individual metric objects.**
4.  **identifiedConditions**: List any medical conditions, diagnoses, or significant symptoms mentioned or visually/audibly apparent. **List them in English. Only list the names.**
5.  **mentionedMedications**: List any medications prescribed or mentioned. **List them in English. Only list the names.**
6.  **suggestedCategory**: Suggest a category for this document/media **in English**. Choose one from: "Lab Results", "Consultation Note", "Prescription", "Imaging Report", "Medical Video", "Symptom Diary (Image/Video)", "Hospital Discharge Summary", "Immunization Record", "Surgical Report", "Pathology Report", "Other". If none fit well, suggest a concise new category. If translation or extraction fails significantly, use "Unclear/Needs Review".

Medical Document/Media Content: {{media url=preparedDataUri}}

Ensure the output is in the specified JSON format. Prioritize accuracy in translation and information extraction. If accurate translation and extraction are not possible due to language complexity or document quality, set 'validation.isMedicalDocument' to 'false' and provide a 'validation.rejectionReason' like 'Could not reliably translate or extract information from the document due to language or format issues.'
Strictly adhere to the output schema and avoid adding any extra text, disclaimers, or conversational elements in your JSON output.
`,
});

const SUPPORTED_MIME_TYPES_FOR_AI = [ // MIME types AI can generally process well
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'text/markdown',
  'video/mp4', 
  'video/quicktime', // .mov
  'video/webm',
  'video/ogg',
];


const summarizeMedicalDocumentFlow = ai.defineFlow(
  {
    name: 'summarizeMedicalDocumentFlow',
    inputSchema: SummarizeMedicalDocumentInputSchema,
    outputSchema: SummarizeMedicalDocumentOutputSchema,
  },
  async (input) => {
    const { downloadUrl, originalFileName, mimeType } = input.documentInfo;

    if (!SUPPORTED_MIME_TYPES_FOR_AI.includes(mimeType.toLowerCase())) {
      const rejectionReason = `Unsupported file type for AI analysis: ${mimeType}. Supported types include PDF, common images (PNG, JPG, WEBP), text, markdown, and common video formats (MP4, MOV, WEBM, OGG).`;
      return {
        validation: { isMedicalDocument: false, rejectionReason: rejectionReason },
        overallSummary: rejectionReason,
        documentDate: undefined,
        keyMetrics: [],
        identifiedConditions: [],
        mentionedMedications: [],
        suggestedCategory: "Rejected/Unsupported Type",
      };
    }

    let preparedDataUri = '';
    try {
      // console.log(`[summarizeMedicalDocumentFlow] Fetching document from URL: ${downloadUrl}`);
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch document from URL: ${response.status} ${response.statusText}`);
      }

      if (mimeType.startsWith('text/')) {
        const textContent = await response.text();
        preparedDataUri = `data:${mimeType};charset=utf-8,${encodeURIComponent(textContent)}`;
      } else { 
        const arrayBuffer = await response.arrayBuffer();
        const base64String = arrayBufferToBase64(arrayBuffer);
        preparedDataUri = `data:${mimeType};base64,${base64String}`;
      }
    } catch (fetchError: any) {
      console.error("[summarizeMedicalDocumentFlow] Error fetching or preparing document content:", fetchError);
      const rejectionReason = `Failed to retrieve or process document content from storage: ${fetchError.message}.`;
      return {
        validation: { isMedicalDocument: false, rejectionReason: rejectionReason },
        overallSummary: rejectionReason,
        documentDate: undefined,
        keyMetrics: [],
        identifiedConditions: [],
        mentionedMedications: [],
        suggestedCategory: "Rejected/Fetch Error",
      };
    }
    
    const {output} = await prompt({ preparedDataUri, originalMimeType: mimeType, originalFileName });

    if (!output) {
      return {
        validation: {
          isMedicalDocument: false,
          rejectionReason: "AI failed to generate a response for the document/media.",
        },
        overallSummary: "AI processing failed. The document/media could not be analyzed.",
        documentDate: undefined,
        keyMetrics: [],
        identifiedConditions: [],
        mentionedMedications: [],
        suggestedCategory: "Processing Error",
      };
    }
    
    let finalValidation = output.validation || { isMedicalDocument: false, rejectionReason: "AI assessment missing." };
    
    const summaryText = output.overallSummary || "";
    const disclaimerPhrases = ["AI Model Team", "cannot offer independent clinical", "patient safety", "medical professionals", "research, informational and documentation purposes", "not meant to provide independent medical advice", "consult with a medical expert"];
    let disclaimerCount = 0;
    disclaimerPhrases.forEach(phrase => {
      if (summaryText.toLowerCase().includes(phrase.toLowerCase())) {
        disclaimerCount += (summaryText.toLowerCase().split(phrase.toLowerCase()).length - 1);
      }
    });

    let metricsContainDisclaimers = false;
    if (output.keyMetrics) {
        for (const km of output.keyMetrics) {
            const metricText = `${km.name || ''} ${km.value || ''} ${km.unit || ''} ${km.normalRange || ''}`;
            if (metricText.length > 250) { // Arbitrary length check for excessive text in a single metric
                metricsContainDisclaimers = true;
                break;
            }
            disclaimerPhrases.forEach(phrase => {
                if (metricText.toLowerCase().includes(phrase.toLowerCase())) {
                    metricsContainDisclaimers = true;
                }
            });
            if (metricsContainDisclaimers) break;
        }
    }
    
    // Check if summary is too short AND the document was initially thought to be valid by AI (i.e., no rejectionReason yet)
    // and doesn't already have a specific "could not process" type summary.
    const isSummaryTooShortAndNotError = 
        (finalValidation.isMedicalDocument && summaryText.length < 20 && !finalValidation.rejectionReason && 
         !summaryText.toLowerCase().includes("unable to process") && 
         !summaryText.toLowerCase().includes("could not analyze") &&
         !summaryText.toLowerCase().includes("not a medical document"));

    const isSummaryGibberish = summaryText.length > 100 && summaryText.split(' ').length < 5; // Very long string with few spaces

    if (disclaimerCount > 1 || summaryText.length > 2000 || metricsContainDisclaimers || isSummaryTooShortAndNotError || isSummaryGibberish) { 
        finalValidation.isMedicalDocument = false;
        finalValidation.rejectionReason = "AI processing error: The extracted summary or metrics were malformed, contained excessive non-medical text, or failed to provide a concise medical summary. The document might be too complex, in an unsupported format/language for detailed interpretation, or requires manual review.";
        output.overallSummary = finalValidation.rejectionReason;
        output.keyMetrics = [];
        output.identifiedConditions = [];
        output.mentionedMedications = [];
        output.suggestedCategory = "Rejected/Processing Error";
    } else if (output.validation === undefined) { 
        if (output.suggestedCategory === "Non-Medical" || output.overallSummary?.toLowerCase().includes("not a medical document")) {
            finalValidation.isMedicalDocument = false;
            finalValidation.rejectionReason = output.overallSummary || "Assessed as non-medical by AI.";
        } else if (output.keyMetrics?.length || output.identifiedConditions?.length || output.mentionedMedications?.length) {
            finalValidation.isMedicalDocument = true; 
        } else if (mimeType.startsWith('video/') && !output.overallSummary?.toLowerCase().includes("not a medical")) {
            finalValidation.isMedicalDocument = true; 
            finalValidation.rejectionReason = output.overallSummary?.includes("unable to process video") || output.overallSummary?.includes("cannot summarize video") ? output.overallSummary : undefined;
        } else if (mimeType.startsWith('image/') && output.overallSummary && output.overallSummary.length > 20 && !output.overallSummary.toLowerCase().includes("not a medical")) {
            finalValidation.isMedicalDocument = true; 
        } else {
            finalValidation.isMedicalDocument = false; 
            finalValidation.rejectionReason = "Unable to determine if medical document/media from content or AI assessment missing.";
        }
    }

    const keyMetricsWithNullableNormalRange = (finalValidation.isMedicalDocument ? (output.keyMetrics || []) : []).map(km => ({
        ...km,
        normalRange: km.normalRange === undefined ? null : km.normalRange,
    }));

    return {
        validation: finalValidation,
        overallSummary: output.overallSummary || (finalValidation.isMedicalDocument ? "No summary available." : finalValidation.rejectionReason || "Document/media could not be processed as medical content."),
        documentDate: output.documentDate,
        keyMetrics: keyMetricsWithNullableNormalRange,
        identifiedConditions: finalValidation.isMedicalDocument ? (output.identifiedConditions || []) : [],
        mentionedMedications: finalValidation.isMedicalDocument ? (output.mentionedMedications || []) : [],
        suggestedCategory: output.suggestedCategory || (finalValidation.isMedicalDocument ? (mimeType.startsWith('video/') ? "Medical Video" : (mimeType.startsWith('image/') ? "Medical Image" : "Uncategorized")) : "Non-Medical"),
    };
  }
);
    