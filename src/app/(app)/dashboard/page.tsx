
"use client"

import React, { useState, useMemo, useEffect, useCallback, useContext, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import {
    PlusCircle, X, TrendingUp, Activity, BarChart3, AlertTriangle, Thermometer, Droplet, Pill, Search,
    ListFilter, LineChart as LineChartLucide, AreaChart, ListChecks, TrendingDown, ActivitySquare, FileUp, MessageCircle,
    Edit, Save, Columns, Maximize2, Settings2, Lightbulb, Minus, Plus, Wind, Brain, EyeOff,
    LayoutGrid, Sparkles, Shuffle, Type, DatabaseZap, Wand2, Edit3, CheckCircle2, HelpCircle, Target, Ruler, Scale, Flame,
    Moon, History, PieChartIcon, User as UserIconLucide, FileText as MedicalChartIcon, Download
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter as DialogModalFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import * as RechartsPrimitive from 'recharts';

import { ChartConfig } from '@/components/ui/chart';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useAuth, type UserPreferences } from '@/contexts/AuthContext';
import type { User as AuthUserType } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { dailyHealthInsight, type DailyHealthInsightOutput } from '@/ai/flows/daily-health-insight';
import { estimateMealCalories, type EstimateMealCaloriesOutput, type MacrosSchema as MealMacros } from '@/ai/flows/estimateMealCalories';
import { Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import CustomWidgetFormContent from './_components/custom-widget-form';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast, type ToastVariantIcon } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, updateDoc, query, orderBy, limit, addDoc, Timestamp, where, getDoc, serverTimestamp, writeBatch, Unsubscribe, onSnapshot } from 'firebase/firestore';
import { formatISO, parseISO, startOfDay, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, isValid as isValidDate, differenceInYears, subDays, isToday } from 'date-fns';
import { FullMedicalChart } from '@/components/medical-chart/FullMedicalChart';
import { useSidebar } from '@/components/ui/sidebar';


// Import Widget Components
import NumberWidget from './_components/widgets/NumberWidget';
import BmiWidget from './_components/widgets/BmiWidget';
import ManualInputWidget from './_components/widgets/ManualInputWidget';
import AiInsightWidget from './_components/widgets/AiInsightWidget';
import ProgressWidget from './_components/widgets/ProgressWidget';
import DataListWidget from './_components/widgets/DataListWidget';
import RadialBarChartWidget from './_components/widgets/RadialBarChartWidget';
import ChartWidget from './_components/widgets/ChartWidget';
import CalorieTrackerWidget, { type StoredCalorieLog, type MealEntry as CalorieMealEntry } from './_components/widgets/CalorieTrackerWidget';


const Apple = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M15.229.041a5.944 5.944 0 00-4.21 1.746 5.943 5.943 0 00-1.745 4.213A10.35 10.35 0 002.98 14.08a10.83 10.83 0 006.703 8.846 5.72 5.72 0 003.82.04 5.76 5.76 0 003.818-2.206c.003-.004.003-.008.006-.012a.11.11 0 00.01-.015.107.107 0 00.008-.012c.004-.006.004-.01.007-.015a.09.09 0 00.008-.01c.003-.007.003-.01.006-.017.035-.09.035-.18.035-.271 0-.13-.02-.26-.06-.389a2.624 2.624 0 00-2.45-1.734c-.008 0-.016 0-.024.002a.09.09 0 00-.018.003c-.005.002-.01.003-.014.004a.07.07 0 00-.016.005.06.06 0 00-.01.004.08.08 0 00-.014.006.06.06 0 00-.01.005c-.005.004-.01.007-.014.01a.07.07 0 00-.01.006c-.004.004-.008.008-.012.012a.09.09 0 00-.008.007.06.06 0 00-.01.007.08.08 0 00-.007.007.09.09 0 00-.006.008c-.002.003-.002.006-.005.008a.07.07 0 00-.004.007.1.1 0 00-.003.008c-.002.002-.002.005-.004.007a.09.09 0 00-.002.007c0 .003-.002.005-.002.008a.17.17 0 00-.002.01c0 .002-.002.004-.002.006v.003a2.66 2.66 0 002.56 2.566c.002 0 .003 0 .005 0a.05.05 0 00.008 0c.002 0 .003 0 .005 0a.09.09 0 00.008-.002c.002 0 .004-.002.006-.002a.08.08 0 00.006-.003.06.06 0 00.006-.003.09.09 0 00.005-.004c.002-.002.004-.003.005-.005a.08.08 0 00.004-.004.07.07 0 00.004-.004.08.08 0 00.003-.005c.002-.002.003-.004.004-.006a.1.1 0 00.002-.005c.002-.003.003-.006.004-.008a.19.19 0 000-.005c.329-.697.508-1.47.508-2.266a5.95 5.95 0 00-2.954-5.115 5.82 5.82 0 00-3.24-1.138 3.53 3.53 0 01-3.077-2.335 3.46 3.46 0 012.32-3.082A5.72 5.72 0 0015.229.042z"/>
    <path d="M12.376 5.467a2.983 2.983 0 00-2.36 1.175 2.983 2.983 0 00-1.173 2.363c0 .89.393 1.69.998 2.237a2.72 2.72 0 002.1.868 2.69 2.69 0 002.143-.935c.033-.036.062-.076.087-.119a.11.11 0 00.012-.02.09.09 0 00.01-.018.1.1 0 00.006-.017.11.11 0 00.005-.018.13.13 0 00.002-.018c.002-.008.002-.017.002-.025a.22.22 0 00-.002-.025c0-.007-.002-.013-.002-.02a.11.11 0 00-.005-.018.1.1 0 00-.006-.017.09.09 0 00-.01-.018.11.11 0 00-.012-.02.1.1 0 00-.013-.017c-.006-.005-.01-.01-.016-.014l-.015-.012a2.73 2.73 0 00-2.706-1.012z"/>
  </svg>
);

const Google = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/><path d="M1 1h22v22H1z" fill="none"/>
    </svg>
);


type MetricSize = 'sm' | 'md' | 'lg';
const widgetSizeClasses: Record<MetricSize, string> = {
  sm: 'col-span-1 row-span-1 min-h-[150px]', 
  md: 'col-span-2 row-span-1 md:col-span-1 lg:col-span-2 min-h-[150px]', 
  lg: 'col-span-2 row-span-2 md:col-span-2 lg:col-span-4 min-h-[300px]', 
};

interface BaseMetricConfig {
  id: string;
  title: string;
  category: string;
  description?: string;
  iconName?: string | null; 
  dataKey?: string;
}

type DataSource = 'apple_health' | 'google_health' | 'document_analysis' | 'manual' | 'ai_generated';
type ManualInputType = 'number' | 'text' | 'hydration' | 'steps' | 'sleep' | undefined;


export interface DashboardMetric extends BaseMetricConfig {
  value: string | number;
  type: 'number' | 'bar-chart' | 'line-chart' | 'area-chart' | 'data-list' | 'progress' | 'manual-input' | 'radial-bar-chart' | 'ai-insight' | 'bmi' | 'calorie-tracker';
  size: MetricSize;
  unit?: string | null;

  possibleDataSources: DataSource[];
  currentDataSource: DataSource;
  isDataAvailable: boolean;

  chartData?: any[] | null;
  chartConfig?: ChartConfig | null;
  listData?: Array<{label: string, value: string | number, iconName?: string}> | string[] | null;
  progressValue?: number | null;
  manualInputValue?: string | number | null;
  manualInputValueLastUpdated?: Timestamp | null; // Added for daily reset logic
  aiInsightData?: DailyHealthInsightOutput | null;
  bmiValue?: number | null;
  bmiCategory?: string | null;
  dailyMeals?: CalorieMealEntry[] | null;
  dailyCalorieGoal?: number | null;

  manualInputType?: ManualInputType | null;
  lastUpdated?: string | null;
  show7DayGraph?: boolean | null;
  order?: number; 
}

export interface AvailableMetricConfig extends BaseMetricConfig {
  defaultType: DashboardMetric['type'];
  defaultUnit?: string | null;
  defaultSize: MetricSize;
  possibleDataSources: DataSource[];
  defaultDataSource: DataSource;
  manualInputType?: ManualInputType | null;
}


export interface BmiHistoryEntry {
  date: string; // ISO string
  bmi: number;
}

export const iconMap: { [key: string]: React.ElementType } = {
  Activity, BarChart3, Brain, Lightbulb, Moon, Pill, Thermometer, TrendingUp, Droplet, Wand2, PlusCircle, Edit3, Sparkles, EyeOff, HelpCircle, LayoutGrid, DatabaseZap, Type, LineChartLucide, AreaChart, ListChecks, ActivitySquare, FileUp, MessageCircle, Edit, Save, Columns, Maximize2, Settings2, Minus, Plus, Wind, Target, Ruler, Scale, Flame, History, PieChartIcon, UserIconLucide, MedicalChartIcon
};

export const componentToIconName = (component?: React.ElementType): string | undefined => {
  if (!component) return undefined;
  if (typeof component === 'object' && component !== null && 'displayName' in component) {
    return (component as any).displayName;
  }
  if (typeof component === 'function') return component.name;
  for (const name in iconMap) { if (iconMap[name] === component) { return name; }}
  return undefined;
};

export const iconNameToComponent = (name?: string | null): React.ElementType | undefined => {
  if (!name) return undefined;
  return iconMap[name] || HelpCircle; 
};


