
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { User, UserDocumentMetadata, UserProfileData } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  HeartPulse, Brain, AlertTriangle, Activity, ShieldCheck as ShieldCheckIcon, Asterisk, User as UserIcon, Ruler, Weight, Cake, VenetianMask, FileText,
  MessageCircleQuestion, LineChart as LineChartIcon, RefreshCw, Eye, Info, Thermometer, Droplet, Pill, Wind, ActivitySquare, Flame, Scale, Loader2, FileSearch,
  CalendarDays, CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, differenceInYears, isValid, subDays, isValid as isValidDate, isWithinInterval } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter as DialogModalFooter } from "@/components/ui/dialog";
import { ChartContainer } from '@/components/ui/chart';
import { LineChart, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, Line, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Button } from '@/components/ui/button';
import type { KeyMetric } from '@/ai/flows/summarize-medical-document';
import { generateOverallHealthSummary, type GenerateOverallHealthSummaryInput, type GenerateOverallHealthSummaryOutput } from '@/ai/flows/generateOverallHealthSummary';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


interface FullMedicalChartProps {
  user: User | null;
}

interface ProcessedMetric extends KeyMetric {
  id: string;
  status: 'normal' | 'high' | 'low' | 'unknown' | 'borderline_high' | 'borderline_low';
  originalDocumentName?: string;
  originalDocumentDate?: string; // ISO string
  numericValue?: number | null;
  isRecent?: boolean; // True if within last 30 days
  rangeUsedForStatus?: string | null; // Store the range that was used for assessment
}

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

const GENERIC_NORMAL_RANGES: Record<string, { min?: number; max?: number; rangeString?: string, unit?: string }> = {
  'Heart Rate': { min: 60, max: 100, rangeString: '60-100', unit: 'bpm' },
  'Systolic Blood Pressure': { max: 120, rangeString: '<120', unit: 'mmHg' },
  'Diastolic Blood Pressure': { max: 80, rangeString: '<80', unit: 'mmHg' },
  'Blood Glucose': { min: 70, max: 100, rangeString: '70-100', unit: 'mg/dL' }, // Fasting
  'Body Temperature': { min: 36.1, max: 37.2, rangeString: '36.1-37.2', unit: '°C' },
  'Oxygen Saturation': { min: 95, max: 100, rangeString: '95-100', unit: '%' },
  'Respiratory Rate': {min: 12, max: 20, rangeString: '12-20', unit: 'breaths/min'},
  'White Blood Cell Count': {min: 4.0, max: 11.0, rangeString: '4.0-11.0', unit: 'x10^9/L'},
  'Red Blood Cell Count': {min: 4.2, max: 5.9, rangeString: '4.2-5.9', unit: 'x10^12/L'}, 
  'Hemoglobin': {min: 13.0, max: 17.0, rangeString: '13.0-17.0', unit: 'g/dL'}, 
  'Hematocrit': {min: 38, max: 50, rangeString: '38-50', unit: '%'}, 
  'Platelet Count': {min: 150, max: 450, rangeString: '150-450', unit: 'x10^9/L'},
  'Cholesterol': {max: 200, rangeString: '<200', unit: 'mg/dL'},
  'LDL Cholesterol': {max: 100, rangeString: '<100', unit: 'mg/dL'},
  'HDL Cholesterol': {min: 40, rangeString: '>40', unit: 'mg/dL'}, 
  'Triglycerides': {max: 150, rangeString: '<150', unit: 'mg/dL'},
  'Creatinine': {min: 0.6, max: 1.3, rangeString: '0.6-1.3', unit: 'mg/dL'},
  'Urea Nitrogen (BUN)': {min: 7, max: 20, rangeString: '7-20', unit: 'mg/dL'},
  'Alanine Aminotransferase (ALT)': {max: 40, rangeString: '<40', unit: 'U/L'},
  'Aspartate Aminotransferase (AST)': {max: 40, rangeString: '<40', unit: 'U/L'},
  'Alkaline Phosphatase (ALP)': {min: 44, max: 147, rangeString: '44-147', unit: 'U/L'},
  'Total Bilirubin': {max: 1.2, rangeString: '<1.2', unit: 'mg/dL'},
  'Albumin': {min: 3.4, max: 5.4, rangeString: '3.4-5.4', unit: 'g/dL'},
  'Thyroid Stimulating Hormone (TSH)': {min: 0.4, max: 4.0, rangeString: '0.4-4.0', unit: 'µIU/mL'},
  'Free Thyroxine (FT4)': {min: 0.8, max: 1.8, rangeString: '0.8-1.8', unit: 'ng/dL'},
};


