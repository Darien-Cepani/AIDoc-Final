
'use server';

/**
 * @fileOverview An AI-powered diagnosis chatbot flow.
 *
 * - aiPoweredDiagnosis - A function that handles the AI-powered diagnosis process.
 * - AiPoweredDiagnosisInput - The input type for the aiPoweredDiagnosis function.
 * - AiPoweredDiagnosisOutput - The return type for the aiPoweredDiagnosis function.
 * - PotentialCondition - The schema for potential conditions.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AiPoweredDiagnosisInputSchema = z.object({
  userProfileContext: z
    .string()
    .optional()
    .describe('A summary of the user_s profile like age, gender, known conditions, and allergies, to be used as context.'),
  userQuery: z.string().describe('The user query or question about their health.'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string(),
  })).optional().describe('Previous messages in the current conversation, if any.'),
  attachedDocumentDataUri: z
    .string()
    .optional()
    .describe("An optional attached document (e.g., medical report PDF, image of results) as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."),
  attachedDocumentName: z
    .string()
    .optional()
    .describe('The name of the attached document, if any.'),
});
export type AiPoweredDiagnosisInput = z.infer<typeof AiPoweredDiagnosisInputSchema>;

const DiagnosisSourceSchema = z.object({
  title: z.string().describe('Title of the source or reference material.'),
  url: z.string().describe('URL to the source material. Must be a valid URL.'), 
});

const PotentialConditionSchema = z.object({
  condition: z.string().describe('A potential medical condition suggested by the AI.'),
  certainty: z.number().min(0).max(100).describe('The AI_s estimated certainty or likelihood for this condition, from 0 (very unlikely) to 100 (very likely). This is an estimation and not a diagnosis.'),
  explanation: z.string().optional().describe('A brief explanation for why this condition is considered.'),
  suggestedDoctorTypesForCondition: z.array(z.string()).optional().describe('Specific types of doctors recommended for this particular potential condition, if applicable (e.g., ["Cardiologist", "Neurologist"]).')
});
export type PotentialCondition = z.infer<typeof PotentialConditionSchema>;


const AiPoweredDiagnosisOutputSchema = z.object({
  diagnosisResponse: z.string().describe('The AI-generated response. This should be conversational and guide the user. If asking questions, phrase them naturally here.'),
  disclaimer: z.string().optional().describe('A disclaimer that the responses are AI-generated and for informational purposes only, not a substitute for professional medical advice. This will be displayed separately in UI, do not include in diagnosisResponse.'),
  sources: z.array(DiagnosisSourceSchema).optional().describe('List of 1-2 credible sources or links to support the information provided, if any. These appear in the chat bubble.'),
  suggestedQuestions: z.array(z.string()).optional().describe('Follow-up questions the AI might ask the user to gather more information if the query is about symptoms or if more context is needed for a better assessment. These should be asked if the AI is not confident enough (certainty < 85% for any condition) or needs more details. These appear in the chat bubble.'),
  extractedSymptoms: z.array(z.string()).optional().describe('Unique symptoms explicitly mentioned by the user or inferred by the AI during the conversation. These appear in the Chat Context sidebar.'),
  extractedConditions: z.array(z.string()).optional().describe('Medical conditions explicitly mentioned by the user, inferred from conversation, or from user profile context. These appear in the Chat Context sidebar.'),
  potentialConditions: z.array(PotentialConditionSchema).optional().describe('A list of up to 5 potential conditions the AI thinks might be relevant based on the query, with an estimated certainty score, explanation, and suggested doctor types. Order from most to least likely. These appear in the Chat Context sidebar.'),
  interpretedDocumentSummary: z.string().optional().describe('If a document was attached and interpreted, this field contains a brief summary or key findings from it relevant to the query. This appears in the chat bubble.'),
  chatTitleSuggestion: z.string().optional().describe('A concise title suggestion for this chat session, summarizing the main topic or issue discussed (max 5-7 words). This is for UI display in chat history.')
});
export type AiPoweredDiagnosisOutput = z.infer<typeof AiPoweredDiagnosisOutputSchema>;

export async function aiPoweredDiagnosis(input: AiPoweredDiagnosisInput): Promise<AiPoweredDiagnosisOutput> {
  return aiPoweredDiagnosisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiPoweredDiagnosisPrompt',
  input: {schema: AiPoweredDiagnosisInputSchema},
  output: {schema: AiPoweredDiagnosisOutputSchema},
  prompt: `You are an AI medical assistant. Your primary goal is to provide helpful, informative, and safe responses to user health queries. Engage in a conversational manner. You ONLY answer medical questions. If a non-medical question is asked, politely state that you can only assist with medical queries.

Context:
{{#if userProfileContext}}
- User's Profile Context: {{{userProfileContext}}}
{{/if}}
{{#if attachedDocumentName}}
- Attached Document: {{{attachedDocumentName}}}
  {{#if attachedDocumentDataUri}}
    (Document Content: {{media url=attachedDocumentDataUri}})
  {{/if}}
{{/if}}
{{#if conversationHistory}}
- Conversation History:
    {{#each conversationHistory}}
  - {{role}}: {{content}}
    {{/each}}
{{/if}}

User Query: {{{userQuery}}}

Your Task and Response Strategy:

1.  **Medical Question Focus**:
    *   If the query is NOT medical, set \`diagnosisResponse\` to "I can only assist with medical-related questions. How can I help you with your health today?" and skip other fields. Also set \`chatTitleSuggestion\` to "Non-Medical Query".

2.  **Information Gathering & Symptom Analysis (If Medical Query & Symptoms Discussed)**:
    *   Analyze the user's query, profile, document (if any), and conversation history.
    *   Identify and list unique key symptoms in \`extractedSymptoms\`.
    *   Identify relevant existing medical conditions from history/profile in \`extractedConditions\`.
    *   Based on current information, list up to 5 \`potentialConditions\`. For each, include \`condition\`, \`certainty\` (0-100), a brief \`explanation\`, and if relevant, \`suggestedDoctorTypesForCondition\` (an array of specific doctor types like "Cardiologist", "General Practitioner"). Order them from most to least likely.
    *   **Critical**: If the highest certainty for any potential condition is below 85% OR if more details would significantly improve assessment for a symptom-based query, your PRIORITY is to ask more questions. Formulate 2-3 clear, concise \`suggestedQuestions\` to ask the user. Your \`diagnosisResponse\` should naturally lead into these questions (e.g., "To understand better, could you tell me..."). Do NOT offer definitive statements if certainty is low or more information is clearly needed.
    *   If highest certainty is >= 85% OR the query is a general medical question not requiring deep personal diagnosis and further questions are not essential, you may provide more direct information instead of primarily asking questions.

3.  **Document Interpretation**:
    *   If a document was attached and is relevant, interpret its key findings related to the query and summarize them in \`interpretedDocumentSummary\`. This should be integrated into your \`diagnosisResponse\` if appropriate or presented as a distinct finding.

4.  **Provide Information & Sources**:
    *   When discussing conditions, treatments, or general medical topics, provide information in \`diagnosisResponse\`.
    *   Cite 1-2 reputable \`sources\` (title and valid URL - e.g., Mayo Clinic, NIH, WebMD) to support your statements. Ensure URLs are valid.

5.  **Chat Title Suggestion**:
    *   Generate a concise (max 5-7 words) \`chatTitleSuggestion\` that summarizes the main topic or issue of the current user query/conversation. E.g., "Persistent Headache Inquiry", "Understanding Lab Results", "Covid Symptom Check".

Example Conversational Flow for Symptoms:
User: "I have a headache and feel tired."
AI: (Analyzes... low certainty for specific conditions yet)
   \`diagnosisResponse\`: "I understand you have a headache and are feeling tired. To help me understand a bit more, could you tell me when these symptoms started and if you've noticed anything else, like a fever or nausea?"
   \`suggestedQuestions\`: ["When did these symptoms start?", "Have you noticed a fever or nausea?"]
   \`extractedSymptoms\`: ["headache", "tiredness"]
   \`potentialConditions\`: [{condition: "Common Cold", certainty: 30, explanation: "General viral symptoms", suggestedDoctorTypesForCondition: ["General Practitioner"]}, {condition: "Stress", certainty: 25, explanation: "Common causes of headache/fatigue", suggestedDoctorTypesForCondition: ["Psychologist", "Neurologist"]}]
   \`chatTitleSuggestion\`: "Headache and Fatigue"

Prioritize safety and clarity. If uncertain or more information is needed for symptom queries, ask more questions.
`,
});

const aiPoweredDiagnosisFlow = ai.defineFlow(
  {
    name: 'aiPoweredDiagnosisFlow',
    inputSchema: AiPoweredDiagnosisInputSchema,
    outputSchema: AiPoweredDiagnosisOutputSchema,
  },
  async (input) => {
    const modelInput = { ...input };
    
    const {output} = await prompt(modelInput);
    if (!output) {
      return {
        diagnosisResponse: "I'm sorry, I encountered an issue and can't respond right now. Please try again later.",
        disclaimer: "This is an AI-generated response for informational purposes only and not a substitute for professional medical advice. Consult a qualified healthcare provider for any health concerns.",
        sources: [],
        suggestedQuestions: [],
        extractedSymptoms: [],
        extractedConditions: [],
        potentialConditions: [],
        interpretedDocumentSummary: undefined,
        chatTitleSuggestion: "AI Error",
      };
    }
    
    const finalOutput = { ...output };
    finalOutput.disclaimer = "This is an AI-generated response for informational purposes only and not a substitute for professional medical advice. Consult a qualified healthcare provider for any health concerns.";
    
    finalOutput.sources = finalOutput.sources || [];
    finalOutput.suggestedQuestions = finalOutput.suggestedQuestions || [];
    finalOutput.extractedSymptoms = finalOutput.extractedSymptoms || [];
    finalOutput.extractedConditions = finalOutput.extractedConditions || [];
    finalOutput.potentialConditions = finalOutput.potentialConditions || [];
    finalOutput.chatTitleSuggestion = finalOutput.chatTitleSuggestion || (input.userQuery.substring(0, 30) + (input.userQuery.length > 30 ? "..." : ""));


    return finalOutput;
  }
);

