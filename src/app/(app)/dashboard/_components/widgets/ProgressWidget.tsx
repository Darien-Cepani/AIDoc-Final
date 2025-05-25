
"use client";

import React from 'react';
import { Progress } from "@/components/ui/progress";
import { cn } from '@/lib/utils';
import type { DashboardMetric, MetricStyling } from '../../page'; // Adjust path
import { iconNameToComponent } from '../../page'; // Assuming iconNameToComponent is exported from page.tsx or a util

interface ProgressWidgetProps {
  metric: DashboardMetric;
  styling: MetricStyling;
}

const ProgressWidget: React.FC<ProgressWidgetProps> = ({ metric, styling }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-2 p-3">
      <div className={cn("text-3xl lg:text-4xl font-bold tabular-nums tracking-tight", styling.textClass)}>
        {metric.progressValue ?? 0}{metric.unit || '%'}
      </div>
      <Progress 
        value={metric.progressValue ?? 0} 
        className={cn(
          "w-3/4 h-3 mt-1.5", 
          styling.statusIconName && iconNameToComponent(styling.statusIconName) && styling.statusIconClass 
            ? (styling.statusIconClass.includes('green') ? '[&>div]:bg-green-500' 
              : styling.statusIconClass.includes('orange') ? '[&>div]:bg-orange-500' 
              : styling.statusIconClass.includes('destructive') ? '[&>div]:bg-destructive' 
              : '[&>div]:bg-primary') 
            : '[&>div]:bg-primary'
        )}
      />
    </div>
  );
};

export default ProgressWidget;