export const FullMedicalChart: React.FC<FullMedicalChartProps> = ({ user: userProp }) => {
  const { user: authUser, updateUserProfile: authUpdateUserProfile } = useAuth();
  const user = userProp || authUser;
  const { toast } = useToast();

  const [overallAISummary, setOverallAISummary] = useState<string | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState<boolean>(false);
  const [summaryLastUpdated, setSummaryLastUpdated] = useState<string | null>(null);
  
  const [debugUserProfileInput, setDebugUserProfileInput] = useState<UserProfileData | null>(null);
  const [debugFetchedDocSummary, setDebugFetchedDocSummary] = useState<string | null>(null);
  const [debugFetchedChatSummary, setDebugFetchedChatSummary] = useState<string | null>(null);
  const [debugPromptInputToAI, setDebugPromptInputToAI] = useState<string | null>(null);

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
        if (user.aiGeneratedOverallSummaryLastUpdated) {
          setSummaryLastUpdated(format(parseISO(user.aiGeneratedOverallSummaryLastUpdated), "PPpp"));
        }
        setDebugFetchedDocSummary(user.consolidatedDocumentAnalysisSummary || "Cached summary used, doc summary not re-fetched by client.");
        setDebugFetchedChatSummary(user.consolidatedChatSummary || "Cached summary used, chat summary not re-fetched by client.");
        setDebugPromptInputToAI("Cached overall summary used, AI not called by client.");
        setIsSummaryLoading(false);
        return;
    }
    
    const userProfileDataForFlow: UserProfileData = { 
      name: user.name,
      age: user.age,
      gender: user.gender,
      height: user.height,
      weight: user.weight,
      existingConditions: user.existingConditions,
      allergies: user.allergies,
    };
    setDebugUserProfileInput(userProfileDataForFlow);

    try {
      const inputForFlow: GenerateOverallHealthSummaryInput = {
          userId: user.id,
          // userProfile will be constructed inside the flow from user.id
      };
      
      const result = await generateOverallHealthSummary(inputForFlow);

      if (result.overallHealthSummary) {
        setOverallAISummary(result.overallHealthSummary);
        const lastUpdatedDate = result.lastUpdated ? parseISO(result.lastUpdated) : new Date();
        setSummaryLastUpdated(isValidDate(lastUpdatedDate) ? format(lastUpdatedDate, "PPpp") : "Recently");

        authUpdateUserProfile({ 
            aiGeneratedOverallSummary: result.overallHealthSummary,
            aiGeneratedOverallSummaryLastUpdated: result.lastUpdated || new Date().toISOString(),
        });
        setDebugFetchedDocSummary(result.debug_fetchedDocSummary || "Not returned by flow");
        setDebugFetchedChatSummary(result.debug_fetchedChatSummary || "Not returned by flow");
        setDebugPromptInputToAI(result.debug_promptInputToAI || "Not returned by flow");
      } else {
         setOverallAISummary("AI could not generate a summary at this time. There might not be enough information.");
         setSummaryLastUpdated(format(new Date(), "PPpp"));
      }
    } catch (error) {
      console.error("Error generating overall health summary:", error);
      toast({
        title: "Error Generating Summary",
        description: "Could not generate the AI health summary. Please try refreshing.",
        variant: "destructive",
        iconType: "error"
      });
      setOverallAISummary("Failed to load AI health summary. Please try refreshing.");
      setSummaryLastUpdated(format(new Date(), "PPpp"));
    } finally {
      setIsSummaryLoading(false);
    }
  }, [user, authUpdateUserProfile, toast]);

  useEffect(() => {
    if (user && user.id && authUpdateUserProfile) {
      fetchAndGenerateOverallSummary();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.consolidatedDocumentAnalysisSummaryLastUpdated, user?.consolidatedChatSummaryLastUpdated]);


 const getMetricStatusAndValue = useCallback((metric: KeyMetric): Pick<ProcessedMetric, 'status' | 'numericValue' | 'rangeUsedForStatus'> => {
    const numericValue = parseFloat(String(metric.value).replace(/[^0-9.-]/g, ''));
    let rangeUsed: string | null = metric.normalRange || null;

    if (isNaN(numericValue)) return { status: 'unknown', numericValue: null, rangeUsedForStatus: rangeUsed };

    let effectiveRange = GENERIC_NORMAL_RANGES[metric.name];

    if (metric.normalRange && typeof metric.normalRange === 'string' && metric.normalRange.trim() !== "") {
        const parts = metric.normalRange.split('-').map(s => parseFloat(s.trim().replace(/[^0-9.-]/g, '')));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            effectiveRange = { min: parts[0], max: parts[1], rangeString: metric.normalRange };
        } else if (metric.normalRange.startsWith('<') && !isNaN(parseFloat(metric.normalRange.substring(1).trim().replace(/[^0-9.-]/g, '')))) {
            effectiveRange = { max: parseFloat(metric.normalRange.substring(1).trim().replace(/[^0-9.-]/g, '')), rangeString: metric.normalRange };
        } else if (metric.normalRange.startsWith('>') && !isNaN(parseFloat(metric.normalRange.substring(1).trim().replace(/[^0-9.-]/g, '')))) {
            effectiveRange = { min: parseFloat(metric.normalRange.substring(1).trim().replace(/[^0-9.-]/g, '')), rangeString: metric.normalRange };
        } else {
           rangeUsed = GENERIC_NORMAL_RANGES[metric.name]?.rangeString || null; // Fallback if document range is unparseable
        }
    } else {
        rangeUsed = GENERIC_NORMAL_RANGES[metric.name]?.rangeString || null; // Fallback if no document range
    }


    if (effectiveRange) {
        const { min, max } = effectiveRange;
        const rangeSize = (max !== undefined && min !== undefined && max > min) ? (max - min) : ((max || min || Math.abs(numericValue) || 1) * 0.2); // 20% of value if single-sided range
        const buffer = Math.max(0.05 * Math.abs(numericValue), rangeSize > 0 ? rangeSize * 0.05 : 0.1); // 5% buffer, or 0.1 abs

        if (min !== undefined && max !== undefined) {
            if (numericValue < min - buffer) return { status: 'low', numericValue, rangeUsedForStatus: rangeUsed };
            if (numericValue > max + buffer) return { status: 'high', numericValue, rangeUsedForStatus: rangeUsed };
            if (numericValue < min) return { status: 'borderline_low', numericValue, rangeUsedForStatus: rangeUsed };
            if (numericValue > max) return { status: 'borderline_high', numericValue, rangeUsedForStatus: rangeUsed };
            return { status: 'normal', numericValue, rangeUsedForStatus: rangeUsed };
        } else if (min !== undefined) { 
            if (numericValue < min - buffer) return { status: 'low', numericValue, rangeUsedForStatus: rangeUsed };
            if (numericValue < min) return { status: 'borderline_low', numericValue, rangeUsedForStatus: rangeUsed };
            return { status: 'normal', numericValue, rangeUsedForStatus: rangeUsed };
        } else if (max !== undefined) { 
            if (numericValue > max + buffer) return { status: 'high', numericValue, rangeUsedForStatus: rangeUsed };
            if (numericValue > max) return { status: 'borderline_high', numericValue, rangeUsedForStatus: rangeUsed };
            return { status: 'normal', numericValue, rangeUsedForStatus: rangeUsed };
        }
    }
    return { status: 'unknown', numericValue, rangeUsedForStatus: rangeUsed };
  }, []);


  useEffect(() => {
    if (user && Array.isArray(user.documentMetadata)) {
      const allMetricsFlat: ProcessedMetric[] = [];
      const history: Record<string, { date: string; value: number }[]> = {};
      const normalByCategory: Record<string, ProcessedMetric[]> = {};
      const thirtyDaysAgo = subDays(new Date(), 30);

      (user.documentMetadata as UserDocumentMetadata[]).forEach(doc => {
        if (doc.keyMetrics && Array.isArray(doc.keyMetrics) && doc.isRelevant) {
          (doc.keyMetrics as KeyMetric[]).forEach((km, idx) => { 
            const { status, numericValue, rangeUsedForStatus } = getMetricStatusAndValue(km);
            const docTimestampDate = doc.uploadDate && typeof doc.uploadDate.seconds === 'number' ? new Date(doc.uploadDate.seconds * 1000) : new Date();
            const metricDate = km.date && isValidDate(parseISO(km.date)) ? parseISO(km.date) : docTimestampDate;
            const metricDateStr = isValidDate(metricDate) ? metricDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

            const processedMetric: ProcessedMetric = {
              ...km,
              id: `${doc.id || `doc-${Date.now()}`}-${km.name.replace(/\s+/g, '-')}-${idx}`,
              status,
              numericValue,
              originalDocumentName: doc.name,
              originalDocumentDate: isValidDate(docTimestampDate) ? docTimestampDate.toISOString() : new Date().toISOString(),
              date: metricDateStr,
              isRecent: isValidDate(metricDate) ? !isWithinInterval(metricDate, {start: new Date(0), end: thirtyDaysAgo}) : false,
              normalRange: km.normalRange, // Store original normal range from doc
              rangeUsedForStatus: rangeUsedForStatus, // Store the range used for status calc
            };
            allMetricsFlat.push(processedMetric);

            if (numericValue !== null && processedMetric.date && isValidDate(parseISO(processedMetric.date))) {
              if (!history[km.name]) history[km.name] = [];
              history[km.name].push({ date: processedMetric.date, value: numericValue });
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
      filteredAbnormal.sort((a,b) => (b.date && a.date && isValidDate(parseISO(b.date)) && isValidDate(parseISO(a.date))) ? parseISO(b.date).getTime() - parseISO(a.date).getTime() : 0);
      setAbnormalMetrics(filteredAbnormal);

      Object.keys(history).forEach(key => history[key].sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()));
      setMetricHistoryData(history);

      Object.keys(normalByCategory).forEach(cat => normalByCategory[cat].sort((a,b) => (b.date && a.date && isValidDate(parseISO(b.date)) && isValidDate(parseISO(a.date))) ? parseISO(b.date).getTime() - parseISO(a.date).getTime() : 0));
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

  const getMetricIcon = (metricName?: string): React.ElementType => {
    if (!metricName) return Activity;
    const name = metricName.toLowerCase();
    if (name.includes('heart rate')) return HeartPulse;
    if (name.includes('blood pressure') || name.includes('systolic') || name.includes('diastolic')) return ActivitySquare;
    if (name.includes('glucose')) return Droplet;
    if (name.includes('temperature')) return Thermometer;
    if (name.includes('oxygen') || name.includes('spo2')) return Wind;
    if (name.includes('respiratory')) return Activity;
    if (name.includes('cholesterol')) return Activity;
    if (name.includes('weight')) return Weight;
    if (name.includes('height')) return Ruler;
    if (name.includes('bmi')) return Scale;
    if (name.includes('rbc') || name.includes('red blood cell')) return Droplet;
    if (name.includes('wbc') || name.includes('white blood cell')) return Droplet;
    if (name.includes('hemoglobin')) return Droplet;
    if (name.includes('hematocrit')) return Droplet;
    if (name.includes('platelet')) return Droplet;
    if (name.includes('creatinine')) return Droplet;
    if (name.includes('urea')) return Droplet;
    if (name.includes('alt') || name.includes('alanine aminotransferase')) return Activity;
    if (name.includes('ast') || name.includes('aspartate aminotransferase')) return Activity;
    if (name.includes('alp') || name.includes('alkaline phosphatase')) return Activity;
    if (name.includes('bilirubin')) return Droplet;
    if (name.includes('albumin')) return Droplet;
    if (name.includes('tsh') || name.includes('thyroid stimulating hormone')) return Brain;
    if (name.includes('ft4') || name.includes('free thyroxine')) return Brain;
    return Info; 
  };

  const FilteredHistoricalData = () => {
    if (!selectedMetricForHistory || !metricHistoryData[selectedMetricForHistory.name]) return [];
    let allData = metricHistoryData[selectedMetricForHistory.name];
    if (!allData || allData.length === 0) return [];
    
    allData = allData.filter(d => d.date && isValidDate(parseISO(d.date)));
    allData.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

    if (historicalTimeRange === 'all') return allData;

    const now = new Date();
    let startDateBoundary: Date;
    if (historicalTimeRange === '1m') startDateBoundary = subDays(now, 30);
    else if (historicalTimeRange === '3m') startDateBoundary = subDays(now, 90);
    else startDateBoundary = subDays(now, 180); // 6m

    return allData.filter(d => !isWithinInterval(parseISO(d.date), {start: new Date(0), end: startDateBoundary}));
  };

  if (!user) {
    return <Card className="glassmorphic p-6 text-center"><p className="text-muted-foreground">User data not available.</p></Card>;
  }

  const userBirthdayDate = user.birthday && isValidDate(parseISO(user.birthday)) ? parseISO(user.birthday) : undefined;
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

  const IconDisplay = ({ icon: IconComp, ...props }: { icon?: React.ElementType, [key: string]: any }) => {
    if (!IconComp) return <Info {...props} />;
    return <IconComp {...props} />;
  };

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
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-primary flex items-center">
              <Brain className="mr-2 h-5 w-5" />AI Overall Health Summary
            </h3>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => fetchAndGenerateOverallSummary(true)} disabled={isSummaryLoading}>
              {isSummaryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
          <div className="glassmorphic p-3 rounded-md bg-background/50 min-h-[80px]">
            {isSummaryLoading ? (
                <div className="flex items-center justify-center h-full py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary"/>
                    <p className="ml-2 text-muted-foreground">Generating summary...</p>
                </div>
            ) : overallAISummary ? (
                <div className="text-sm text-foreground space-y-2">
                   <ReactMarkdown
                     components={{
                        p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-1 pl-2" {...props} />,
                        li: ({node, ...props}) => <li className="text-sm" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                        em: ({node, ...props}) => <em className="italic" {...props} />,
                     }}
                   >{overallAISummary}</ReactMarkdown>
                   {summaryLastUpdated && <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/20">Last updated: {summaryLastUpdated}</p>}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground italic text-center py-4">
                    No AI summary available or failed to load. Please ensure all relevant data is up-to-date and try refreshing.
                </p>
            )}
          </div>
        </section>
        
        <section className="border-2 border-yellow-500/50 p-3 rounded-md my-4 glassmorphic bg-yellow-500/5">
          <h3 className="text-md font-semibold text-yellow-700 dark:text-yellow-400 mb-2 flex items-center gap-2">
            <FileSearch className="h-4 w-4"/>DEBUG Information
          </h3>
          <ScrollArea className="max-h-60 custom-scrollbar pr-2">
            <div className="space-y-2 text-xs">
              <div>
                <p className="font-medium text-foreground/80">User Object (Consolidated Summaries - from Client `user` prop):</p>
                <div className="whitespace-pre-wrap bg-background/50 p-2 rounded text-muted-foreground max-h-24 overflow-auto custom-scrollbar">
                  <p><span className="font-semibold">Doc Summary:</span> {user?.consolidatedDocumentAnalysisSummary || "Not available in client `user` prop"}</p>
                  <p><span className="font-semibold">Chat Summary:</span> {user?.consolidatedChatSummary || "Not available in client `user` prop"}</p>
                </div>
              </div>
              <div>
                <p className="font-medium text-foreground/80">Input Sent to `generateOverallHealthSummary` Flow (Client-Side):</p>
                <div className="whitespace-pre-wrap bg-background/50 p-2 rounded text-muted-foreground max-h-24 overflow-auto custom-scrollbar">
                  <p><span className="font-semibold">UserID:</span> {user?.id || "N/A"}</p>
                  <p><span className="font-semibold">UserProfile Input:</span> {JSON.stringify(debugUserProfileInput, null, 2) || "N/A"}</p>
                </div>
              </div>
              <div>
                <p className="font-medium text-foreground/80">Data Returned by Server Flow (for AI Prompt):</p>
                <div className="whitespace-pre-wrap bg-background/50 p-2 rounded text-muted-foreground max-h-24 overflow-auto custom-scrollbar">
                  <p><span className="font-semibold">Fetched Doc Summary (by Flow):</span> {debugFetchedDocSummary || "N/A"}</p>
                  <p><span className="font-semibold">Fetched Chat Summary (by Flow):</span> {debugFetchedChatSummary || "N/A"}</p>
                </div>
              </div>
              <div>
                <p className="font-medium text-foreground/80">Full Input to AI Model (JSON string):</p>
                <div className="whitespace-pre-wrap bg-background/50 p-2 rounded text-muted-foreground max-h-32 overflow-auto custom-scrollbar">
                  {debugPromptInputToAI || "N/A"}
                </div>
              </div>
            </div>
          </ScrollArea>
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
                    <TableHead className="w-[25%]">Metric</TableHead>
                    <TableHead className="w-[15%]">Value</TableHead>
                    <TableHead className="w-[15%] text-center">Status</TableHead>
                    <TableHead className="w-[15%]">Normal Range Used</TableHead>
                    <TableHead className="w-[15%]">Date</TableHead>
                    <TableHead className="w-[10%]">Source</TableHead>
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
                           {metric.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{metric.rangeUsedForStatus || 'N/A'}</TableCell>
                      <TableCell className="text-xs">{metric.date ? format(parseISO(metric.date), 'MMM d, yy') : 'N/A'}</TableCell>
                      <TableCell className="text-xs truncate" title={metric.originalDocumentName}>
                        {metric.originalDocumentName ? (
                            <TooltipProvider delayDuration={150}><Tooltip>
                                <TooltipTrigger asChild><FileText className="h-4 w-4 text-muted-foreground hover:text-primary cursor-help"/></TooltipTrigger>
                                <TooltipContent><p>{metric.originalDocumentName}</p><p className="text-xs text-muted-foreground">{metric.originalDocumentDate ? format(parseISO(metric.originalDocumentDate), 'PP') : ''}</p></TooltipContent>
                            </Tooltip></TooltipProvider>
                        ) : 'N/A'}
                      </TableCell>
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
                <div className="space-y-4">
                    {Object.entries(normalMetricsByCategory).map(([category, metrics]) => (
                        <div key={category} className="glassmorphic p-3 rounded-md bg-background/30">
                            <h4 className="text-md font-semibold mb-2 text-foreground/90">{category} ({metrics.length})</h4>
                            <div className="border rounded-md overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[30%]">Metric</TableHead>
                                            <TableHead className="w-[20%]">Value</TableHead>
                                            <TableHead className="w-[20%]">Normal Range Used</TableHead>
                                            <TableHead className="w-[15%]">Date</TableHead>
                                            <TableHead className="w-[15%] text-right">History</TableHead>
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
                                                <TableCell className="text-xs">{metric.date ? format(parseISO(metric.date), 'MMM d, yy') : 'N/A'}</TableCell>
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
                        </div>
                    ))}
                </div>
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
                     <ReactMarkdown className="text-sm text-foreground space-y-2"
                        components={{
                            p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-1 pl-2" {...props} />,
                            li: ({node, ...props}) => <li className="text-sm" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                            em: ({node, ...props}) => <em className="italic" {...props} />,
                        }}
                     >{user.consolidatedChatSummary}</ReactMarkdown>
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
                        Latest: {selectedMetricForHistory.value} {selectedMetricForHistory.unit || ''} (on {selectedMetricForHistory.date ? format(parseISO(selectedMetricForHistory.date), 'MMM d, yyyy') : 'N/A'})
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
                        <LineChart data={FilteredHistoricalData()} margin={{ top: 5, right: 30, left: 0, bottom: 30 }}>
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
                                formatter={(value: number) => [`${value} ${selectedMetricForHistory.unit || ''}`, selectedMetricForHistory.name]}
                                labelFormatter={(label: string) => isValidDate(parseISO(label)) ? format(parseISO(label), 'MMM d, yyyy') : label}
                            />
                            <Legend wrapperStyle={{fontSize: '0.8rem'}}/>
                            {(GENERIC_NORMAL_RANGES[selectedMetricForHistory.name]?.min !== undefined) && (
                                <ReferenceLine
                                    y={GENERIC_NORMAL_RANGES[selectedMetricForHistory.name]?.min }
                                    label={{ value: `Min Normal: ${GENERIC_NORMAL_RANGES[selectedMetricForHistory.name]?.min}`, position: 'insideBottomLeft', fontSize: 10, fill: 'hsl(var(--orange-500))' }}
                                    stroke="hsl(var(--orange-500))"
                                    strokeDasharray="3 3"
                                    strokeOpacity={0.7}
                                />
                            )}
                             {(GENERIC_NORMAL_RANGES[selectedMetricForHistory.name]?.max !== undefined) && (
                                <ReferenceLine
                                    y={GENERIC_NORMAL_RANGES[selectedMetricForHistory.name]?.max }
                                    label={{ value: `Max Normal: ${GENERIC_NORMAL_RANGES[selectedMetricForHistory.name]?.max}`, position: 'insideTopLeft', fontSize: 10, fill: 'hsl(var(--orange-500))' }}
                                    stroke="hsl(var(--orange-500))"
                                    strokeDasharray="3 3"
                                    strokeOpacity={0.7}
                                />
                            )}
                            <Line type="monotone" dataKey="value" name={selectedMetricForHistory.name} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                        </LineChart>
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
