
"use client";

import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
    Activity, BarChart3, Brain, Lightbulb, Moon, Pill, Thermometer, TrendingUp, Droplet, Wand2, PlusCircle, Edit3, Sparkles, EyeOff, HelpCircle, Type, LineChart, AreaChart, ListChecks, ActivitySquare, LayoutGrid, DatabaseZap
} from "lucide-react";
import { cn } from '@/lib/utils';

type MetricSize = 'sm' | 'md' | 'lg';
type DataSource = 'apple_health' | 'google_health' | 'document_analysis' | 'manual' | 'ai_generated';
type ManualInputType = 'number' | 'text' | 'hydration' | 'steps' | 'sleep' | undefined;

interface AvailableMetricConfig {
    id: string;
    title: string;
    category: string;
    description?: string;
    icon?: React.ElementType;
    dataKey?: string;
    defaultType: 'number' | 'bar-chart' | 'line-chart' | 'area-chart' | 'data-list' | 'progress' | 'manual-input' | 'radial-bar-chart' | 'ai-insight';
    defaultUnit?: string;
    defaultSize: MetricSize;
    possibleDataSources: DataSource[];
    defaultDataSource: DataSource;
    manualInputType?: ManualInputType;
}

interface DashboardMetric {
  id: string;
  title: string;
  category: string;
  description?: string;
  icon?: React.ElementType;
  value: string | number;
  type: 'number' | 'bar-chart' | 'line-chart' | 'area-chart' | 'data-list' | 'progress' | 'manual-input' | 'radial-bar-chart' | 'ai-insight';
  size: MetricSize;
  unit?: string;
  possibleDataSources: DataSource[];
  currentDataSource: DataSource;
  isDataAvailable: boolean;
  chartData?: any[];
  chartConfig?: any; // Replace any with actual ChartConfig type if possible
  listData?: Array<{label: string, value: string | number, icon?: React.ElementType}> | string[];
  progressValue?: number;
  manualInputValue?: string | number;
  aiInsightData?: any; // Replace any with actual DailyHealthInsightOutput type
  manualInputType?: ManualInputType;
  lastUpdated?: string;
  show7DayGraph?: boolean;
  dataKey?: string;
}

interface CustomWidgetFormContentProps {
    step: number;
    newCustomWidget: Partial<DashboardMetric>;
    setNewCustomWidget: React.Dispatch<React.SetStateAction<Partial<DashboardMetric>>>;
    availableMetricsData: AvailableMetricConfig[];
    displayTypesForCustomWidget: { value: DashboardMetric['type'], label: string, icon: React.ElementType }[];
    dataSourcesForCustomWidget: { value: DataSource, label: string, icon: React.ElementType }[];
}

// Define Apple Icon (inline SVG if not available in lucide-react)
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

const iconOptions = [Activity, BarChart3, Brain, Lightbulb, Moon, Pill, Thermometer, TrendingUp, Droplet, Wand2, PlusCircle, Edit3, Sparkles, EyeOff, HelpCircle, LayoutGrid, DatabaseZap, Type, LineChart, AreaChart, ListChecks, ActivitySquare];

