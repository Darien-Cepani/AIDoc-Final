
"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import type { DashboardMetric, MetricStyling } from '../../page'; 
import { Button } from "@/components/ui/button";
// Removed Dialog imports as modal is being removed

// Removed BmiHistoryEntry and BmiHistoryModal component definitions

interface BmiWidgetProps {
  metric: DashboardMetric;
  styling: MetricStyling;
  // Removed props related to BMI history modal
}

const BmiWidget: React.FC<BmiWidgetProps> = ({ metric, styling }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-3">
      <span className={cn("text-4xl lg:text-5xl font-bold tabular-nums tracking-tight", styling.textClass)}>
        {metric.bmiValue?.toFixed(1) || 'N/A'}
      </span>
      <span className={cn("text-sm font-medium mt-1", styling.textClass)}>
        {metric.bmiCategory || (metric.isDataAvailable ? "Calculating..." : "Enter height/weight in profile")}
      </span>
      {/* Removed View History button */}
    </div>
    // Removed BmiHistoryModal instance
  );
};

export default BmiWidget;