export const availableMetricsData: AvailableMetricConfig[] = [
  { id: 'hr', title: 'Heart Rate', category: 'Vital Signs', description: 'Your current and historical heart rate.', iconName: 'Activity', defaultType: 'line-chart', defaultUnit: 'bpm', defaultSize: 'md', possibleDataSources: ['apple_health', 'google_health', 'manual'], defaultDataSource: 'apple_health', dataKey: 'rate', manualInputType: 'number' },
  { id: 'bp', title: 'Blood Pressure', category: 'Vital Signs', description: 'Latest blood pressure reading.', iconName: 'TrendingUp', defaultType: 'number', defaultUnit: 'mmHg', defaultSize: 'sm', possibleDataSources: ['document_analysis', 'manual'], defaultDataSource: 'document_analysis', manualInputType: 'text' },
  { id: 'temp', title: 'Body Temperature', category: 'Vital Signs', description: 'Log your body temperature.', iconName: 'Thermometer', defaultType: 'manual-input', manualInputType: 'number', defaultUnit: '°C', defaultSize: 'sm', possibleDataSources: ['manual'], defaultDataSource: 'manual' },
  { id: 'resp_rate', title: 'Respiratory Rate', category: 'Vital Signs', description: 'Breaths per minute.', iconName: 'Wind', defaultType: 'number', defaultUnit: 'bpm', defaultSize: 'sm', possibleDataSources: ['document_analysis', 'apple_health', 'manual'], defaultDataSource: 'document_analysis', manualInputType: 'number' },
  { id: 'o2_sat', title: 'Oxygen Saturation', category: 'Vital Signs', description: 'SpO2 levels.', iconName: 'Droplet', defaultType: 'radial-bar-chart', defaultUnit: '%', defaultSize: 'sm', possibleDataSources: ['apple_health', 'google_health', 'document_analysis'], defaultDataSource: 'apple_health', dataKey: 'value' },
  { id: 'glucose', title: 'Blood Glucose', category: 'Lab Results', description: 'Blood sugar levels.', iconName: 'Droplet', defaultType: 'area-chart', defaultUnit: 'mg/dL', defaultSize: 'md', possibleDataSources: ['document_analysis', 'manual'], defaultDataSource: 'document_analysis', dataKey: 'level', manualInputType: 'number' },
  { id: 'cholesterol', title: 'Cholesterol Panel', category: 'Lab Results', description: 'LDL, HDL, Total.', iconName: 'TrendingDown', defaultType: 'data-list', defaultSize: 'md', possibleDataSources: ['document_analysis'], defaultDataSource: 'document_analysis' },
  { id: 'hydration', title: 'Hydration Log', category: 'Lifestyle', description: 'Daily water intake.', iconName: 'Droplet', defaultType: 'manual-input', manualInputType: 'hydration', defaultUnit: 'cups', defaultSize: 'md', possibleDataSources: ['manual'], defaultDataSource: 'manual' },
  { id: 'steps_taken', title: 'Daily Steps', category: 'Lifestyle', description: 'Track your steps.', iconName: 'ActivitySquare', defaultType: 'manual-input', manualInputType: 'steps', defaultUnit: 'steps', defaultSize: 'md', possibleDataSources: ['apple_health', 'google_health', 'manual'], defaultDataSource: 'apple_health', dataKey: 'steps' },
  { id: 'sleep_duration', title: 'Sleep Log', category: 'Lifestyle', description: 'Hours of sleep.', iconName: 'Moon', defaultType: 'manual-input', manualInputType: 'sleep', defaultUnit: 'hours', defaultSize: 'md', possibleDataSources: ['apple_health', 'google_health', 'manual'], defaultDataSource: 'apple_health', dataKey: 'hours' },
  { id: 'calories_intake', title: 'Calorie Tracker', category: 'Lifestyle', description: 'Log meals & estimate calories.', iconName: 'Flame', defaultType: 'calorie-tracker', defaultUnit: 'kcal', defaultSize: 'lg', possibleDataSources: ['manual', 'ai_generated'], defaultDataSource: 'manual' }, 
  { id: 'bmi', title: 'BMI Calculator', category: 'Body Composition', description: 'Body Mass Index based on height and weight.', iconName: 'Scale', defaultType: 'bmi', defaultSize: 'sm', possibleDataSources: ['manual'], defaultDataSource: 'manual' },
  { id: 'symptoms_log', title: 'Symptom Log', category: 'Symptoms', description: 'Manually log symptoms.', iconName: 'AlertTriangle', defaultType: 'data-list', defaultSize: 'md', possibleDataSources: ['manual'], defaultDataSource: 'manual' },
  { id: 'meds', title: 'Medications', category: 'Medications', description: 'From document analysis or manual input.', iconName: 'Pill', defaultType: 'data-list', defaultSize: 'md', possibleDataSources: ['document_analysis', 'manual'], defaultDataSource: 'document_analysis' },
  { id: 'ai_health_tip', title: 'AI Health Insight', category: 'Insights', description: 'Daily tip & quote from AI.', iconName: 'Lightbulb', defaultType: 'ai-insight', defaultSize: 'md', possibleDataSources: ['ai_generated'], defaultDataSource: 'ai_generated' },
];

export type UserProfile = AuthUserType;

const initialDashboardMetrics: DashboardMetric[] = [];

const metricCategories = Array.from(new Set(availableMetricsData.map(m => m.category)));

const displayTypesForCustomWidget = [
    { value: 'number' as DashboardMetric['type'], label: 'Simple Number', iconName: 'Type' },
    { value: 'line-chart' as DashboardMetric['type'], label: 'Line Chart', iconName: 'LineChartLucide' },
    { value: 'bar-chart' as DashboardMetric['type'], label: 'Bar Chart', iconName: 'BarChart3' },
    { value: 'area-chart' as DashboardMetric['type'], label: 'Area Chart', iconName: 'AreaChart' },
    { value: 'radial-bar-chart' as DashboardMetric['type'], label: 'Radial Progress', iconName: 'Sparkles' },
    { value: 'data-list' as DashboardMetric['type'], label: 'List View', iconName: 'ListChecks' },
    { value: 'progress' as DashboardMetric['type'], label: 'Progress Bar', iconName: 'ActivitySquare' },
];
const dataSourcesForCustomWidget = [
    { value: 'manual' as DataSource, label: 'Manual Input', iconName: 'Edit3' },
    { value: 'apple_health' as DataSource, label: 'Apple Health', iconName: 'Apple' }, 
    { value: 'google_health' as DataSource, label: 'Google Health', iconName: 'Google' }, 
    { value: 'document_analysis' as DataSource, label: 'Document Analysis', iconName: 'FileUp' },
];


export interface MetricStyling {
  textClass: string;
  iconName?: string;
  iconClass?: string;
  statusIconName?: string;
  statusIconClass?: string;
}

interface ManualEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  metric: DashboardMetric;
  onSave: (metricId: string, newValue: string | number) => void;
}


const ManualEditModal: React.FC<ManualEditModalProps> = ({ isOpen, onClose, metric, onSave }) => {
  const [inputValue, setInputValue] = useState<string | number>(metric.manualInputValue ?? (metric.manualInputType === 'number' || metric.manualInputType === 'hydration' || metric.manualInputType === 'steps' || metric.manualInputType === 'sleep' ? 0 : ''));
  const Icon = iconNameToComponent(metric.iconName);

  useEffect(() => {
    setInputValue(metric.manualInputValue ?? (metric.manualInputType === 'number' || metric.manualInputType === 'hydration' || metric.manualInputType === 'steps' || metric.manualInputType === 'sleep' ? 0 : ''));
  }, [isOpen, metric]);

  const handleSave = () => {
    onSave(metric.id, inputValue);
    onClose();
  };

  const renderInput = () => {
    switch (metric.manualInputType) {
      case 'hydration':
        return (
          <div className="flex items-center gap-3 justify-center">
            <Button variant="outline" size="icon" onClick={() => setInputValue(p => Math.max(0, (Number(p) || 0) - 1))} className="h-12 w-12 rounded-full glassmorphic hover:bg-primary/10"><Minus className="h-6 w-6"/></Button>
            <div className="flex flex-col items-center w-20">
              <span className="text-4xl font-bold tabular-nums">{Number(inputValue) || 0}</span>
              <span className="text-xs text-muted-foreground -mt-1">cups</span>
            </div>
            <Button variant="outline" size="icon" onClick={() => setInputValue(p => (Number(p) || 0) + 1)} className="h-12 w-12 rounded-full glassmorphic hover:bg-primary/10"><Plus className="h-6 w-6"/></Button>
          </div>
        );
      case 'number':
      case 'steps':
      case 'sleep':
        return <Input type="number" value={String(inputValue)} onChange={(e) => setInputValue(e.target.value === '' ? 0 : Number(e.target.value))} placeholder={`Enter ${metric.title.toLowerCase()}`} className="glassmorphic text-center" prependIcon={Icon || Edit3}/>;
      case 'text':
        return <Input value={String(inputValue)} onChange={(e) => setInputValue(e.target.value)} placeholder={`Enter data for ${metric.title.toLowerCase()}`} className="glassmorphic" prependIcon={Icon || Edit3}/>;
      default:
        return <Input value={String(inputValue)} onChange={(e) => setInputValue(e.target.value)} placeholder="Enter data" className="glassmorphic" prependIcon={Icon || Edit3}/>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="glassmorphic">
        <DialogHeader>
          <DialogTitle>Edit {metric.title}</DialogTitle>
          {metric.unit && <DialogDescription>Enter new value ({metric.unit})</DialogDescription>}
        </DialogHeader>
        <div className="py-4">{renderInput()}</div>
        <DialogModalFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} className="bg-primary hover:bg-primary/90">Save</Button>
        </DialogModalFooter>
      </DialogContent>
    </Dialog>
  );
};


