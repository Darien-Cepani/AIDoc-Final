
"use client";

import React from 'react';
import { Loader2, Lightbulb, Sparkles } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import type { DashboardMetric, DailyHealthInsightOutput } from '../../page'; // Adjust path

interface AiInsightWidgetProps {
  metric: DashboardMetric;
  isInsightLoading: boolean;
  insightData: DailyHealthInsightOutput | null;
}

const AiInsightWidget: React.FC<AiInsightWidgetProps> = ({ metric, isInsightLoading, insightData }) => {
  return (
    <div className="space-y-2.5 h-full flex flex-col justify-center p-4">
      {isInsightLoading && !insightData?.healthTip ? (
        <div className="flex items-center justify-center h-full"> <Loader2 className="h-6 w-6 animate-spin text-primary"/> </div>
      ) : (
        <>
          <div className="flex items-start gap-2.5">
            <Lightbulb className="h-5 w-5 text-primary mt-0.5 shrink-0"/>
            <div>
              <p className="text-sm font-semibold text-primary leading-tight mb-0.5">Health Tip</p>
              <p className="text-xs text-foreground/90 leading-snug">{insightData?.healthTip || "Loading health tip..."}</p>
            </div>
          </div>
          <Separator className="my-2.5 bg-border/60" />
          <div className="flex items-start gap-2.5">
            <Sparkles className="h-5 w-5 text-primary/80 mt-0.5 shrink-0"/>
            <div>
              <p className="text-sm font-semibold text-primary/90 leading-tight mb-0.5">Daily Quote</p>
              <p className="text-xs italic text-muted-foreground leading-snug">&ldquo;{insightData?.inspirationalQuote || "Loading quote..."}&rdquo;</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AiInsightWidget;
