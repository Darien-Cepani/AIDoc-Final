
"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';
import { Minus, Plus, Edit3 } from "lucide-react";
import type { DashboardMetric, MetricStyling } from '../../page'; // Adjust path

interface ManualInputWidgetProps {
  metric: DashboardMetric;
  styling: MetricStyling;
  onEditMetric: (metric: DashboardMetric) => void;
  onSaveManualInput: (metricId: string, newValue: string | number) => void;
}

const ManualInputWidget: React.FC<ManualInputWidgetProps> = ({ metric, styling, onEditMetric, onSaveManualInput }) => {
  if (!metric.isDataAvailable && metric.manualInputValue === undefined) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-3 space-y-2">
        <Edit3 className="h-10 w-10 text-muted-foreground/70 mb-1.5" />
        <p className="text-xs font-medium text-muted-foreground">No data entered.</p>
        <Button variant="outline" size="sm" className="text-xs h-8 glassmorphic hover:bg-primary/10 mt-2" onClick={() => onEditMetric(metric)}>
          Enter Data
        </Button>
      </div>
    );
  }

  const displayValue = metric.manualInputType === 'hydration'
    ? `${Number(metric.manualInputValue) || 0} cups (${((Number(metric.manualInputValue) || 0) * 236.59).toFixed(0)} mL)`
    : `${metric.manualInputValue || (metric.manualInputType === 'number' || metric.manualInputType === 'steps' || metric.manualInputType === 'sleep' ? '0' : 'N/A')} ${metric.unit || ''}`.trim();

  if (metric.manualInputType === 'hydration') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-3">
        <div className="flex items-center gap-3 justify-center">
          <Button variant="outline" size="icon" onClick={() => onSaveManualInput(metric.id, Math.max(0, (Number(metric.manualInputValue) || 0) - 1))} className="h-10 w-10 rounded-full glassmorphic hover:bg-primary/10"><Minus className="h-5 w-5"/></Button>
          <div className="flex flex-col items-center w-20">
            <span className={cn("text-3xl font-bold tabular-nums", styling.textClass)}>{Number(metric.manualInputValue) || 0}</span>
            <span className="text-xs text-muted-foreground -mt-1">cups</span>
          </div>
          <Button variant="outline" size="icon" onClick={() => onSaveManualInput(metric.id, (Number(metric.manualInputValue) || 0) + 1)} className="h-10 w-10 rounded-full glassmorphic hover:bg-primary/10"><Plus className="h-5 w-5"/></Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{displayValue.split('(')[1]?.replace(')','')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-3">
      <span className={cn("text-3xl lg:text-4xl font-bold tabular-nums tracking-tight", styling.textClass)}>
        {displayValue}
      </span>
    </div>
  );
};

export default ManualInputWidget;