const DashboardMetricCard = React.memo(({ metric, onDelete, onResize, onEdit, onUpdateMetric }: { metric: DashboardMetric; onDelete: (id: string) => void; onResize: (id: string, size: MetricSize) => void; onEdit: (metric: DashboardMetric) => void; onUpdateMetric: (id: string, data: Partial<DashboardMetric>) => void; }) => {
  const { user, updateUserProfile: authUpdateUserProfile } = useAuth();
  const { getMetricStyling, renderMetricContent, toggle7DayGraph, isEditMode, contextHandleEditMetric, setIsCalorieHistoryModalOpen, calorieHistory, setIsBmiHistoryModalOpen, bmiHistory, handleAddMeal, handleRemoveMeal } = useDashboardPageLogic();
  const styling = getMetricStyling(metric);

  const IconComponent = (metric.iconName && (typeof iconNameToComponent(metric.iconName) === 'function' || (typeof iconNameToComponent(metric.iconName) === 'object' && typeof (iconNameToComponent(metric.iconName) as any).render === 'function')))
    ? iconNameToComponent(metric.iconName)
    : HelpCircle;


  const showTopRightEditButton = (metric.type === 'manual-input' || metric.currentDataSource === 'manual') && metric.type !== 'calorie-tracker' && metric.type !== 'bmi';

  const handleEditGoalForCalorieTracker = () => {
     contextHandleEditMetric({
      ...metric,
      id: `${metric.id}-goal-edit`,
      title: "Daily Calorie Goal",
      manualInputType: 'number',
      manualInputValue: metric.dailyCalorieGoal || user?.dailyCalorieGoal || 2000,
      unit: 'kcal',
      type: 'manual-input',
    } as DashboardMetric);
  }

  return (
    <Card
      className={cn(
        widgetSizeClasses[metric.size],
        `dashboard-widget-card relative`,
        isEditMode && 'widget-editing draggable-item',
      )}
      data-metric-category={metric.category}
    >
      <CardHeader className="dashboard-widget-card-header">
        <div className="min-w-0 flex-1 flex items-center gap-1.5">
          {IconComponent && <IconComponent className={cn("h-4 w-4 shrink-0", styling.iconClass || "text-primary")} />}
          <CardTitle className="dashboard-widget-card-title">
            <span className="truncate leading-snug">{metric.title}</span>
          </CardTitle>
        </div>

        <div className="absolute top-2 right-2 z-10 flex items-center gap-0.5">
            {showTopRightEditButton && !isEditMode && (
             <TooltipProvider delayDuration={100}><Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 p-0 opacity-60 hover:opacity-100 text-muted-foreground hover:text-primary" onClick={() => onEdit(metric)} aria-label={`Edit ${metric.title} metric`}>
                        <Edit3 className="h-3.5 w-3.5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p>Edit Value</p></TooltipContent>
            </Tooltip></TooltipProvider>
          )}
           {metric.type === 'calorie-tracker' && !isEditMode && (
            <>
            <TooltipProvider delayDuration={100}><Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 p-0 text-muted-foreground hover:text-primary" onClick={() => contextHandleEditMetric({
                    ...metric, 
                    id: `weight-for-calorie-tracker-${metric.id}`, 
                    title: "Update Your Weight",
                    manualInputType: 'number',
                    manualInputValue: user?.weight || 0,
                    unit: 'kg',
                    type: 'manual-input', 
                    iconName: 'Scale', 
                } as DashboardMetric)} aria-label="Update Weight">
                  <Scale className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>Update Weight</p></TooltipContent>
            </Tooltip></TooltipProvider>
            <TooltipProvider delayDuration={100}><Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 p-0 text-muted-foreground hover:text-primary" onClick={() => setIsCalorieHistoryModalOpen(true)} aria-label="View Calorie History">
                  <History className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><p>View History</p></TooltipContent>
            </Tooltip></TooltipProvider>
            <TooltipProvider delayDuration={100}><Tooltip>
                <TooltipTrigger asChild>
                  <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                      onClick={handleEditGoalForCalorieTracker}
                      aria-label="Edit Daily Calorie Goal"
                  >
                      <Target className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top"><p>Edit Goal</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
            </>
          )}
          {/* Removed BMI History button from card header */}

          {isEditMode && (
            <>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 p-0 opacity-60 hover:opacity-100 text-muted-foreground hover:text-primary">
                  <Maximize2 className="h-3.5 w-3.5"/>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-32 p-1 glassmorphic">
                {(['sm', 'md', 'lg'] as MetricSize[]).map(size => {
                   const isCalorieTracker = metric.id.startsWith('calories_intake-');
                   const isDisabled = isCalorieTracker && size !== 'lg'; 
                  return (
                    <Button
                      key={size}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs"
                      onClick={() => !isDisabled && onResize(metric.id, size)}
                      disabled={isDisabled}
                      aria-disabled={isDisabled}
                    >
                      {size.toUpperCase()}
                      {isDisabled && <span className="ml-auto text-xs text-muted-foreground/70">(N/A)</span>}
                    </Button>
                  );
                })}
              </PopoverContent>
            </Popover>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 p-0 opacity-60 hover:opacity-100 text-muted-foreground hover:text-destructive" aria-label={`Delete ${metric.title} metric`}>
                    <X className="h-3.5 w-3.5" />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="glassmorphic">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Widget?</AlertDialogTitle>
                        <AlertDialogDescription>
                        Are you sure you want to remove the &quot;{metric.title}&quot; widget? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => {}}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(metric.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="dashboard-widget-card-content">
        {renderMetricContent(metric, onUpdateMetric, handleAddMeal, handleRemoveMeal, calorieHistory, bmiHistory)}
      </CardContent>
    </Card>
  )
});
DashboardMetricCard.displayName = 'DashboardMetricCard';


const DashboardPageLogicContext = React.createContext<any>(null);
const useDashboardPageLogic = () => {
    const context = useContext(DashboardPageLogicContext);
    if (!context) throw new Error("useDashboardPageLogic must be used within DashboardPageLogicProvider");
    return context;
};


