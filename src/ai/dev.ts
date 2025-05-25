
import { config } from 'dotenv';
config();

import '@/ai/flows/ai-powered-diagnosis.ts';
import '@/ai/flows/summarize-medical-document.ts';
import '@/ai/flows/daily-health-insight.ts'; 
import '@/ai/flows/estimateMealCalories.ts';
import '@/ai/flows/generateOverallHealthSummary.ts';
import '@/ai/flows/updateChatSummaryFlow.ts'; // New flow for chat summary updates
import '@/ai/flows/updateDocumentAnalysisSummaryFlow.ts'; // New flow for document analysis summary updates
    

    