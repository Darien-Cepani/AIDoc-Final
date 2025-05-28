
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { User, UserDocumentMetadata } from '@/contexts/AuthContext'; // Assuming UserDocumentMetadata is exported or defined
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  HeartPulse, Brain, AlertTriangle, Activity, ShieldCheck as ShieldCheckIcon, Asterisk, User as UserIcon, Ruler, Weight, Cake, VenetianMask, FileText,
  MessageCircleQuestion, LineChart as LineChartIcon, RefreshCw, Eye, Info, Thermometer, Droplet, Pill, Wind, ActivitySquare, Flame, Scale, Loader2, FileSearch,
  CalendarDays, CheckCircle2, BarChart3, TrendingUp, BrainCircuit
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInYears, isValid, subDays, isValid as isValidDate, isWithinInterval, startOfDay } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter as DialogModalFooter } from "@/components/ui/dialog";
import { ResponsiveContainer, LineChart as RechartsLineChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, ReferenceLine, Line } from 'recharts';
import { Button } from '@/components/ui/button';
import type { KeyMetric } from '@/ai/flows/summarize-medical-document';
import { generateOverallHealthSummary, type GenerateOverallHealthSummaryInput, type GenerateOverallHealthSummaryOutput, type UserProfileDataForAI as UserProfileForAISummary } from '@/ai/flows/generateOverallHealthSummary';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


interface FullMedicalChartProps {
  user: User | null;
}

export interface ProcessedMetric extends KeyMetric {
  id: string; 
  status: 'normal' | 'high' | 'low' | 'unknown' | 'borderline_high' | 'borderline_low';
  originalDocumentName?: string;
  originalDocumentId?: string;
  originalDocumentDate?: string | null; 
  metricDateToUse: Date; 
  numericValue?: number | null;
  isRecent?: boolean;
  rangeUsedForStatus?: string | null; 
}

// Expanded Generic Normal Ranges
const GENERIC_NORMAL_RANGES: Record<string, { min?: number; max?: number; rangeString?: string, unit?: string, lowerIsBetter?: boolean, higherIsBetter?: boolean }> = {
  'Heart Rate': { min: 60, max: 100, rangeString: '60-100', unit: 'bpm' },
  'Resting Heart Rate': { min: 60, max: 100, rangeString: '60-100', unit: 'bpm' },
  'Systolic Blood Pressure': { max: 120, rangeString: '<120', unit: 'mmHg', lowerIsBetter: true },
  'Diastolic Blood Pressure': { max: 80, rangeString: '<80', unit: 'mmHg', lowerIsBetter: true },
  'Blood Glucose': { min: 70, max: 100, rangeString: '70-100', unit: 'mg/dL' },
  'Fasting Blood Glucose': { min: 70, max: 100, rangeString: '70-100', unit: 'mg/dL' },
  'HbA1c': { max: 5.6, rangeString: '<5.7%', unit: '%' , lowerIsBetter: true},
  'Body Temperature': { min: 36.1, max: 37.2, rangeString: '36.1-37.2', unit: '°C' },
  'Oxygen Saturation': { min: 95, max: 100, rangeString: '95-100', unit: '%' , higherIsBetter: true},
  'SpO2': { min: 95, max: 100, rangeString: '95-100', unit: '%' , higherIsBetter: true},
  'Respiratory Rate': {min: 12, max: 20, rangeString: '12-20', unit: 'breaths/min'},
  'White Blood Cell Count': {min: 4.0, max: 11.0, rangeString: '4.0-11.0', unit: 'x10^9/L'}, // WBC
  'RBC': {min: 4.2, max: 5.9, rangeString: '4.2-5.9', unit: 'x10^12/L'}, 
  'Red Blood Cell Count': {min: 4.2, max: 5.9, rangeString: '4.2-5.9', unit: 'x10^12/L'}, 
  'Hemoglobin': {min: 13.0, max: 17.0, rangeString: '13.0-17.0', unit: 'g/dL'}, 
  'HGB': {min: 13.0, max: 17.0, rangeString: '13.0-17.0', unit: 'g/dL'}, 
  'Hematocrit': {min: 38, max: 50, rangeString: '38-50', unit: '%'}, 
  'HCT': {min: 38, max: 50, rangeString: '38-50', unit: '%'}, 
  'Platelet Count': {min: 150, max: 450, rangeString: '150-450', unit: 'x10^9/L'},
  'Total Cholesterol': {max: 200, rangeString: '<200', unit: 'mg/dL', lowerIsBetter: true},
  'Cholesterol': {max: 200, rangeString: '<200', unit: 'mg/dL', lowerIsBetter: true},
  'LDL Cholesterol': {max: 100, rangeString: '<100', unit: 'mg/dL', lowerIsBetter: true},
  'LDL': {max: 100, rangeString: '<100', unit: 'mg/dL', lowerIsBetter: true},
  'HDL Cholesterol': {min: 40, rangeString: '>40', unit: 'mg/dL', higherIsBetter: true}, 
  'HDL': {min: 40, rangeString: '>40', unit: 'mg/dL', higherIsBetter: true},
  'Triglycerides': {max: 150, rangeString: '<150', unit: 'mg/dL', lowerIsBetter: true},
  'Creatinine': {min: 0.6, max: 1.3, rangeString: '0.6-1.3', unit: 'mg/dL'},
  'Urea Nitrogen (BUN)': {min: 7, max: 20, rangeString: '7-20', unit: 'mg/dL'},
  'BUN': {min: 7, max: 20, rangeString: '7-20', unit: 'mg/dL'},
  'Urea': {min: 7, max: 20, rangeString: '7-20', unit: 'mg/dL'}, 
  'Alanine Aminotransferase (ALT)': {max: 40, rangeString: '<40', unit: 'U/L', lowerIsBetter: true},
  'ALT (SGPT)': {max: 40, rangeString: '<40', unit: 'U/L', lowerIsBetter: true},
  'Aspartate Aminotransferase (AST)': {max: 40, rangeString: '<40', unit: 'U/L', lowerIsBetter: true},
  'AST (SGOT)': {max: 40, rangeString: '<40', unit: 'U/L', lowerIsBetter: true},
  'Alkaline Phosphatase (ALP)': {min: 44, max: 147, rangeString: '44-147', unit: 'U/L'},
  'Total Bilirubin': {max: 1.2, rangeString: '<1.2', unit: 'mg/dL', lowerIsBetter: true},
  'Bilirubin Total': {max: 1.2, rangeString: '<1.2', unit: 'mg/dL', lowerIsBetter: true},
  'Bilirubin Direct': {max: 0.3, rangeString: '<0.3', unit: 'mg/dL', lowerIsBetter: true},
  'Albumin': {min: 3.4, max: 5.4, rangeString: '3.4-5.4', unit: 'g/dL'},
  'Protein Total': {min: 6.0, max: 8.3, rangeString: '6.0-8.3', unit: 'g/dL'},
  'Thyroid Stimulating Hormone (TSH)': {min: 0.4, max: 4.0, rangeString: '0.4-4.0', unit: 'mIU/L'},
  'TSH': {min: 0.4, max: 4.0, rangeString: '0.4-4.0', unit: 'mIU/L'},
  'Free Thyroxine (FT4)': {min: 0.8, max: 1.8, rangeString: '0.8-1.8', unit: 'ng/dL'},
  'FT4': {min: 0.8, max: 1.8, rangeString: '0.8-1.8', unit: 'ng/dL'},
  'Iron': {min: 60, max: 170, rangeString: '60-170', unit: 'mcg/dL'},
  'Ferritin': {min: 20, max: 200, rangeString: '20-200', unit: 'ng/mL' }, // General range, can vary by gender
  'Ferritin (Serum)': {min: 20, max: 200, rangeString: '20-200', unit: 'ng/mL' },
  'Phosphate': {min: 2.5, max: 4.5, rangeString: '2.5-4.5', unit: 'mg/dL'},
  'Calcium': {min: 8.5, max: 10.5, rangeString: '8.5-10.5', unit: 'mg/dL'},
  'Magnesium': {min: 1.7, max: 2.2, rangeString: '1.7-2.2', unit: 'mg/dL'},
  'Sodium': {min: 135, max: 145, rangeString: '135-145', unit: 'mmol/L'},
  'Potassium': {min: 3.5, max: 5.0, rangeString: '3.5-5.0', unit: 'mmol/L'},
  'Chloride': {min: 98, max: 107, rangeString: '98-107', unit: 'mmol/L'},
  'Carbon Dioxide (CO2)': {min: 23, max: 30, rangeString: '23-30', unit: 'mmol/L'},
  'GGT': {max:45, rangeString: '<45', unit:'IU/L', lowerIsBetter: true },
  'LD': {min:140, max:280, rangeString:'140-280', unit:'IU/L'},
  'Amylase Serum': {min:30, max:110, rangeString:'30-110', unit:'IU/L'},
};