export default function DashboardPage() {
  const { user, updateUserProfile } = useAuth();
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetric[]>([]);
  const [isMetricSelectorOpen, setIsMetricSelectorOpen] = useState(false);
  const [isCustomWidgetModalOpen, setIsCustomWidgetModalOpen] = useState(false);
  const [customWidgetStep, setCustomWidgetStep] = useState(1);
  const [newCustomWidget, setNewCustomWidget] = useState<Partial<DashboardMetric>>({});
  const [metricToEdit, setMetricToEdit] = useState<DashboardMetric | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'category'>('category');
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [dailyInsightData, setDailyInsightData] = useState<DailyHealthInsightOutput | null>(null); 
  const [isInsightLoading, setIsInsightLoading] = useState(false); 
  const [dashboardLayout, setDashboardLayout] = useState<'square' | 'masonry'>(user?.preferences?.dashboardLayout || 'square');
  const [isFullChartModalOpen, setIsFullChartModalOpen] = useState(false);


  const [isBmiHistoryModalOpen, setIsBmiHistoryModalOpen] = useState(false);
  const [bmiHistory, setBmiHistory] = useState<BmiHistoryEntry[]>([]); 

  const [isCalorieHistoryModalOpen, setIsCalorieHistoryModalOpen] = useState(false);
  const [calorieHistory, setCalorieHistory] = useState<StoredCalorieLog[]>([]);

  const [isFetchingMetrics, setIsFetchingMetrics] = useState(true);
  const [isEstimatingCalories, setIsEstimatingCalories] = useState(false);
  const { visualState: sidebarVisualState, isMobile, desktopBehavior } = useSidebar();


  useEffect(() => {
    if (user?.preferences?.dashboardLayout) {
      setDashboardLayout(user.preferences.dashboardLayout);
    }
  }, [user?.preferences?.dashboardLayout]);

  const handleDashboardLayoutChange = async (newLayout: 'square' | 'masonry') => {
    setDashboardLayout(newLayout);
    if (user) {
      try {
        await updateUserProfile({ preferences: { ...user.preferences, dashboardLayout: newLayout }});
      } catch (error) {
        console.error("Error saving dashboard layout preference:", error);
        toast({ title: "Error", description: "Could not save layout preference.", variant: "destructive", iconType: "error" });
      }
    }
  };


  const populateMetricData = useCallback((metric: DashboardMetric): DashboardMetric => {
     const populated = { ...metric };

     if (populated.type === 'ai-insight') {
       if (dailyInsightData) {
            populated.aiInsightData = dailyInsightData;
            populated.value = "AI Insight Ready";
            populated.isDataAvailable = true;
       } else {
            populated.value = "Loading insight...";
            populated.isDataAvailable = false;
       }
     } else if (populated.type === 'bmi') {
        if(user?.height && user?.weight && user.height > 0) { 
            const heightM = user.height / 100;
            const bmiVal = parseFloat((user.weight / (heightM * heightM)).toFixed(1));
            populated.bmiValue = bmiVal;
            if (bmiVal < 18.5) populated.bmiCategory = "Underweight";
            else if (bmiVal < 25) populated.bmiCategory = "Normal Weight";
            else if (bmiVal < 30) populated.bmiCategory = "Overweight";
            else populated.bmiCategory = "Obese";
            populated.value = `${bmiVal} (${populated.bmiCategory})`;
            populated.isDataAvailable = true;
        } else {
            populated.value = 'N/A';
            populated.isDataAvailable = false;
            populated.bmiValue = null;
            populated.bmiCategory = null;
        }
     } else if (populated.type === 'calorie-tracker') {
         const totalCaloriesToday = (populated.dailyMeals || []).reduce((sum, meal) => sum + meal.estimatedCalories, 0);
         populated.value = `${totalCaloriesToday} / ${populated.dailyCalorieGoal || (user?.dailyCalorieGoal || 2000)} kcal`;
         populated.isDataAvailable = true;
     } else if (populated.type === 'manual-input') {
        if (populated.manualInputValue === undefined || populated.manualInputValue === null || String(populated.manualInputValue).trim() === '') {
          populated.value = 'N/A';
          populated.isDataAvailable = false;
        } else {
          if (populated.manualInputType === 'hydration') populated.value = `${Number(populated.manualInputValue) || 0} cups (${((Number(populated.manualInputValue) || 0) * 236.59).toFixed(0)} mL)`;
          else if (['steps', 'sleep', 'number'].includes(populated.manualInputType || '')) populated.value = `${Number(populated.manualInputValue) || 0} ${populated.unit || ''}`;
          else populated.value = String(populated.manualInputValue) || 'N/A';
          populated.isDataAvailable = true;
        }
     } else if (populated.currentDataSource === 'document_analysis') {
        populated.isDataAvailable = false; 
        populated.value = "No data from documents";
     } else if (populated.currentDataSource === 'apple_health' || populated.currentDataSource === 'google_health') {
        populated.isDataAvailable = false;
        populated.value = `Connect ${populated.currentDataSource === 'apple_health' ? 'Apple Health' : 'Google Health'}`;
     } else {
        const hasData = !!(populated.chartData?.length || populated.listData?.length || populated.progressValue !== undefined || (String(populated.value).trim() !== '' && populated.value !== 'N/A'));
        populated.isDataAvailable = hasData;
        if(!hasData && populated.type !== 'ai-insight') populated.value = "N/A";
     }

    if (['bar-chart', 'line-chart', 'area-chart'].includes(populated.type) && !populated.chartConfig) {
        populated.chartConfig = { [populated.dataKey!]: { label: populated.title, color: `hsl(var(--primary-hsl))` } };
    }
    if (populated.type === 'radial-bar-chart' && (!populated.chartData || populated.chartData.length === 0)) {
        let radialValue = 0;
        if(populated.isDataAvailable && populated.manualInputValue !== undefined && populated.manualInputValue !== null && !isNaN(Number(populated.manualInputValue))) {
          radialValue = Number(populated.manualInputValue);
        } else if (populated.isDataAvailable && populated.value !== 'N/A' && String(populated.value).trim() !== '' && !isNaN(Number(String(populated.value).split(' ')[0]))) {
          radialValue = Number(String(populated.value).split(' ')[0]);
        }
        populated.chartData = [{ name: populated.title, [populated.dataKey!]: radialValue, fill: 'hsl(var(--primary))' }];
        populated.value = populated.isDataAvailable ? String(radialValue) : 'N/A';
    }
    return populated;
  }, [user?.height, user?.weight, user?.dailyCalorieGoal, dailyInsightData]);


  const fetchBmiHistory = useCallback(async () => {
    if (!user?.id) return;
    const bmiHistoryCol = collection(db, `users/${user.id}/bmiHistory`);
    const q = query(bmiHistoryCol, orderBy("date", "desc"), limit(30));
    try {
      const snapshot = await getDocs(q);
      const history = snapshot.docs.map(docSnap => docSnap.data() as BmiHistoryEntry);
      setBmiHistory(history);
    } catch (error) {
      console.error("Error fetching BMI history:", error);
    }
  }, [user?.id]);



  const fetchCalorieHistory = useCallback(async () => {
    if (!user?.id) return;
    const calorieLogsCol = collection(db, `users/${user.id}/calorieLogs`);
    const q = query(calorieLogsCol, orderBy("date", "desc"), limit(31)); 
    try {
      const snapshot = await getDocs(q);
      const history = snapshot.docs.map(docSnap => {
        const data = docSnap.data() as StoredCalorieLog;
        const dailyMeals = Array.isArray(data.meals) ? data.meals.map(m => ({
            ...m,
            macros: m.macros || { protein: 0, carbs: 0, fat: 0 }, 
            healthinessScore: m.healthinessScore === undefined ? null : m.healthinessScore,
            healthinessNotes: m.healthinessNotes === undefined ? null : m.healthinessNotes,
            estimationNotes: m.estimationNotes === undefined ? null : m.estimationNotes,
        })) : [];
        
        const dailyMacros = dailyMeals.reduce((acc, meal) => {
            acc.protein += meal.macros.protein;
            acc.carbs += meal.macros.carbs;
            acc.fat += meal.macros.fat;
            return acc;
        }, { protein: 0, carbs: 0, fat: 0 });

        return {
          ...data,
          date: data.date, 
          meals: dailyMeals,
          dailyProteinGrams: dailyMacros.protein,
          dailyCarbsGrams: dailyMacros.carbs,
          dailyFatGrams: dailyMacros.fat,
        };
      });
      setCalorieHistory(history);
    } catch (error) {
      console.error("Error fetching calorie history:", error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isCalorieHistoryModalOpen && user?.id) {
      fetchCalorieHistory();
    }
  }, [isCalorieHistoryModalOpen, user?.id, fetchCalorieHistory]);

  useEffect(() => {
    if (isBmiHistoryModalOpen && user?.id) {
      fetchBmiHistory();
    }
  }, [isBmiHistoryModalOpen, user?.id, fetchBmiHistory]);


  const saveCurrentDayCalorieLogToFirestore = useCallback(async () => {
    if (!user?.id) return;

    const calorieWidget = dashboardMetrics.find(m => m.id.startsWith('calories_intake-'));

    if (calorieWidget && calorieWidget.type === 'calorie-tracker') {
        const todayStr = formatISO(startOfDay(new Date()), { representation: 'date' });
        const totalCaloriesToday = (calorieWidget.dailyMeals || []).reduce((sum, meal) => sum + meal.estimatedCalories, 0);
        
        const dailyMacros = (calorieWidget.dailyMeals || []).reduce((acc, meal) => {
            acc.protein += meal.macros.protein;
            acc.carbs += meal.macros.carbs;
            acc.fat += meal.macros.fat;
            return acc;
        }, { protein: 0, carbs: 0, fat: 0 });

        const logEntry: StoredCalorieLog = {
            date: todayStr,
            totalCalories: totalCaloriesToday,
            goal: calorieWidget.dailyCalorieGoal || user.dailyCalorieGoal || 2000,
            meals: (calorieWidget.dailyMeals || []).map(m => ({
                id: m.id,
                description: m.description,
                aiSuggestedMealName: m.aiSuggestedMealName,
                estimatedCalories: m.estimatedCalories,
                macros: m.macros || { protein: 0, carbs: 0, fat: 0 }, 
                healthinessNotes: m.healthinessNotes === undefined ? null : m.healthinessNotes,
                healthinessScore: m.healthinessScore === undefined ? null : m.healthinessScore,
                estimationNotes: m.estimationNotes === undefined ? null : m.estimationNotes,
                timestamp: m.timestamp || new Date().toISOString(),
            })),
            dailyProteinGrams: dailyMacros.protein,
            dailyCarbsGrams: dailyMacros.carbs,
            dailyFatGrams: dailyMacros.fat,
        };
        try {
            const logDocRef = doc(db, `users/${user.id}/calorieLogs/${todayStr}`);
            await setDoc(logDocRef, logEntry, { merge: true });
        } catch (error) {
            console.error("Error saving calorie log to Firestore:", error);
        }
    }
  }, [user?.id, user?.dailyCalorieGoal, dashboardMetrics]);


 useEffect(() => {
    if (!user?.id) {
      setDashboardMetrics([]);
      setIsFetchingMetrics(false);
      return;
    }
    setIsFetchingMetrics(true);
    const metricsCol = collection(db, `users/${user.id}/dashboardMetrics`);
    const q = query(metricsCol, orderBy("order", "asc"));

    const unsubscribeMetrics = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        setDashboardMetrics([]); 
        setIsFetchingMetrics(false);
      } else {
        let fetchedMetrics = snapshot.docs.map((docSnap, index) => {
          const data = docSnap.data();
          const metric: DashboardMetric = {
            id: docSnap.id,
            title: data.title,
            category: data.category,
            description: data.description || undefined,
            iconName: data.iconName || null,
            dataKey: data.dataKey || 'value',
            value: data.value === undefined ? "N/A" : data.value,
            type: data.type,
            size: data.size,
            unit: data.unit === undefined ? null : data.unit,
            possibleDataSources: data.possibleDataSources,
            currentDataSource: data.currentDataSource,
            isDataAvailable: data.isDataAvailable === undefined ? false : data.isDataAvailable,
            chartData: data.chartData === undefined ? null : data.chartData,
            chartConfig: data.chartConfig === undefined ? null : data.chartConfig,
            listData: data.listData === undefined ? null : data.listData,
            progressValue: data.progressValue === undefined ? null : data.progressValue,
            manualInputValue: data.manualInputValue === undefined ? null : data.manualInputValue,
            manualInputValueLastUpdated: data.manualInputValueLastUpdated || null,
            aiInsightData: data.aiInsightData === undefined ? null : data.aiInsightData,
            bmiValue: data.bmiValue === undefined ? null : data.bmiValue,
            bmiCategory: data.bmiCategory === undefined ? null : data.bmiCategory,
            dailyMeals: (data.dailyMeals || []).map((m: any) => ({...m, macros: m.macros || {protein:0, carbs:0, fat:0}, healthinessScore: m.healthinessScore === undefined ? null : m.healthinessScore, healthinessNotes: m.healthinessNotes === undefined ? null : m.healthinessNotes, estimationNotes: m.estimationNotes === undefined ? null : m.estimationNotes})),
            dailyCalorieGoal: data.dailyCalorieGoal === undefined ? null : data.dailyCalorieGoal,
            show7DayGraph: data.show7DayGraph === undefined ? null : data.show7DayGraph,
            lastUpdated: data.lastUpdated?.toDate ? format(data.lastUpdated.toDate(), 'p, MMM d') : (data.lastUpdated || null),
            manualInputType: data.manualInputType === undefined ? undefined : data.manualInputType,
            order: data.order ?? index,
          };
          return metric;
        });

        const today = startOfDay(new Date());
        const batch = writeBatch(db);
        let batchHasWrites = false;

        fetchedMetrics = fetchedMetrics.map(metric => {
          if (metric.type === 'manual-input' && metric.manualInputType === 'hydration' && metric.manualInputValueLastUpdated) {
            const lastUpdatedDate = metric.manualInputValueLastUpdated.toDate();
            if (startOfDay(lastUpdatedDate) < today) {
              batch.update(doc(db, `users/${user.id}/dashboardMetrics/${metric.id}`), {
                manualInputValue: 0,
                manualInputValueLastUpdated: serverTimestamp()
              });
              batchHasWrites = true;
              return { ...metric, manualInputValue: 0, manualInputValueLastUpdated: Timestamp.now() };
            }
          }
          return metric;
        });

        if (batchHasWrites) {
          try {
            await batch.commit();
            // Firestore listener will update state, or we can re-fetch/manually update here
          } catch (error) {
            console.error("Error resetting hydration logs in batch:", error);
          }
        }
        
        setDashboardMetrics(fetchedMetrics.map(m => populateMetricData(m)));
      }
      setIsFetchingMetrics(false);
    }, (error) => {
      console.error("Error fetching metrics with onSnapshot:", error);
      setIsFetchingMetrics(false);
      setDashboardMetrics([]);
    });
    return () => {
      if (unsubscribeMetrics) {
        unsubscribeMetrics();
      }
    };
  }, [user?.id, populateMetricData]);


  const fetchDailyInsight = useCallback(async () => {
    if (!user?.id) { 
      setIsInsightLoading(false);
      return;
    }
    setIsInsightLoading(true);
    const todayString = new Date().toDateString();
    const insightKey = `aidoc-dashboard-dailyInsight-${user.id}-${todayString}`;

    const cachedData = typeof window !== 'undefined' ? localStorage.getItem(insightKey) : null;
    if (cachedData) {
        try {
            const parsed = JSON.parse(cachedData) as DailyHealthInsightOutput;
            if (parsed && parsed.healthTip && parsed.inspirationalQuote) {
                setDailyInsightData(parsed);
                setIsInsightLoading(false);
                return;
            }
        } catch(e) {
            console.warn("Failed to parse cached dashboard daily insight, fetching new.", e);
            localStorage.removeItem(insightKey);
        }
    }
    
    try {
        const newInsight = await dailyHealthInsight({ userName: user.name || 'User', healthContext: "User wants to improve general well-being." });
        setDailyInsightData(newInsight);
        if (typeof window !== 'undefined' && newInsight?.healthTip) {
            localStorage.setItem(insightKey, JSON.stringify(newInsight));
        }
    } catch (error) {
        console.error("Failed to fetch daily insight for dashboard:", error);
        const fallbackInsight = { healthTip: "Could not load tip. Focus on staying hydrated!", inspirationalQuote: "Every day is a new beginning." };
        setDailyInsightData(fallbackInsight);
    } finally {
        setIsInsightLoading(false);
    }
  }, [user?.id, user?.name]);


  useEffect(() => {
    const hasAiInsightWidget = dashboardMetrics.some(m => m.id.startsWith('ai_health_tip'));
    const aiInsightWidget = dashboardMetrics.find(m => m.id.startsWith('ai_health_tip'));

    if (hasAiInsightWidget && user && (!aiInsightWidget?.aiInsightData || (aiInsightWidget && !isInsightLoading && !dailyInsightData))) {
      fetchDailyInsight();
    } else if (!hasAiInsightWidget && dailyInsightData) {
        setDailyInsightData(null);
    }
  }, [dashboardMetrics, user, fetchDailyInsight, isInsightLoading, dailyInsightData]);

  useEffect(() => {
    if (dailyInsightData && !isInsightLoading) {
        setDashboardMetrics(prevMetrics =>
            prevMetrics.map(m =>
                m.id.startsWith('ai_health_tip-')
                ? populateMetricData({ ...m, aiInsightData: dailyInsightData, isDataAvailable: true, value: "AI Insight Ready" } as DashboardMetric)
                : m
            )
        );
    }
  }, [dailyInsightData, isInsightLoading, populateMetricData]);



  const filteredAndSortedAvailableMetrics = useMemo(() => {
    let metrics = availableMetricsData;
    if (searchTerm) {
      metrics = metrics.filter(m => m.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (selectedCategory !== 'all') {
      metrics = metrics.filter(m => m.category === selectedCategory);
    }
    switch (sortOrder) {
      case 'asc': metrics.sort((a, b) => a.title.localeCompare(b.title)); break;
      case 'desc': metrics.sort((a, b) => b.title.localeCompare(a.title)); break;
      case 'category': metrics.sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title)); break;
    }
    return metrics;
  }, [searchTerm, selectedCategory, sortOrder]);

  const handleAddMetricToDashboard = async (metricConfig: AvailableMetricConfig) => {
    if (!user?.id) return;
    const uniqueSuffix = Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const newMetricId = `${metricConfig.id}-${uniqueSuffix}`;

    const newMetricBase: Omit<DashboardMetric, 'value' | 'isDataAvailable' | 'lastUpdated'> = {
      id: newMetricId,
      title: metricConfig.title,
      category: metricConfig.category,
      description: metricConfig.description,
      iconName: metricConfig.iconName || null,
      unit: metricConfig.unit === undefined ? null : metricConfig.unit,
      type: metricConfig.defaultType,
      size: metricConfig.id === 'calories_intake' ? 'lg' : metricConfig.defaultSize || 'md',
      possibleDataSources: metricConfig.possibleDataSources,
      currentDataSource: metricConfig.defaultDataSource,
      manualInputType: metricConfig.manualInputType === undefined ? undefined : metricConfig.manualInputType,
      show7DayGraph: false,
      dataKey: metricConfig.dataKey || 'value',
      manualInputValue: (metricConfig.manualInputType === 'number' || metricConfig.manualInputType === 'hydration' || metricConfig.manualInputType === 'steps' || metricConfig.manualInputType === 'sleep') ? 0 : '',
      manualInputValueLastUpdated: metricConfig.manualInputType === 'hydration' ? serverTimestamp() : null,
      dailyCalorieGoal: metricConfig.id === 'calories_intake' ? (user?.dailyCalorieGoal || 2000) : null,
      dailyMeals: metricConfig.id === 'calories_intake' ? [] : null,
      chartConfig: metricConfig.defaultType.includes('chart') ? { [metricConfig.dataKey || 'value']: { label: metricConfig.title, color: `hsl(var(--primary-hsl))` } } : null,
      bmiValue: null,
      bmiCategory: null,
      aiInsightData: null,
      chartData: null,
      listData: null,
      progressValue: null,
      order: dashboardMetrics.length,
    };

    const populatedNewMetric = populateMetricData(newMetricBase as DashboardMetric);
    const finalNewMetric: DashboardMetric = {
        ...populatedNewMetric,
        lastUpdated: format(new Date(), 'p, MMM d'),
    };

    const firestoreMetricData: { [key: string]: any } = { ...finalNewMetric };
    delete firestoreMetricData.lastUpdated; 
    firestoreMetricData.lastUpdated = serverTimestamp(); 

    Object.keys(firestoreMetricData).forEach(key => {
      const typedKey = key as keyof DashboardMetric;
      if (firestoreMetricData[typedKey] === undefined) {
        firestoreMetricData[typedKey] = null;
      }
      if (typedKey === 'unit' && firestoreMetricData[typedKey] === undefined) {
        firestoreMetricData[typedKey] = null;
      }
      if (typedKey === 'manualInputValueLastUpdated' && metricConfig.manualInputType !== 'hydration') {
         firestoreMetricData[typedKey] = null; // Only set for hydration initially
      }
    });


    try {
        const metricDocRef = doc(db, `users/${user.id}/dashboardMetrics/${finalNewMetric.id}`);
        await setDoc(metricDocRef, firestoreMetricData);
    } catch (error) {
        console.error("Error adding metric to Firestore:", error);
    }
  };

  const handleAddCustomMetric = async () => {
    if (!user?.id || !newCustomWidget.title || !newCustomWidget.type || !newCustomWidget.currentDataSource) {
        return;
    }
    const baseMetricConfig = availableMetricsData.find(m => m.id === newCustomWidget.id?.split('-')[0]);
    const uniqueSuffix = Date.now() + '-' + Math.random().toString(36).substring(2, 7);

    const customMetricBase: Omit<DashboardMetric, 'value' | 'isDataAvailable' | 'lastUpdated'> = {
        id: `custom-${uniqueSuffix}`,
        title: newCustomWidget.title!,
        category: newCustomWidget.category || baseMetricConfig?.category || "Custom",
        description: newCustomWidget.description || baseMetricConfig?.description,
        iconName: newCustomWidget.iconName || componentToIconName(Wand2),
        type: newCustomWidget.type!,
        size: newCustomWidget.id === 'calories_intake' ? 'lg' : newCustomWidget.size || baseMetricConfig?.defaultSize || 'md',
        unit: newCustomWidget.unit === undefined ? null : newCustomWidget.unit,
        possibleDataSources: newCustomWidget.possibleDataSources || (baseMetricConfig?.possibleDataSources || ['manual']),
        currentDataSource: newCustomWidget.currentDataSource!,
        manualInputType: newCustomWidget.currentDataSource === 'manual' ? (newCustomWidget.manualInputType === undefined ? undefined : (newCustomWidget.manualInputType || baseMetricConfig?.manualInputType || 'text')) : undefined,
        dataKey: newCustomWidget.dataKey || baseMetricConfig?.dataKey || 'value',
        manualInputValue: (newCustomWidget.manualInputType === 'number' || newCustomWidget.manualInputType === 'hydration' || newCustomWidget.manualInputType === 'steps' || newCustomWidget.manualInputType === 'sleep') ? 0 : '',
        manualInputValueLastUpdated: newCustomWidget.manualInputType === 'hydration' ? serverTimestamp() : null,
        chartConfig: newCustomWidget.type?.includes('chart') ? { [newCustomWidget.dataKey || 'value']: { label: newCustomWidget.title!, color: `hsl(var(--primary-hsl))` } } : null,
        dailyCalorieGoal: null,
        dailyMeals: null,
        bmiValue: null,
        bmiCategory: null,
        aiInsightData: null,
        chartData: null,
        listData: null,
        progressValue: null,
        show7DayGraph: null,
        order: dashboardMetrics.length,
    };
    const populatedCustomMetric = populateMetricData(customMetricBase as DashboardMetric);
    const finalCustomMetric: DashboardMetric = {
        ...populatedCustomMetric,
        lastUpdated: format(new Date(), 'p, MMM d'),
    };

    const firestoreMetricData: { [key: string]: any } = { ...finalCustomMetric };
    delete firestoreMetricData.lastUpdated; 
    firestoreMetricData.lastUpdated = serverTimestamp(); 

    Object.keys(firestoreMetricData).forEach(key => {
        const typedKey = key as keyof DashboardMetric;
        if (firestoreMetricData[typedKey] === undefined) {
            firestoreMetricData[typedKey] = null;
        }
        if (typedKey === 'unit' && firestoreMetricData[typedKey] === undefined) {
            firestoreMetricData[typedKey] = null;
        }
        if (typedKey === 'manualInputValueLastUpdated' && newCustomWidget.manualInputType !== 'hydration') {
            firestoreMetricData[typedKey] = null;
        }
    });


    try {
        const metricDocRef = doc(db, `users/${user.id}/dashboardMetrics/${finalCustomMetric.id}`);
        await setDoc(metricDocRef, firestoreMetricData);
    } catch (error) {
        console.error("Error adding custom metric to Firestore:", error);
    }

    setIsCustomWidgetModalOpen(false);
    setNewCustomWidget({});
    setCustomWidgetStep(1);
  };

  const handleUpdateMetric = useCallback(async (metricId: string, data: Partial<DashboardMetric>) => {
    if (!user?.id) return;

    const firestoreCompatibleData: { [key: string]: any } = { ...data };
    firestoreCompatibleData.lastUpdated = serverTimestamp();

    Object.keys(firestoreCompatibleData).forEach(key => {
        const typedKey = key as keyof DashboardMetric;
        if (firestoreCompatibleData[typedKey] === undefined) {
            firestoreCompatibleData[typedKey] = null;
        }
         if (typedKey === 'unit' && firestoreCompatibleData[typedKey] === undefined) {
            firestoreCompatibleData[typedKey] = null;
        }
    });

    try {
        const metricDocRef = doc(db, `users/${user.id}/dashboardMetrics/${metricId}`);
        await updateDoc(metricDocRef, firestoreCompatibleData);
    } catch (error) {
        console.error("Error updating metric in Firestore:", error);
    }
  }, [user?.id]);


  const handleDeleteMetric = async (metricId: string) => {
    if (!user?.id) return;
    const metricDocRef = doc(db, `users/${user.id}/dashboardMetrics/${metricId}`);
    try {
        await deleteDoc(metricDocRef);
    } catch (error) {
        console.error("Error deleting metric from Firestore:", error);
    }
  };


  const contextHandleEditMetric = (metric: DashboardMetric) => {
    if (metric.type === 'calorie-tracker' && (metric.id.startsWith('calories_intake-'))) {
        const goalMetricToEdit: DashboardMetric = {
            ...metric,
            id: `${metric.id}-goal-edit`,
            title: "Daily Calorie Goal",
            manualInputType: 'number',
            manualInputValue: metric.dailyCalorieGoal || user?.dailyCalorieGoal || 2000,
            unit: 'kcal',
            type: 'manual-input',
            currentDataSource: 'manual',
            isDataAvailable: true,
            possibleDataSources: ['manual'],
            value: String(metric.dailyCalorieGoal || user?.dailyCalorieGoal || 2000),
            iconName: 'Target',
        };
        setMetricToEdit(goalMetricToEdit);
    } else if (metric.id.startsWith('weight-for-calorie-tracker-')) {
        const weightMetricToEdit: DashboardMetric = {
            ...metric,
            id: metric.id,
            title: "Update Your Weight",
            manualInputType: 'number',
            manualInputValue: user?.weight || metric.manualInputValue || 0,
            unit: 'kg',
            type: 'manual-input',
            currentDataSource: 'manual',
            isDataAvailable: true,
            possibleDataSources: ['manual'],
            iconName: 'Scale',
            value: String(user?.weight || metric.manualInputValue || 0),
        };
        setMetricToEdit(weightMetricToEdit);
    } else {
        setMetricToEdit({...metric, value: String(metric.manualInputValue || metric.value)});
    }
  };


  const handleSaveManualInput = async (metricId: string, newValue: string | number) => {
    if(!user?.id) return;

    let updatedMetricData: Partial<DashboardMetric> = { manualInputValueLastUpdated: serverTimestamp() };
    let mainMetricIdToUpdate = metricId;

    const originalMetric = dashboardMetrics.find(m => m.id === metricId || `${m.id}-goal-edit` === metricId || metricId.startsWith(`weight-for-calorie-tracker-${m.id.split('-').slice(0,-1).join('-')}`));

    if (metricId.endsWith('-goal-edit') && originalMetric && (originalMetric.id.startsWith('calories_intake-'))) {
        mainMetricIdToUpdate = originalMetric.id;
        const newGoal = Number(newValue) || 2000;
        const calorieWidget = dashboardMetrics.find(m => m.id === mainMetricIdToUpdate);
        updatedMetricData = {
            ...updatedMetricData,
            dailyCalorieGoal: newGoal,
            value: `${(calorieWidget?.dailyMeals || []).reduce((sum, meal) => sum + meal.estimatedCalories, 0)} / ${newGoal} kcal`,
        };
        if (user?.dailyCalorieGoal !== newGoal) {
            await updateUserProfile({ dailyCalorieGoal: newGoal });
        }
    } else if (metricId.startsWith('weight-for-calorie-tracker-')) {
        mainMetricIdToUpdate = metricId.replace('weight-for-calorie-tracker-', '');
        const weightToSave = Number(newValue);
        await updateUserProfile({ weight: weightToSave }); 
        setMetricToEdit(null); 
        return;
    } else {
        const metricBeingEdited = dashboardMetrics.find(m=>m.id===metricId);
        if (!metricBeingEdited) {
            console.error("Metric to edit not found for ID:", metricId);
            setMetricToEdit(null);
            return;
        }
        let displayValue = `${newValue} ${metricBeingEdited.unit || ''}`.trim();

        if (metricBeingEdited.manualInputType === 'hydration') {
            const cups = Number(newValue) || 0;
            displayValue = `${cups} cups (${(cups * 236.59).toFixed(0)} mL)`;
        } else if (['steps', 'sleep', 'number'].includes(metricBeingEdited.manualInputType || '')) {
            displayValue = `${Number(newValue) || 0} ${metricBeingEdited.unit || ''}`;
        } else if (metricBeingEdited.manualInputType === 'text') {
            displayValue = String(newValue);
        }
        updatedMetricData = { ...updatedMetricData, manualInputValue: newValue, value: displayValue, isDataAvailable: true };

        if (metricBeingEdited.type === 'radial-bar-chart' && metricBeingEdited.dataKey) {
            updatedMetricData.chartData = [{ name: metricBeingEdited.title, [metricBeingEdited.dataKey]: Number(newValue) || 0, fill: metricBeingEdited.chartData?.[0]?.fill || 'hsl(var(--primary))' }];
        }
        if (metricBeingEdited.id.startsWith('weight-') && !metricId.startsWith('weight-for-calorie-tracker-')) {
             await updateUserProfile({ weight: Number(newValue) }); 
        }
    }

    await handleUpdateMetric(mainMetricIdToUpdate, updatedMetricData);
    setMetricToEdit(null);
  };

  const saveBmiReadingToFirestore = useCallback(async (bmiValue: number) => {
    if (!user?.id || isNaN(bmiValue)) return;
    try {
      const bmiHistoryCol = collection(db, `users/${user.id}/bmiHistory`);
      const todayDateId = formatISO(startOfDay(new Date()), { representation: 'date' });
      const newBmiEntryRef = doc(bmiHistoryCol, todayDateId); 
      await setDoc(newBmiEntryRef, {
        date: new Date().toISOString(), 
        bmi: bmiValue,
      }, { merge: true }); 
      fetchBmiHistory(); 
    } catch (error) {
      console.error("Error saving BMI to Firestore:", error);
    }
  }, [user?.id, fetchBmiHistory]);

  const handleDataSourceChange = async (id: string, newSource: DataSource) => {
    if(!user?.id) return;
    const metric = dashboardMetrics.find(m => m.id === id);
    if (!metric) return;

    const updatedMetricPartial: Partial<DashboardMetric> = { currentDataSource: newSource, manualInputValue: null };
    const tempFullMetric = { ...metric, ...updatedMetricPartial };
    const populatedFullMetric = populateMetricData(tempFullMetric);

    const dataToSave: Partial<DashboardMetric> = {
        currentDataSource: populatedFullMetric.currentDataSource,
        value: populatedFullMetric.value,
        isDataAvailable: populatedFullMetric.isDataAvailable,
        manualInputValue: populatedFullMetric.manualInputValue,
        manualInputValueLastUpdated: populatedFullMetric.manualInputType === 'hydration' ? serverTimestamp() : null
    };

    const firestoreDataToSave : {[key: string]: any} = {...dataToSave, lastUpdated: serverTimestamp()};
    Object.keys(firestoreDataToSave).forEach(key => {
      const typedKey = key as keyof DashboardMetric;
      if (firestoreDataToSave[typedKey] === undefined) {
        firestoreDataToSave[typedKey] = null;
      }
    });

    try {
        const metricDocRef = doc(db, `users/${user.id}/dashboardMetrics/${id}`);
        await updateDoc(metricDocRef, firestoreDataToSave);
    } catch (error) {
        console.error("Error updating data source in Firestore:", error);
    }
  };


  const handleWidgetResize = async (id: string, newSize: MetricSize) => {
    if (!user?.id) return;
    const metricDocRef = doc(db, `users/${user.id}/dashboardMetrics/${id}`);
    try {
        await updateDoc(metricDocRef, { size: newSize, lastUpdated: serverTimestamp() });
    } catch (error) {
        console.error("Error updating widget size in Firestore:", error);
    }
  };

  const toggle7DayGraph = async (id: string) => {
    if (!user?.id) return;
    const metric = dashboardMetrics.find(m => m.id === id);
    if (!metric) return;
    const newShow7DayGraph = !metric.show7DayGraph;
    const metricDocRef = doc(db, `users/${user.id}/dashboardMetrics/${id}`);
    try {
        await updateDoc(metricDocRef, { show7DayGraph: newShow7DayGraph, lastUpdated: serverTimestamp() });
    } catch (error) {
        console.error("Error toggling 7-day graph in Firestore:", error);
    }
  };

  const getMetricStyling = useCallback((metric: DashboardMetric): MetricStyling => {
    let status: 'bad' | 'warning' | 'good' | 'neutral' = 'neutral';
    let numericValue = NaN;
    let iconClassBase = "text-primary";

    if (metric.isDataAvailable) {
        const valToParse = metric.manualInputValue !== undefined && metric.manualInputValue !== null && String(metric.manualInputValue).trim() !== '' && metric.type !== 'calorie-tracker' && metric.type !== 'bmi'
                           ? metric.manualInputValue
                           : (metric.type === 'bmi' ? metric.bmiValue : String(metric.value).split(' ')[0]);

        if (typeof valToParse === 'number') numericValue = valToParse;
        else if (typeof valToParse === 'string' && !isNaN(parseFloat(valToParse))) numericValue = parseFloat(valToParse);
    }

    if (metric.manualInputType === 'hydration' && !isNaN(numericValue)) {
        if (numericValue < 3) status = 'bad'; else if (numericValue < 6) status = 'warning'; else status = 'good';
    } else if (metric.manualInputType === 'steps' && !isNaN(numericValue)) {
        if (numericValue < 2000) status = 'bad'; else if (numericValue < 5000) status = 'warning'; else status = 'good';
    } else if (metric.manualInputType === 'sleep' && !isNaN(numericValue)) {
        if (numericValue < 6) status = 'bad'; else if (numericValue < 7) status = 'warning'; else if (numericValue <= 9) status = 'good'; else status = 'warning';
    } else if (metric.id.startsWith('hr-') && metric.isDataAvailable && !isNaN(numericValue)) {
        if (numericValue < 50 || numericValue > 100) status = 'bad';
        else if (numericValue < 60 || numericValue > 90) status = 'warning';
        else status = 'good';
    } else if (metric.id.startsWith('o2_sat-') && metric.isDataAvailable && !isNaN(numericValue)) {
        if (numericValue < 90) status = 'bad';
        else if (numericValue < 94) status = 'warning';
        else status = 'good';
    } else if (metric.type === 'bmi' && metric.bmiValue) {
        if (metric.bmiValue < 18.5 || metric.bmiValue >= 30) status = 'bad';
        else if (metric.bmiValue >= 25 && metric.bmiValue < 30) status = 'warning';
        else if (metric.bmiValue >=18.5 && metric.bmiValue < 25) status = 'good';
    }


    switch (status) {
        case 'bad': return { textClass: 'text-destructive', iconClass: 'text-destructive', statusIconName: 'AlertTriangle', statusIconClass: 'text-destructive' };
        case 'warning': return { textClass: 'text-orange-500 dark:text-orange-400', iconClass: 'text-orange-500 dark:text-orange-400', statusIconName: 'AlertTriangle', statusIconClass: 'text-orange-500 dark:text-orange-400' };
        case 'good': return { textClass: 'text-green-600 dark:text-green-400', iconClass: 'text-green-600 dark:text-green-400', statusIconName: 'CheckCircle2', statusIconClass: 'text-green-600 dark:text-green-400' };
        default: return { textClass: 'text-foreground', iconClass: iconClassBase };
    }
  }, []);


  const handleAddMeal = useCallback(async (metricId: string, mealDescription: string) => {
    if (!mealDescription.trim() || !user?.id) return; 
    setIsEstimatingCalories(true);
    try {
      const calorieWidget = dashboardMetrics.find(m=>m.id === metricId);
      const userContext = `User's daily calorie goal: ${calorieWidget?.dailyCalorieGoal || user?.dailyCalorieGoal || 2000} kcal. User's current weight: ${user?.weight || 'unknown'} kg. User's current age: ${user?.age || 'unknown'}. User's current gender: ${user?.gender || 'unknown'}`;

      const result = await estimateMealCalories({ mealDescription, userContext });

      const newMeal: CalorieMealEntry = {
        id: `meal-${Date.now()}-${Math.random().toString(36).substring(2,7)}`,
        description: mealDescription,
        aiSuggestedMealName: result.aiSuggestedMealName,
        estimatedCalories: result.estimatedCalories,
        macros: result.macros || { protein: 0, carbs: 0, fat: 0 },
        healthinessNotes: result.healthinessNotes ?? null,
        healthinessScore: result.healthinessScore === undefined ? null : result.healthinessScore,
        estimationNotes: result.estimationNotes ?? null,
        timestamp: new Date().toISOString(),
      };

      const currentWidget = dashboardMetrics.find(m => m.id === metricId);
      if (currentWidget && currentWidget.type === 'calorie-tracker') {
        const updatedMeals = [...(currentWidget.dailyMeals || []), newMeal];
        const totalCalories = updatedMeals.reduce((sum, meal) => sum + meal.estimatedCalories, 0);
        const updatedWidgetData: Partial<DashboardMetric> = {
            dailyMeals: updatedMeals,
            value: `${totalCalories} / ${currentWidget.dailyCalorieGoal || (user?.dailyCalorieGoal || 2000)} kcal`,
            isDataAvailable: true,
        };
        await handleUpdateMetric(metricId, updatedWidgetData);
        await saveCurrentDayCalorieLogToFirestore(); 
      }

      let toastIcon: ToastVariantIcon = 'info';
      let toastTitle = result.aiSuggestedMealName;
      let toastDescription = result.healthinessNotes || result.estimationNotes || `Logged ${result.estimatedCalories} kcal.`;
      let toastVariant: "default" | "destructive" = "default";

      if (result.healthinessScore) {
          if (result.healthinessScore >= 4) toastIcon = 'success';
          else if (result.healthinessScore === 3) toastIcon = 'info';
          else if (result.healthinessScore <= 2) {
            toastIcon = 'warning';
            if (result.healthinessScore === 1) toastVariant = 'destructive';
          }
      }
      toast({
        title: toastTitle,
        description: toastDescription,
        iconType: toastIcon,
        variant: toastVariant,
        duration: 7000,
      });

    } catch (error) {
      console.error("Error estimating meal calories:", error);
       toast({
        title: "Error Estimating Meal",
        description: "Could not estimate meal calories. Please try again.",
        iconType: "error",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
        setIsEstimatingCalories(false);
    }
  }, [user?.id, user?.dailyCalorieGoal, user?.weight, user?.age, user?.gender, dashboardMetrics, handleUpdateMetric, saveCurrentDayCalorieLogToFirestore, toast]);

  const handleRemoveMeal = useCallback(async (metricId: string, mealId: string) => {
     const currentWidget = dashboardMetrics.find(m => m.id === metricId);
      if (currentWidget && currentWidget.type === 'calorie-tracker') {
          const updatedMeals = (currentWidget.dailyMeals || []).filter(meal => meal.id !== mealId);
          const totalCalories = updatedMeals.reduce((sum, meal) => sum + meal.estimatedCalories, 0);
          const updatedWidgetData: Partial<DashboardMetric> = {
              dailyMeals: updatedMeals,
              value: `${totalCalories} / ${currentWidget.dailyCalorieGoal || (user?.dailyCalorieGoal || 2000)} kcal`,
          };
          await handleUpdateMetric(metricId, updatedWidgetData);
          await saveCurrentDayCalorieLogToFirestore(); 
      }
  }, [user?.dailyCalorieGoal, dashboardMetrics, handleUpdateMetric, saveCurrentDayCalorieLogToFirestore]);

 useEffect(() => {
    if (user?.height && user?.weight && user.id) {
      const heightM = user.height / 100;
      const newBmi = parseFloat((user.weight / (heightM * heightM)).toFixed(1));
  
      setDashboardMetrics(prevMetrics => {
        const updatedMetrics = prevMetrics.map(m => {
          if (m.id.startsWith('bmi-')) {
            const currentBmiMetric = m;
            const populatedBmiMetric = populateMetricData({ ...currentBmiMetric, bmiValue: newBmi });
  
            if (populatedBmiMetric.bmiValue !== currentBmiMetric.bmiValue ||
                populatedBmiMetric.bmiCategory !== currentBmiMetric.bmiCategory ||
                !currentBmiMetric.isDataAvailable) {
              
              const firestoreUpdateData: Partial<DashboardMetric> = {
                bmiValue: populatedBmiMetric.bmiValue,
                bmiCategory: populatedBmiMetric.bmiCategory,
                value: populatedBmiMetric.value,
                isDataAvailable: true,
              };
              
              const sanitizedFirestoreUpdateData: { [key: string]: any } = {};
              Object.keys(firestoreUpdateData).forEach(key => {
                  const typedKey = key as keyof typeof firestoreUpdateData;
                  if (firestoreUpdateData[typedKey] === undefined) {
                      sanitizedFirestoreUpdateData[typedKey] = null;
                  } else {
                      sanitizedFirestoreUpdateData[typedKey] = firestoreUpdateData[typedKey];
                  }
              });
              handleUpdateMetric(currentBmiMetric.id, sanitizedFirestoreUpdateData);
              return populatedBmiMetric;
            }
            return currentBmiMetric; 
          }
          return m;
        });
        return updatedMetrics;
      });
      saveBmiReadingToFirestore(newBmi); 
    }
  }, [user?.height, user?.weight, user?.id, saveBmiReadingToFirestore, populateMetricData, handleUpdateMetric]);


  const renderMetricContent = (metric: DashboardMetric, onUpdateMetricProp: typeof handleUpdateMetric, onAddMealProp?: typeof handleAddMeal, onRemoveMealProp?: typeof handleRemoveMeal, calorieHistoryData?: StoredCalorieLog[], bmiHistoryData?: BmiHistoryEntry[]) => {
    const styling = getMetricStyling(metric);

    if (!metric.isDataAvailable && metric.currentDataSource !== 'manual' && metric.type !== 'manual-input' && metric.type !== 'bmi' && metric.type !== 'calorie-tracker' && metric.type !== 'ai-insight') {
        const sourceText = metric.currentDataSource.replace('_', ' ');
        let actionButton = null;
        if (metric.currentDataSource === 'apple_health' || metric.currentDataSource === 'google_health') {
            actionButton = <Button variant="outline" size="sm" className="text-xs h-8 glassmorphic hover:bg-primary/10 mt-2" disabled>Connect to {sourceText}</Button>;
        }

        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-3 space-y-2 glassmorphic-content">
                <DatabaseZap className="h-10 w-10 text-muted-foreground/70 mb-1.5" />
                <p className="text-xs font-medium text-muted-foreground">Data from {sourceText} unavailable.</p>
                {actionButton}
                {(metric.possibleDataSources.includes('manual') && metric.type !== 'ai-insight') && (
                     <Button variant="link" size="sm" className="text-xs h-7 text-primary/80 hover:text-primary" onClick={() => handleDataSourceChange(metric.id, 'manual')}>
                        Or Enter Manually
                    </Button>
                )}
                 {metric.currentDataSource === 'document_analysis' && (
                    <p className="text-xs text-muted-foreground/80 mt-1">Upload documents for analysis.</p>
                )}
            </div>
        );
    }

    switch (metric.type) {
      case 'number':
        return <NumberWidget metric={metric} styling={styling} />;
      case 'bmi':
        return <BmiWidget metric={metric} styling={styling} />;
      case 'calorie-tracker':
        return <CalorieTrackerWidget
                  metric={metric}
                  user={user}
                  onAddMeal={onAddMealProp!}
                  onRemoveMeal={onRemoveMealProp!}
                  onEditMetric={contextHandleEditMetric}
                  isEstimatingCalories={isEstimatingCalories}
                  isCalorieHistoryModalOpen={isCalorieHistoryModalOpen}
                  setIsCalorieHistoryModalOpen={setIsCalorieHistoryModalOpen}
                  calorieHistory={calorieHistoryData || []}
               />;
      case 'progress':
        return <ProgressWidget metric={metric} styling={styling} />;
      case 'data-list':
        return <DataListWidget metric={metric} />;
      case 'manual-input':
        return <ManualInputWidget
                  metric={metric}
                  styling={styling}
                  onEditMetric={contextHandleEditMetric}
                  onSaveManualInput={handleSaveManualInput}
               />;
      case 'ai-insight':
        return <AiInsightWidget metric={metric} isInsightLoading={isInsightLoading} insightData={dailyInsightData} />;
      case 'radial-bar-chart':
        return <RadialBarChartWidget metric={metric} styling={styling} />;
      case 'bar-chart': case 'line-chart': case 'area-chart':
        return <ChartWidget metric={metric} />;
      default:
        return <div className={cn("text-2xl font-bold p-3", styling.textClass)}>{String(metric.value)}</div>;
    }
  };

  const masonryColumnClasses = useMemo(() => {
    if (isMobile) return "columns-1"; 
    if (sidebarVisualState === 'expanded' && desktopBehavior === 'open') {
      return "sm:columns-1 md:columns-2 lg:columns-3 xl:columns-3";
    }
    return "sm:columns-2 md:columns-3 lg:columns-4 xl:columns-4";
  }, [isMobile, sidebarVisualState, desktopBehavior]);


  const logic = { getMetricStyling, renderMetricContent, toggle7DayGraph, isEditMode, handleUpdateMetric, handleAddMeal, handleRemoveMeal, contextHandleEditMetric, setIsCalorieHistoryModalOpen, calorieHistory, setIsBmiHistoryModalOpen, bmiHistory };


  return (
    <DashboardPageLogicContext.Provider value={logic}>
    <div className="space-y-6 animate-fade-in overflow-x-hidden p-4 md:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">Hello, {user?.name || 'User'}!</h1>
            <p className="text-xs text-muted-foreground mt-1 max-w-md">
                Note: Some metrics require manual input. Google/Apple Health Coming Soon.
            </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setIsMetricSelectorOpen(true)} className="transition-all hover:shadow-md bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Metric
          </Button>
           <Button onClick={() => setIsFullChartModalOpen(true)} variant="outline" className="transition-all hover:shadow-md glassmorphic">
            <MedicalChartIcon className="mr-2 h-4 w-4" /> Med Chart
          </Button>
          <Dialog open={isMetricSelectorOpen} onOpenChange={setIsMetricSelectorOpen}>
            <DialogTrigger asChild>
               <button className="hidden"></button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-3xl h-[80vh] flex flex-col glassmorphic">
              <DialogHeader> <DialogTitle>Select Metrics to Add</DialogTitle> <DialogDescription> Choose metrics for your dashboard. </DialogDescription> </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-1 mb-4 border-b pb-4">
                <Input placeholder="Search metrics..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="md:col-span-1 glassmorphic" prependIcon={Search} />
                <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value)}>
                  <SelectTrigger className="w-full glassmorphic"><ListFilter className="h-4 w-4 mr-2 opacity-70" /> <SelectValue placeholder="Filter by category" /></SelectTrigger>
                  <SelectContent> <SelectItem value="all">All Categories</SelectItem> {metricCategories.map(category => ( <SelectItem key={category} value={category}>{category}</SelectItem> ))} </SelectContent>
                </Select>
                <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as any)}>
                  <SelectTrigger className="w-full glassmorphic"><ListFilter className="h-4 w-4 mr-2 opacity-70"/> <SelectValue placeholder="Sort by" /></SelectTrigger>
                  <SelectContent> <SelectItem value="category">Sort by Category</SelectItem> <SelectItem value="asc">Sort A-Z</SelectItem> <SelectItem value="desc">Sort Z-A</SelectItem> </SelectContent>
                </Select>
              </div>
              <ScrollArea className="flex-1 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-1">
                  {filteredAndSortedAvailableMetrics.map((metricConfig) => {
                    const IconComp = iconNameToComponent(metricConfig.iconName);
                    return (
                    <Card key={metricConfig.id} className="flex flex-col glassmorphic hover:shadow-xl transition-shadow duration-200">
                      <CardHeader> <div className="flex items-center justify-between"> <CardTitle className="text-md">{metricConfig.title}</CardTitle> {IconComp && <IconComp className="h-5 w-5 text-muted-foreground" />} </div> <CardDescription className="text-xs h-10 overflow-hidden">{metricConfig.description}</CardDescription> </CardHeader>
                      <CardContent className="flex-grow text-xs text-muted-foreground space-y-0.5"> <p>Category: {metricConfig.category}</p> <p>Type: {metricConfig.defaultType}</p> {metricConfig.defaultUnit && <p>Unit: {metricConfig.defaultUnit}</p>} <p className="capitalize">Source: {metricConfig.defaultDataSource.replace('_', ' ')}</p> </CardContent>
                      <CardFooter className="p-4 border-t"> <Button size="sm" onClick={() => handleAddMetricToDashboard(metricConfig)} disabled={dashboardMetrics.some(dm => dm.id.startsWith(metricConfig.id))} className="w-full"> <PlusCircle className="mr-2 h-4 w-4" /> {dashboardMetrics.some(dm => dm.id.startsWith(metricConfig.id)) ? "Added" : "Add to Dashboard"} </Button> </CardFooter>
                    </Card>
                  )})}
                </div>
              </ScrollArea>
              <DialogModalFooter className="mt-4 p-1 border-t pt-4 flex justify-between">
                  <Button variant="outline" onClick={() => { setIsMetricSelectorOpen(false); setIsCustomWidgetModalOpen(true); }} className="glassmorphic">
                    <Wand2 className="mr-2 h-4 w-4"/>Create Custom Widget
                  </Button>
                  <Button variant="outline" onClick={() => setIsMetricSelectorOpen(false)}>Close</Button>
              </DialogModalFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isCustomWidgetModalOpen} onOpenChange={(isOpen) => { if (!isOpen) { setIsCustomWidgetModalOpen(false); setNewCustomWidget({}); setCustomWidgetStep(1);}}}>
            <DialogContent className="sm:max-w-lg glassmorphic">
                <DialogHeader>
                    <DialogTitle>Create Custom Widget ({customWidgetStep}/3)</DialogTitle>
                    <DialogDescription>Personalize your dashboard with a new widget.</DialogDescription>
                    <Progress value={(customWidgetStep/3)*100} className="mt-2 h-1.5"/>
                </DialogHeader>
                <div className="py-4 space-y-4">
                     <CustomWidgetFormContent
                        step={customWidgetStep}
                        newCustomWidget={newCustomWidget}
                        setNewCustomWidget={setNewCustomWidget}
                        availableMetricsData={availableMetricsData}
                        displayTypesForCustomWidget={displayTypesForCustomWidget.map(dt => ({...dt, icon: iconNameToComponent(dt.iconName)!}))}
                        dataSourcesForCustomWidget={dataSourcesForCustomWidget.map(ds => {
                            let IconComp: React.ElementType = HelpCircle;
                            if (ds.iconName === 'Apple') IconComp = Apple;
                            else if (ds.iconName === 'Google') IconComp = Google;
                            else IconComp = iconNameToComponent(ds.iconName) || HelpCircle;
                            return {...ds, icon: IconComp };
                        })}
                     />
               </div>
                <DialogModalFooter className="flex justify-between">
                    <Button variant="outline" onClick={() => setCustomWidgetStep(s => Math.max(1,s-1))} disabled={customWidgetStep === 1}>Previous</Button>
                    {customWidgetStep < 3 && <Button onClick={() => setCustomWidgetStep(s => s+1)}>Next</Button>}
                    {customWidgetStep === 3 && <Button onClick={handleAddCustomMetric} className="bg-primary hover:bg-primary/90">Create Widget</Button>}
                </DialogModalFooter>
            </DialogContent>
          </Dialog>

          <Button variant={isEditMode ? "secondary" : "outline"} size="icon" onClick={() => setIsEditMode(!isEditMode)} className="transition-all hover:shadow-md glassmorphic" title={isEditMode ? "Done Editing" : "Edit Widgets"}>
            {isEditMode ? <Save className="h-5 w-5 text-green-500"/> : <Edit className="h-5 w-5" />}
          </Button>
          <Button variant="outline" size="icon" onClick={() => handleDashboardLayoutChange(dashboardLayout === 'square' ? 'masonry' : 'square')} className="transition-all hover:shadow-md glassmorphic" title={`Switch to ${dashboardLayout === 'square' ? 'Masonry' : 'Square'} Layout`}>
            {dashboardLayout === 'square' ? <LayoutGrid className="h-5 w-5" /> : <Columns className="h-5 w-5" />}
          </Button>
          <Button variant="outline" size="icon" disabled className="transition-all hover:shadow-md glassmorphic opacity-50 cursor-not-allowed" title="Auto Arrange (Coming Soon)">
             <Shuffle className="h-5 w-5"/>
          </Button>
        </div>
      </div>


      {isFetchingMetrics && (
         <div className="text-center text-muted-foreground py-12 animate-fade-in">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <p className="mt-2">Loading your dashboard...</p>
        </div>
      )}

      {!isFetchingMetrics && dashboardMetrics.length === 0 && (
         <div className="text-center text-muted-foreground py-12 animate-fade-in">
            <BarChart3 className="mx-auto h-16 w-16 mb-4 text-primary/50" />
            <p className="text-xl mb-2">Your dashboard is empty.</p>
            <p>Click "Add Metric" to get started and personalize your health overview!</p>
        </div>
      )}


      {!isFetchingMetrics && dashboardMetrics.length > 0 && (
        <div className={cn(
            `transition-all duration-300 w-full`, 
            dashboardLayout === 'square' ? 'dashboard-grid-square gap-4' : cn('dashboard-grid-masonry gap-4', masonryColumnClasses),
            dashboardLayout === 'masonry' && "overflow-x-hidden"
          )}>
          {dashboardMetrics.map((metric) => (
            <DashboardMetricCard
              key={metric.id}
              metric={metric}
              onDelete={() => handleDeleteMetric(metric.id)}
              onResize={handleWidgetResize}
              onEdit={contextHandleEditMetric}
              onUpdateMetric={handleUpdateMetric}
            />
          ))}
        </div>
      )}

      {metricToEdit && (
        <ManualEditModal
          isOpen={!!metricToEdit}
          onClose={() => setMetricToEdit(null)}
          metric={metricToEdit}
          onSave={handleSaveManualInput}
        />
      )}
       <Dialog open={isFullChartModalOpen} onOpenChange={setIsFullChartModalOpen}>
            <DialogContent className="sm:max-w-3xl md:max-w-4xl lg:max-w-5xl glassmorphic h-[90vh] flex flex-col">
                 <DialogHeader>
                    <DialogTitle>Full Medical Chart</DialogTitle>
                    <DialogDescription>Comprehensive overview of your health information.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="flex-grow p-1 pr-3 custom-scrollbar">
                   <FullMedicalChart user={user} />
                </ScrollArea>
                <DialogModalFooter className="mt-auto">
                    <Button variant="outline" onClick={() => setIsFullChartModalOpen(false)}>Close</Button>
                    <Button onClick={() => alert("PDF Download feature coming soon!")}><Download className="mr-2 h-4 w-4"/>Download Chart</Button>
                </DialogModalFooter>
            </DialogContent>
        </Dialog>
    </div>
    </DashboardPageLogicContext.Provider>
  );
}
