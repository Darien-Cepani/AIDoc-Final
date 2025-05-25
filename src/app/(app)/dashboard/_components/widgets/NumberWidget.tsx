
"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import type { DashboardMetric, MetricStyling } from '../../page'; // Adjust path as needed

interface NumberWidgetProps {
  metric: DashboardMetric;
  styling: MetricStyling;
}

const NumberWidget: React.FC<NumberWidgetProps> = ({ metric, styling }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-3">
      <span className={cn("text-4xl lg:text-5xl font-bold tabular-nums tracking-tight", styling.textClass)}>
        {String(metric.value)}
      </span>
      {metric.unit && <span className="text-sm text-muted-foreground font-medium mt-1">{metric.unit}</span>}
    </div>
  );
};

export default NumberWidget;