const CustomWidgetFormContent: React.FC<CustomWidgetFormContentProps> = ({ 
    step, newCustomWidget, setNewCustomWidget, availableMetricsData, displayTypesForCustomWidget, dataSourcesForCustomWidget 
}) => {
    switch (step) {
        case 1:
            return (
                <div className="space-y-3 animate-fade-in-fast">
                    <Label htmlFor="custom-widget-name">Widget Name</Label>
                    <Input id="custom-widget-name" placeholder="e.g., Morning Mood Tracker" value={newCustomWidget.title || ""} onChange={(e) => setNewCustomWidget(p => ({...p, title: e.target.value}))} prependIcon={Type}/>
                    <Label htmlFor="custom-widget-metric">Base Metric (Optional)</Label>
                    <Select value={newCustomWidget.id?.split('-')[0] || ""} onValueChange={(val) => {
                        const base = availableMetricsData.find(m => m.id === val);
                        setNewCustomWidget(p => ({...p, id: val, title: base?.title || p.title, category: base?.category, unit: base?.defaultUnit, icon: base?.icon, dataKey: base?.dataKey, possibleDataSources: base?.possibleDataSources }));
                    }}>
                        <SelectTrigger className="glassmorphic"><SelectValue placeholder="Select base metric type..."/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">None (Purely Custom)</SelectItem>
                            {availableMetricsData.map(m => <SelectItem key={m.id} value={m.id}>{m.title} ({m.category})</SelectItem>)}
                        </SelectContent>
                    </Select>
                     <Label htmlFor="custom-widget-icon">Icon (Optional)</Label>
                     <Select value={newCustomWidget.icon?.displayName || newCustomWidget.icon?.name || ""} onValueChange={(val) => {
                        const iconComp = iconOptions.find(i => i.displayName === val || i.name === val);
                        setNewCustomWidget(p => ({...p, icon: iconComp }));
                     }}>
                        <SelectTrigger className="glassmorphic"><SelectValue placeholder="Select an icon..."/></SelectTrigger>
                        <SelectContent><ScrollArea className="h-48">
                            {iconOptions.map(I => {
                              const iconName = I.displayName || I.name || `icon-${Math.random()}`; // Fallback for key
                              return (<SelectItem key={iconName} value={iconName}><div className="flex items-center gap-2"><I className="h-4 w-4"/> {iconName}</div></SelectItem>)
                            }
                            )}
                        </ScrollArea></SelectContent>
                     </Select>
                </div>
            );
        case 2:
            return (
                 <div className="space-y-3 animate-fade-in-fast">
                    <Label>Display Style</Label>
                    <Select value={newCustomWidget.type || ""} onValueChange={(val) => setNewCustomWidget(p => ({...p, type: val as DashboardMetric['type']}))}>
                        <SelectTrigger className="glassmorphic"><SelectValue placeholder="Select display style..."/></SelectTrigger>
                        <SelectContent>
                            {displayTypesForCustomWidget.map(dt => <SelectItem key={dt.value} value={dt.value}><div className="flex items-center gap-2"><dt.icon className="h-4 w-4"/>{dt.label}</div></SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Label>Widget Size</Label>
                    <Select value={newCustomWidget.size || "md"} onValueChange={(val) => setNewCustomWidget(p => ({...p, size: val as MetricSize}))}>
                        <SelectTrigger className="glassmorphic"><SelectValue placeholder="Select size..."/></SelectTrigger>
                        <SelectContent>
                            {(['sm', 'md', 'lg'] as MetricSize[]).map(s => <SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            );
        case 3:
            return (
                 <div className="space-y-3 animate-fade-in-fast">
                    <Label>Data Source</Label>
                     <Select value={newCustomWidget.currentDataSource || ""} onValueChange={(val) => setNewCustomWidget(p => ({...p, currentDataSource: val as DashboardMetric['currentDataSource']}))}>
                        <SelectTrigger className="glassmorphic"><SelectValue placeholder="Select data source..."/></SelectTrigger>
                        <SelectContent>
                            {dataSourcesForCustomWidget.map(ds => {
                              const IconComp = ds.icon;
                              return (<SelectItem key={ds.value} value={ds.value}><div className="flex items-center gap-2"><IconComp className="h-4 w-4"/>{ds.label}</div></SelectItem>)
                            })}
                        </SelectContent>
                    </Select>
                    {newCustomWidget.currentDataSource === 'manual' && (
                        <>
                        <Label>Manual Input Type</Label>
                        <Select value={newCustomWidget.manualInputType || "text"} onValueChange={(val) => setNewCustomWidget(p => ({...p, manualInputType: val as DashboardMetric['manualInputType']}))}>
                            <SelectTrigger className="glassmorphic"><SelectValue placeholder="Select manual input type..."/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="text">Text</SelectItem><SelectItem value="number">Number</SelectItem>
                                <SelectItem value="hydration">Hydration (Cups)</SelectItem><SelectItem value="steps">Steps</SelectItem><SelectItem value="sleep">Sleep (Hours)</SelectItem>
                            </SelectContent>
                        </Select>
                        {newCustomWidget.manualInputType === 'number' && (
                             <>
                                <Label>Unit (Optional)</Label>
                                <Input placeholder="e.g., mg/dL" value={newCustomWidget.unit || ""} onChange={(e) => setNewCustomWidget(p => ({...p, unit: e.target.value}))} prependIcon={Type}/>
                             </>
                        )}
                        </>
                    )}
                </div>
            );
        default:
            return null;
    }
};

export default CustomWidgetFormContent;