const MetricDisplay: React.FC<{ label: string, value: string | number | undefined | null, unit?: string, Icon?: React.ElementType, className?: string, children?: React.ReactNode }> = ({ label, value, unit, Icon, className, children }) => {
  const displayValue = value !== undefined && value !== null && String(value).trim() !== '' ? `${value}${unit ? ' ' + unit : ''}` : <span className="italic text-muted-foreground/80">N/A</span>;
  return (
    <div className={cn("py-2", className)}>
      <div className="text-xs text-muted-foreground flex items-center mb-0.5">
        {Icon && <Icon className="h-3.5 w-3.5 mr-1.5 opacity-70" />}
        {label}
      </div>
      <div className="text-sm font-medium flex items-center gap-2">
        {displayValue}
        {children}
      </div>
    </div>
  );
};

const BadgeListDisplay: React.FC<{ label: string, items: string[] | undefined, Icon?: React.ElementType, className?: string }> = ({ label, items, Icon, className }) => {
    return (
        <div className={cn("py-2", className)}>
            <div className="text-xs text-muted-foreground flex items-center mb-1">
                {Icon && <Icon className="h-3.5 w-3.5 mr-1.5 opacity-70" />}
                {label}
            </div>
            {items && items.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-1">
                    {items.map((item, index) => <Badge key={index} variant="secondary" className="text-xs font-normal glassmorphic bg-secondary/80 hover:bg-secondary">{item}</Badge>)}
                </div>
            ) : <p className="text-sm italic text-muted-foreground/80">None listed</p>}
        </div>
    );
};


export const FullMedicalChart: React.FC<FullMedicalChartProps> = ({ user: userProp }) => {
  const { user: authUser, updateUserProfile: authUpdateUserProfile } = useAuth();
  const user = userProp || authUser;
  const { toast } = useToast();

  const [overallAISummary, setOverallAISummary] = useState<string | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState<boolean>(false);
  const [summaryLastUpdated, setSummaryLastUpdated] = useState<string | null>(null);
  const [healthScore, setHealthScore] = useState<number | null>(null);
  
  const [abnormalMetrics, setAbnormalMetrics] = useState<ProcessedMetric[]>([]);
  const [normalMetricsByCategory, setNormalMetricsByCategory] = useState<Record<string, ProcessedMetric[]>>({});
  const [metricHistoryData, setMetricHistoryData] = useState<Record<string, { date: string; value: number }[]>>({});
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [selectedMetricForHistory, setSelectedMetricForHistory] = useState<ProcessedMetric | null>(null);
  const [historicalTimeRange, setHistoricalTimeRange] = useState<'1m' | '3m' | '6m' | 'all'>('3m');


  const fetchAndGenerateOverallSummary = useCallback(async (forceRefresh = false) => {
    if (!user || !user.id || !authUpdateUserProfile) {
      setOverallAISummary("User data not available to generate summary.");
      setIsSummaryLoading(false);
      return;
    }
    setIsSummaryLoading(true);

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    if (
        !forceRefresh &&
        user.aiGeneratedOverallSummary &&
        user.aiGeneratedOverallSummaryLastUpdated &&
        user.aiGeneratedOverallSummaryLastUpdated > twentyFourHoursAgo
    ) {
        setOverallAISummary(user.aiGeneratedOverallSummary);
        setHealthScore(user.healthScore === undefined ? null : user.healthScore);
        if (user.aiGeneratedOverallSummaryLastUpdated) {
          setSummaryLastUpdated(format(parseISO(user.aiGeneratedOverallSummaryLastUpdated), "PPpp"));
        }
        setIsSummaryLoading(false);
        return;
    }
    
    const userProfileDataForFlow: UserProfileForAISummary = { 
      name: user.name,
      age: user.age,
      gender: user.gender,
      height: user.height,
      weight: user.weight,
      bmi: (user.height && user.weight && user.height > 0) ? parseFloat((user.weight / ((user.height / 100) ** 2)).toFixed(1)) : null,
      existingConditions: user.existingConditions,
      allergies: user.allergies,
    };
    
    try {
      const inputForFlow: GenerateOverallHealthSummaryInput = {
          userProfile: userProfileDataForFlow,
          consolidatedDocumentAnalysisSummary: user.consolidatedDocumentAnalysisSummary,
          consolidatedChatSummary: user.consolidatedChatSummary,
      };
      
      console.log('[FullMedicalChart] Input to generateOverallHealthSummary:', JSON.stringify(inputForFlow, null, 2).substring(0,1000)+"...");
      const result = await generateOverallHealthSummary(inputForFlow);
      console.log('[FullMedicalChart] Result from generateOverallHealthSummary:', result);


      if (result.overallHealthSummary) {
        setOverallAISummary(result.overallHealthSummary);
        setHealthScore(result.healthScore === undefined ? null : result.healthScore);
        const lastUpdatedDate = result.lastUpdated ? parseISO(result.lastUpdated) : new Date();
        setSummaryLastUpdated(isValidDate(lastUpdatedDate) ? format(lastUpdatedDate, "PPpp") : "Recently");

        authUpdateUserProfile({ 
            aiGeneratedOverallSummary: result.overallHealthSummary,
            aiGeneratedOverallSummaryLastUpdated: result.lastUpdated || new Date().toISOString(),
            healthScore: result.healthScore === undefined ? null : result.healthScore,
        });

      } else {
         setOverallAISummary("AI could not generate a summary at this time. There might not be enough information.");
         setHealthScore(null);
         setSummaryLastUpdated(format(new Date(), "PPpp"));
      }
    } catch (error: any) {
      console.error("Error generating overall health summary in FullMedicalChart:", error);
      toast({
        title: "Error Generating Summary",
        description: error.message || "Could not generate the AI health summary. Please try refreshing.",
        variant: "destructive",
        iconType: "error"
      });
      setOverallAISummary("Failed to load AI health summary. Please try refreshing.");
      setHealthScore(null);
      setSummaryLastUpdated(format(new Date(), "PPpp"));
    } finally {
      setIsSummaryLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.name, user?.age, user?.gender, user?.height, user?.weight, user?.existingConditions, user?.allergies, user?.consolidatedDocumentAnalysisSummary, user?.consolidatedChatSummary, user?.aiGeneratedOverallSummary, user?.aiGeneratedOverallSummaryLastUpdated, user?.healthScore, authUpdateUserProfile, toast]);


  useEffect(() => {
    if (user && user.id && authUpdateUserProfile) {
      // Trigger only if summary is missing or if underlying consolidated summaries have updated more recently than the overall summary.
      const overallSummaryLastUpdatedTime = user.aiGeneratedOverallSummaryLastUpdated ? new Date(user.aiGeneratedOverallSummaryLastUpdated).getTime() : 0;
      const docSummaryLastUpdatedTime = user.consolidatedDocumentAnalysisSummaryLastUpdated ? new Date(user.consolidatedDocumentAnalysisSummaryLastUpdated).getTime() : 0;
      const chatSummaryLastUpdatedTime = user.consolidatedChatSummaryLastUpdated ? new Date(user.consolidatedChatSummaryLastUpdated).getTime() : 0;

      if (!user.aiGeneratedOverallSummary || overallSummaryLastUpdatedTime < docSummaryLastUpdatedTime || overallSummaryLastUpdatedTime < chatSummaryLastUpdatedTime) {
        fetchAndGenerateOverallSummary();
      } else {
        // Load from existing user object if recent enough
        setOverallAISummary(user.aiGeneratedOverallSummary);
        setHealthScore(user.healthScore === undefined ? null : user.healthScore);
        if(user.aiGeneratedOverallSummaryLastUpdated) {
            setSummaryLastUpdated(format(parseISO(user.aiGeneratedOverallSummaryLastUpdated), "PPpp"));
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.consolidatedDocumentAnalysisSummaryLastUpdated, user?.consolidatedChatSummaryLastUpdated, user?.aiGeneratedOverallSummaryLastUpdated]); 


 const getMetricStatusAndValue = useCallback((metric: KeyMetric, docDate: Date): Pick<ProcessedMetric, 'status' | 'numericValue' | 'rangeUsedForStatus' | 'metricDateToUse'> => {
    const rawValue = String(metric.value).trim();
    if (rawValue.toLowerCase() === 'positive' || rawValue.toLowerCase() === 'detected') return { status: 'high', numericValue: null, rangeUsedForStatus: 'Qualitative (Positive/Detected)', metricDateToUse: metric.date && isValid(parseISO(metric.date)) ? parseISO(metric.date) : docDate };
    if (rawValue.toLowerCase() === 'negative' || rawValue.toLowerCase() === 'not detected') return { status: 'normal', numericValue: null, rangeUsedForStatus: 'Qualitative (Negative/Not Detected)', metricDateToUse: metric.date && isValid(parseISO(metric.date)) ? parseISO(metric.date) : docDate };

    const numericValueMatch = rawValue.match(/[+-]?([0-9]*[.])?[0-9]+/);
    const numericValue = numericValueMatch ? parseFloat(numericValueMatch[0]) : NaN;
    let rangeUsedForStatus: string | null = metric.normalRange || null;
    const metricDateToUse = metric.date && isValid(parseISO(metric.date)) ? parseISO(metric.date) : docDate;

    if (isNaN(numericValue)) return { status: 'unknown', numericValue: null, rangeUsedForStatus, metricDateToUse };

    let effectiveMin: number | undefined = undefined;
    let effectiveMax: number | undefined = undefined;
    let lowerIsBetterOverride: boolean | undefined = undefined;
    let higherIsBetterOverride: boolean | undefined = undefined;

    const docRange = metric.normalRange?.trim().replace(/\s+/g, ''); // Normalize whitespace
    if (docRange) {
        const rangeParts = docRange.match(/([\d.]+)-([\d.]+)/); // X-Y
        const lessThanEqMatch = docRange.match(/^<=\s*([\d.]+)/) || docRange.match(/^≤\s*([\d.]+)/); // <=Y
        const lessThanMatch = docRange.match(/^<\s*([\d.]+)/); // <Y
        const greaterThanEqMatch = docRange.match(/^>=\s*([\d.]+)/) || docRange.match(/^≥\s*([\d.]+)/); // >=X
        const greaterThanMatch = docRange.match(/^>\s*([\d.]+)/); // >X

        if (rangeParts) {
            effectiveMin = parseFloat(rangeParts[1]);
            effectiveMax = parseFloat(rangeParts[2]);
        } else if (lessThanEqMatch) {
            effectiveMax = parseFloat(lessThanEqMatch[1]);
        } else if (lessThanMatch) {
            effectiveMax = parseFloat(lessThanMatch[1]) - 0.00001; // Effectively less than
        } else if (greaterThanEqMatch) {
            effectiveMin = parseFloat(greaterThanEqMatch[1]);
        } else if (greaterThanMatch) {
            effectiveMin = parseFloat(greaterThanMatch[1]) + 0.00001; // Effectively greater than
        }
    }
    
    const genericRangeInfo = GENERIC_NORMAL_RANGES[metric.name] || Object.values(GENERIC_NORMAL_RANGES).find(gr => metric.name.toLowerCase().includes(gr.rangeString?.toLowerCase() || '______'));

    if (effectiveMin === undefined && effectiveMax === undefined && genericRangeInfo) {
        effectiveMin = genericRangeInfo.min;
        effectiveMax = genericRangeInfo.max;
        rangeUsedForStatus = genericRangeInfo.rangeString || rangeUsedForStatus; // Prioritize doc range string if it existed but wasn't parseable into min/max
        lowerIsBetterOverride = genericRangeInfo.lowerIsBetter;
        higherIsBetterOverride = genericRangeInfo.higherIsBetter;
    }
    
    const bufferMultiplier = 0.05; // 5% buffer
    if (effectiveMin !== undefined && effectiveMax !== undefined) {
        const rangeWidth = effectiveMax - effectiveMin;
        const lowerBuffer = Math.min(Math.abs(effectiveMin * bufferMultiplier), rangeWidth * 0.1, 0.5); // Cap buffer
        const upperBuffer = Math.min(Math.abs(effectiveMax * bufferMultiplier), rangeWidth * 0.1, 0.5);

        if (numericValue < effectiveMin - lowerBuffer) return { status: 'low', numericValue, rangeUsedForStatus, metricDateToUse };
        if (numericValue > effectiveMax + upperBuffer) return { status: 'high', numericValue, rangeUsedForStatus, metricDateToUse };
        if (numericValue < effectiveMin) return { status: 'borderline_low', numericValue, rangeUsedForStatus, metricDateToUse };
        if (numericValue > effectiveMax) return { status: 'borderline_high', numericValue, rangeUsedForStatus, metricDateToUse };
        return { status: 'normal', numericValue, rangeUsedForStatus, metricDateToUse };
    } else if (effectiveMin !== undefined) {
        const buffer = Math.min(Math.abs(effectiveMin * bufferMultiplier), 0.5);
        if (higherIsBetterOverride) { // e.g. HDL > 40 is good
            if (numericValue < effectiveMin - buffer) return { status: 'low', numericValue, rangeUsedForStatus, metricDateToUse };
            if (numericValue < effectiveMin) return { status: 'borderline_low', numericValue, rangeUsedForStatus, metricDateToUse };
            return { status: 'normal', numericValue, rangeUsedForStatus, metricDateToUse };
        } else { // e.g. a generic >X range where just being above X is normal
             if (numericValue < effectiveMin - buffer) return { status: 'low', numericValue, rangeUsedForStatus, metricDateToUse };
             return { status: 'normal', numericValue, rangeUsedForStatus, metricDateToUse };
        }
    } else if (effectiveMax !== undefined) {
        const buffer = Math.min(Math.abs(effectiveMax * bufferMultiplier), 0.5);
         if (lowerIsBetterOverride) { // e.g. LDL < 100 is good
            if (numericValue > effectiveMax + buffer) return { status: 'high', numericValue, rangeUsedForStatus, metricDateToUse };
            if (numericValue > effectiveMax) return { status: 'borderline_high', numericValue, rangeUsedForStatus, metricDateToUse };
            return { status: 'normal', numericValue, rangeUsedForStatus, metricDateToUse };
        } else { // e.g. a generic <X range where just being below X is normal
            if (numericValue > effectiveMax + buffer) return { status: 'high', numericValue, rangeUsedForStatus, metricDateToUse };
            return { status: 'normal', numericValue, rangeUsedForStatus, metricDateToUse };
        }
    }
    return { status: 'unknown', numericValue, rangeUsedForStatus, metricDateToUse };
  }, []);


  useEffect(() => {
    if (user && Array.isArray(user.documentMetadata)) {
      const allMetricsFlat: ProcessedMetric[] = [];
      const history: Record<string, { date: string; value: number }[]> = {};
      const normalByCategory: Record<string, ProcessedMetric[]> = {};
      const thirtyDaysAgo = subDays(new Date(), 30);

      (user.documentMetadata as UserDocumentMetadata[]).forEach(doc => {
        const docTimestampDate = doc.uploadDate && typeof doc.uploadDate.seconds === 'number' 
            ? startOfDay(new Date(doc.uploadDate.seconds * 1000))
            : startOfDay(new Date()); 
        const docActualDate = doc.documentDate && isValid(parseISO(doc.documentDate)) 
            ? startOfDay(parseISO(doc.documentDate))
            : docTimestampDate; 

        if (doc.keyMetrics && Array.isArray(doc.keyMetrics) && doc.isRelevant) {
          (doc.keyMetrics as KeyMetric[]).forEach((km, idx) => { 
            const metricSpecificDate = km.date && isValid(parseISO(km.date)) ? startOfDay(parseISO(km.date)) : docActualDate;
            const { status, numericValue, rangeUsedForStatus } = getMetricStatusAndValue(km, metricSpecificDate);
            
            const processedMetric: ProcessedMetric = {
              ...km,
              id: `${doc.id || `doc-${Date.now()}`}-${km.name.replace(/\s+/g, '-')}-${idx}`,
              status,
              numericValue,
              originalDocumentName: doc.name,
              originalDocumentId: doc.id,
              originalDocumentDate: isValid(docActualDate) ? docActualDate.toISOString() : docTimestampDate.toISOString(),
              metricDateToUse: metricSpecificDate, 
              isRecent: isValid(metricSpecificDate) ? !isWithinInterval(metricSpecificDate, {start: new Date(0), end: thirtyDaysAgo}) : false,
              normalRange: km.normalRange, 
              rangeUsedForStatus: rangeUsedForStatus,
            };
            allMetricsFlat.push(processedMetric);

            if (numericValue !== null && numericValue !== undefined && !isNaN(numericValue) && processedMetric.metricDateToUse && isValid(processedMetric.metricDateToUse)) {
              const dateKey = format(processedMetric.metricDateToUse, 'yyyy-MM-dd');
              if (!history[km.name]) history[km.name] = [];
              if (!history[km.name].find(h => h.date === dateKey && h.value === numericValue)) {
                history[km.name].push({ date: dateKey, value: numericValue });
              }
            }

            if (status === 'normal') {
                const category = doc.suggestedCategory || "Uncategorized Lab Results";
                if (!normalByCategory[category]) normalByCategory[category] = [];
                normalByCategory[category].push(processedMetric);
            }
          });
        }
      });
      
      const filteredAbnormal = allMetricsFlat.filter(m => m.status === 'high' || m.status === 'low' || m.status === 'borderline_high' || m.status === 'borderline_low');
      filteredAbnormal.sort((a,b) => b.metricDateToUse.getTime() - a.metricDateToUse.getTime());
      setAbnormalMetrics(filteredAbnormal);

      Object.keys(history).forEach(key => history[key].sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()));
      setMetricHistoryData(history);

      Object.keys(normalByCategory).forEach(cat => normalByCategory[cat].sort((a,b) => b.metricDateToUse.getTime() - a.metricDateToUse.getTime()));
      setNormalMetricsByCategory(normalByCategory);
    }
  }, [user, getMetricStatusAndValue]);

  const openHistoryModal = (metric: ProcessedMetric) => {
    setSelectedMetricForHistory(metric);
    setIsHistoryModalOpen(true);
  };

  const getStatusColorClasses = (status: ProcessedMetric['status']): string => {
    switch (status) {
      case 'high': case 'low': return 'text-destructive border-destructive/50 bg-destructive/10';
      case 'borderline_high': case 'borderline_low': return 'text-orange-500 border-orange-500/50 bg-orange-500/10';
      case 'normal': return 'text-green-600 border-green-600/50 bg-green-600/10';
      default: return 'text-muted-foreground border-muted/30 bg-muted/10';
    }
  };
  
  const getHealthScoreColor = (score: number | null): string => {
    if (score === null || score === undefined) return "text-muted-foreground";
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-blue-500 dark:text-blue-400";
    if (score >= 40) return "text-orange-500 dark:text-orange-400";
    return "text-destructive";
  };


  const getMetricIcon = (metricName?: string): React.ElementType => {
    if (!metricName) return Activity;
    const name = metricName.toLowerCase();
    if (name.includes('heart rate') || name.includes('resting heart rate')) return HeartPulse;
    if (name.includes('blood pressure') || name.includes('systolic') || name.includes('diastolic')) return ActivitySquare;
    if (name.includes('glucose') || name.includes('hba1c')) return Droplet;
    if (name.includes('temperature')) return Thermometer;
    if (name.includes('oxygen saturation') || name.includes('spo2')) return Wind;
    if (name.includes('respiratory rate')) return Activity;
    if (name.includes('cholesterol') || name.includes('ldl') || name.includes('hdl') || name.includes('triglycerides') ) return TrendingUp;
    if (name.includes('weight')) return Weight;
    if (name.includes('height')) return Ruler;
    if (name.includes('bmi')) return Scale;
    if (name.includes('rbc') || name.includes('red blood cell')) return Droplet;
    if (name.includes('wbc') || name.includes('white blood cell')) return Droplet;
    if (name.includes('hemoglobin') || name.includes('hgb')) return Droplet;
    if (name.includes('hematocrit') || name.includes('hct')) return Droplet;
    if (name.includes('platelet')) return Droplet;
    if (name.includes('creatinine')) return Droplet;
    if (name.includes('urea') || name.includes('bun')) return Droplet;
    if (name.includes('alt') || name.includes('ast') || name.includes('ggt') || name.includes('alp') || name.includes('ld')) return Activity;
    if (name.includes('bilirubin')) return Droplet;
    if (name.includes('albumin') || name.includes('protein total')) return Droplet;
    if (name.includes('tsh') || name.includes('ft4') || name.includes('thyroid')) return BrainCircuit; // Changed for thyroid
    if (name.includes('iron') || name.includes('ferritin')) return Droplet;
    if (name.includes('phosphate') || name.includes('calcium') || name.includes('magnesium') || name.includes('sodium') || name.includes('potassium') || name.includes('chloride')) return Droplet;
    if (name.includes('carbon dioxide') || name.includes('co2')) return Wind;
    if (name.includes('amylase')) return Activity;
    return Info; 
  };

  const FilteredHistoricalData = () => {
    if (!selectedMetricForHistory || !metricHistoryData[selectedMetricForHistory.name]) return [];
    let allData = metricHistoryData[selectedMetricForHistory.name];
    if (!allData || allData.length === 0) return [];
    
    allData = allData.filter(d => d.date && isValid(parseISO(d.date)));
    allData.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

    if (historicalTimeRange === 'all') return allData;

    const now = new Date();
    let startDateBoundary: Date;
    if (historicalTimeRange === '1m') startDateBoundary = subDays(now, 30);
    else if (historicalTimeRange === '3m') startDateBoundary = subDays(now, 90);
    else startDateBoundary = subDays(now, 180); // 6m

    return allData.filter(d => !isWithinInterval(parseISO(d.date), {start: new Date(0), end: startDateBoundary}));
  };

  const IconDisplay = ({ icon: IconComp, ...props }: { icon?: React.ElementType, [key: string]: any }) => {
    if (!IconComp) return <Info {...props} />;
    return <IconComp {...props} />;
  };


  if (!user) {
    return <Card className="glassmorphic p-6 text-center"><p className="text-muted-foreground">User data not available. Please log in.</p></Card>;
  }

  const userBirthdayDate = user.birthday && isValid(parseISO(user.birthday)) ? parseISO(user.birthday) : undefined;
  const age = userBirthdayDate ? differenceInYears(new Date(), userBirthdayDate) : user.age;

  let bmiValue: number | null = null;
  let bmiCategory: string | null = null;
  let bmiCategoryColor = "bg-muted text-muted-foreground";

  if (user.height && user.weight && user.height > 0) {
    const heightM = user.height / 100;
    bmiValue = parseFloat((user.weight / (heightM * heightM)).toFixed(1));
    if (bmiValue < 18.5) {
        bmiCategory = "Underweight";
        bmiCategoryColor = "bg-orange-500/20 text-orange-700 border-orange-500/30";
    } else if (bmiValue < 25) {
        bmiCategory = "Normal";
        bmiCategoryColor = "bg-green-600/20 text-green-700 border-green-500/30";
    } else if (bmiValue < 30) {
        bmiCategory = "Overweight";
        bmiCategoryColor = "bg-yellow-500/20 text-yellow-700 border-yellow-500/30";
    } else {
        bmiCategory = "Obese";
        bmiCategoryColor = "bg-red-500/20 text-red-700 border-red-500/30";
    }
  }


  return (
    <Card className="w-full glassmorphic shadow-xl overflow-hidden">
      <CardHeader className="bg-primary/5 p-4 md:p-6 border-b border-border/30">
        <CardTitle className="text-xl md:text-2xl font-bold text-primary flex items-center gap-2">
          <FileText className="h-6 w-6" /> Medical Chart: <span className="text-foreground">{user.name}</span>
        </CardTitle>
        <CardDescription>Comprehensive health overview and AI-derived insights.</CardDescription>
      </CardHeader>
      <CardContent className="p-4 md:p-6 space-y-6 custom-scrollbar">

        <section>
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-primary flex items-center">
                <Brain className="mr-2 h-5 w-5" />AI Overall Health Summary
                </h3>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => fetchAndGenerateOverallSummary(true)} disabled={isSummaryLoading} title="Refresh Summary">
                {isSummaryLoading && !overallAISummary ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
            </div>
             {healthScore !== null && healthScore !== undefined && (
                 <div className={cn("flex items-center gap-2 mb-3 p-2 rounded-md glassmorphic", 
                                 healthScore >= 80 ? "bg-green-500/10" :
                                 healthScore >= 60 ? "bg-blue-500/10" :
                                 healthScore >= 40 ? "bg-orange-500/10" :
                                 "bg-red-500/10")}>
                    <TrendingUp className={cn("h-6 w-6", getHealthScoreColor(healthScore))} />
                    <div>
                        <span className={cn("text-xl font-bold", getHealthScoreColor(healthScore))}>
                            {healthScore}
                        </span>
                        <span className={cn("text-sm font-medium", getHealthScoreColor(healthScore))}>/100</span>
                    </div>
                    <p className={cn("text-sm font-semibold ml-2", getHealthScoreColor(healthScore))}>
                        {healthScore >= 80 ? "Excellent" : healthScore >= 60 ? "Good" : healthScore >= 40 ? "Needs Attention" : "Critical"}
                    </p>
                </div>
            )}
            <div className="glassmorphic p-3 rounded-md bg-background/50 min-h-[80px]">
                {isSummaryLoading && !overallAISummary ? (
                    <div className="flex items-center justify-center h-full py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-primary"/>
                        <p className="ml-2 text-muted-foreground">Generating summary...</p>
                    </div>
                ) : overallAISummary ? (
                    <div className="text-sm text-foreground space-y-2 prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5">
                    <ReactMarkdown>{overallAISummary}</ReactMarkdown>
                    {summaryLastUpdated && <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/20">Last updated: {summaryLastUpdated}</p>}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground italic text-center py-4">
                        No AI summary available. Please add more health data or click refresh.
                    </p>
                )}
            </div>
        </section>

        <Separator className="my-4" />

        <section>
          <h3 className="text-lg font-semibold mb-3 flex items-center text-primary"><UserIcon className="mr-2 h-5 w-5" />Patient Demographics</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-0">
            <MetricDisplay label="Full Name" value={user.name} />
            <MetricDisplay label="Email" value={user.email} />
            <MetricDisplay label="Age" value={age} unit="years" Icon={Cake}/>
            <MetricDisplay label="Gender" value={user.gender || 'N/A'} Icon={VenetianMask} />
            <MetricDisplay label="Height" value={user.height} unit="cm" Icon={Ruler} />
            <MetricDisplay label="Weight" value={user.weight} unit="kg" Icon={Weight} />
            <MetricDisplay label="BMI" value={bmiValue ? bmiValue.toFixed(1) : undefined} Icon={Scale}>
              {bmiCategory && <Badge className={cn("text-xs font-normal", bmiCategoryColor)}>{bmiCategory}</Badge>}
            </MetricDisplay>
            <MetricDisplay label="Daily Calorie Goal" value={user.dailyCalorieGoal} unit="kcal" Icon={Flame} />
          </div>
        </section>

        <Separator className="my-4" />

        <section>
          <h3 className="text-lg font-semibold mb-3 flex items-center text-primary"><ShieldCheckIcon className="mr-2 h-5 w-5" />Medical History</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0">
                <BadgeListDisplay label="Known Conditions" items={user.existingConditions} Icon={HeartPulse} />
                <BadgeListDisplay label="Allergies" items={user.allergies} Icon={Asterisk} />
           </div>
        </section>
        
        <Separator className="my-4" />
        <section>
          <h3 className="text-lg font-semibold mb-3 flex items-center text-orange-500"><AlertTriangle className="mr-2 h-5 w-5" />Abnormal & Borderline Metrics</h3>
          {abnormalMetrics.length > 0 ? (
            <div className="border rounded-md overflow-hidden glassmorphic bg-background/30">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[20%]">Metric</TableHead>
                    <TableHead className="w-[15%]">Value</TableHead>
                    <TableHead className="w-[15%] text-center">Status</TableHead>
                    <TableHead className="w-[20%]">Normal Range Used</TableHead>
                    <TableHead className="w-[15%]">Date</TableHead>
                    <TableHead className="w-[15%]">Source Document</TableHead>
                    <TableHead className="w-[10%] text-right">History</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {abnormalMetrics.map((metric) => (
                    <TableRow key={metric.id}>
                      <TableCell className="font-medium flex items-center gap-2 text-sm">
                         <IconDisplay icon={getMetricIcon(metric.name)} className="h-4 w-4 opacity-80" />
                         {metric.name}
                      </TableCell>
                      <TableCell className="text-sm">{metric.value} {metric.unit || ''}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={cn("text-xs capitalize", getStatusColorClasses(metric.status))}>
                           {metric.status.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{metric.rangeUsedForStatus || 'N/A'}</TableCell>
                      <TableCell className="text-xs">{metric.metricDateToUse ? format(metric.metricDateToUse, 'MMM d, yy') : 'N/A'}</TableCell>
                      <TableCell className="text-xs truncate max-w-[100px]" title={metric.originalDocumentName}>{metric.originalDocumentName || "N/A"}</TableCell>
                      <TableCell className="text-right">
                        {metricHistoryData[metric.name] && metricHistoryData[metric.name].length > 1 && (
                           <TooltipProvider delayDuration={150}><Tooltip>
                               <TooltipTrigger asChild>
                                   <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openHistoryModal(metric)}>
                                     <LineChartIcon className="h-4 w-4 text-primary/80"/>
                                   </Button>
                               </TooltipTrigger>
                               <TooltipContent><p>View History for {metric.name}</p></TooltipContent>
                            </Tooltip></TooltipProvider>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
             <div className="glassmorphic p-3 rounded-md bg-background/50">
                <p className="text-sm text-muted-foreground italic text-center py-2">No significant abnormal or borderline metrics identified from available document data.</p>
            </div>
          )}
        </section>

        <Separator className="my-4" />
        <section>
            <h3 className="text-lg font-semibold mb-3 flex items-center text-green-600"><CheckCircle2 className="mr-2 h-5 w-5" />Normal Health Metrics</h3>
            {Object.keys(normalMetricsByCategory).length > 0 ? (
                <Accordion type="multiple" defaultValue={Object.keys(normalMetricsByCategory).slice(0,2)} className="w-full space-y-2">
                    {Object.entries(normalMetricsByCategory).map(([category, metrics]) => (
                        <AccordionItem value={category} key={category} className="border-none">
                            <AccordionTrigger className="px-3 py-2.5 text-sm font-semibold glassmorphic shadow-sm hover:shadow-md rounded-md bg-background/40 hover:bg-accent/10 data-[state=open]:rounded-b-none data-[state=open]:bg-accent/10">
                                <div className="flex items-center gap-2">
                                    {category} <Badge variant="outline" className="ml-1.5 font-normal bg-muted/50">{metrics.length}</Badge>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-0 pb-1 px-0.5">
                                <div className="border rounded-md rounded-t-none overflow-hidden glassmorphic bg-background/20 mt-[-2px]">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[25%]">Metric</TableHead>
                                                <TableHead className="w-[15%]">Value</TableHead>
                                                <TableHead className="w-[25%]">Normal Range Used</TableHead>
                                                <TableHead className="w-[15%]">Date</TableHead>
                                                <TableHead className="w-[10%]">Source</TableHead>
                                                <TableHead className="w-[10%] text-right">History</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {metrics.map((metric) => (
                                                <TableRow key={metric.id}>
                                                    <TableCell className="font-medium flex items-center gap-2 text-sm">
                                                        <IconDisplay icon={getMetricIcon(metric.name)} className="h-4 w-4 opacity-80" />
                                                        {metric.name}
                                                    </TableCell>
                                                    <TableCell className="text-sm">{metric.value} {metric.unit || ''}</TableCell>
                                                    <TableCell className="text-xs">{metric.rangeUsedForStatus || 'N/A'}</TableCell>
                                                    <TableCell className="text-xs">{metric.metricDateToUse ? format(metric.metricDateToUse, 'MMM d, yy') : 'N/A'}</TableCell>
                                                    <TableCell className="text-xs truncate max-w-[100px]" title={metric.originalDocumentName}>{metric.originalDocumentName || "N/A"}</TableCell>
                                                    <TableCell className="text-right">
                                                        {metricHistoryData[metric.name] && metricHistoryData[metric.name].length > 1 && (
                                                            <TooltipProvider delayDuration={150}><Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openHistoryModal(metric)}>
                                                                        <LineChartIcon className="h-4 w-4 text-primary/80" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent><p>View History for {metric.name}</p></TooltipContent>
                                                            </Tooltip></TooltipProvider>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            ) : (
                <div className="glassmorphic p-3 rounded-md bg-background/50">
                    <p className="text-sm text-muted-foreground italic text-center py-2">No normal range metrics found in documents or data not yet processed.</p>
                </div>
            )}
        </section>


        <Separator className="my-4" />
        <section>
            <h3 className="text-lg font-semibold mb-3 flex items-center text-primary"><MessageCircleQuestion className="mr-2 h-5 w-5" />Recent AI Diagnoses & Insights (from Chat)</h3>
            <div className="glassmorphic p-3 rounded-md bg-background/50">
                 {user?.consolidatedChatSummary && !user.consolidatedChatSummary.toLowerCase().includes("no significant chat conclusions") && !user.consolidatedChatSummary.toLowerCase().includes("no chat conclusions available") ? (
                     <div className="text-sm text-foreground space-y-2 prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5">
                        <ReactMarkdown>{user.consolidatedChatSummary}</ReactMarkdown>
                     </div>
                ) : (
                    <p className="text-sm text-muted-foreground italic text-center py-2">
                        No significant AI chat diagnoses or insights available yet, or summary indicates no major findings.
                    </p>
                )}
                 {user?.consolidatedChatSummaryLastUpdated && (
                    <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/20">
                        Chat Summary Last updated: {isValidDate(parseISO(user.consolidatedChatSummaryLastUpdated)) ? format(parseISO(user.consolidatedChatSummaryLastUpdated), "PPpp") : "Invalid date"}
                    </p>
                )}
            </div>
        </section>

      </CardContent>

      {selectedMetricForHistory && isHistoryModalOpen && (
        <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
            <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl glassmorphic h-[70vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <IconDisplay icon={getMetricIcon(selectedMetricForHistory.name)} className="h-5 w-5 text-primary"/> Historical Data for: {selectedMetricForHistory.name}
                    </DialogTitle>
                    <DialogDescription>
                        Latest: {selectedMetricForHistory.value} {selectedMetricForHistory.unit || ''} (on {selectedMetricForHistory.metricDateToUse ? format(selectedMetricForHistory.metricDateToUse, 'MMM d, yyyy') : 'N/A'})
                        {(selectedMetricForHistory.rangeUsedForStatus) && <span className="block text-xs">Normal Range Used: {selectedMetricForHistory.rangeUsedForStatus}</span>}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end items-center gap-2 py-2 border-b mb-2">
                    <span className="text-xs text-muted-foreground">Time Range:</span>
                    {(['1m', '3m', '6m', 'all'] as const).map(range => (
                        <Button
                            key={range}
                            variant={historicalTimeRange === range ? "default" : "outline"}
                            size="sm"
                            onClick={() => setHistoricalTimeRange(range)}
                            className="text-xs h-7"
                        >
                            {range.toUpperCase()}
                        </Button>
                    ))}
                </div>
                <div className="flex-grow min-h-0">
                   {FilteredHistoricalData().length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <RechartsLineChart data={FilteredHistoricalData()} margin={{ top: 5, right: 30, left: 0, bottom: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(str) => format(parseISO(str), 'MMM d')}
                                angle={-35}
                                textAnchor="end"
                                height={50}
                                interval="preserveStartEnd"
                                style={{ fontSize: '0.7rem' }}
                            />
                            <YAxis
                                unit={selectedMetricForHistory.unit || ''}
                                domain={['auto', 'auto']}
                                style={{ fontSize: '0.7rem' }}
                            />
                            <RechartsTooltip
                                contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)'}}
                                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                                itemStyle={{ color: 'hsl(var(--primary))' }}
                                formatter={(value: number, name: string, props: any) => [`${props.payload.value} ${selectedMetricForHistory.unit || ''}`, selectedMetricForHistory.name]}
                                labelFormatter={(label: string) => isValid(parseISO(label)) ? format(parseISO(label), 'MMM d, yyyy') : label}
                            />
                            <Legend wrapperStyle={{fontSize: '0.8rem'}}/>
                            {(GENERIC_NORMAL_RANGES[selectedMetricForHistory.name]?.min !== undefined || selectedMetricForHistory.numericValue && selectedMetricForHistory.normalRange?.match(/([\d.]+)-([\d.]+)/) && parseFloat(selectedMetricForHistory.normalRange.match(/([\d.]+)-([\d.]+)/)![1]) !== undefined) && (
                                <ReferenceLine
                                    y={GENERIC_NORMAL_RANGES[selectedMetricForHistory.name]?.min ?? (selectedMetricForHistory.normalRange?.match(/([\d.]+)-([\d.]+)/) ? parseFloat(selectedMetricForHistory.normalRange.match(/([\d.]+)-([\d.]+)/)![1]) : undefined) }
                                    label={{ value: `Min Normal: ${GENERIC_NORMAL_RANGES[selectedMetricForHistory.name]?.min ?? (selectedMetricForHistory.normalRange?.match(/([\d.]+)-([\d.]+)/) ? parseFloat(selectedMetricForHistory.normalRange.match(/([\d.]+)-([\d.]+)/)![1]) : '')}`, position: 'insideBottomLeft', fontSize: 10, fill: 'hsl(var(--orange-500))' }}
                                    stroke="hsl(var(--orange-500))"
                                    strokeDasharray="3 3"
                                    strokeOpacity={0.7}
                                />
                            )}
                             {(GENERIC_NORMAL_RANGES[selectedMetricForHistory.name]?.max !== undefined || selectedMetricForHistory.numericValue && selectedMetricForHistory.normalRange?.match(/([\d.]+)-([\d.]+)/) && parseFloat(selectedMetricForHistory.normalRange.match(/([\d.]+)-([\d.]+)/)![2]) !== undefined) && (
                                <ReferenceLine
                                    y={GENERIC_NORMAL_RANGES[selectedMetricForHistory.name]?.max ?? (selectedMetricForHistory.normalRange?.match(/([\d.]+)-([\d.]+)/) ? parseFloat(selectedMetricForHistory.normalRange.match(/([\d.]+)-([\d.]+)/)![2]) : undefined) }
                                    label={{ value: `Max Normal: ${GENERIC_NORMAL_RANGES[selectedMetricForHistory.name]?.max ?? (selectedMetricForHistory.normalRange?.match(/([\d.]+)-([\d.]+)/) ? parseFloat(selectedMetricForHistory.normalRange.match(/([\d.]+)-([\d.]+)/)![2]) : '')}`, position: 'insideTopLeft', fontSize: 10, fill: 'hsl(var(--orange-500))' }}
                                    stroke="hsl(var(--orange-500))"
                                    strokeDasharray="3 3"
                                    strokeOpacity={0.7}
                                />
                            )}
                            <Line type="monotone" dataKey="value" name={selectedMetricForHistory.name} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                        </RechartsLineChart>
                    </ResponsiveContainer>
                   ) : (
                    <p className="text-sm text-muted-foreground italic text-center py-10">No historical data available for this metric in the selected range.</p>
                   )}
                </div>
                <DialogModalFooter className="mt-auto pt-4">
                    <Button variant="outline" onClick={() => setIsHistoryModalOpen(false)}>Close</Button>
                </DialogModalFooter>
            </DialogContent>
        </Dialog>
      )}
    </Card>
  );
};
