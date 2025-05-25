
"use client";

import React from 'react';
import { ChartContainer } from '@/components/ui/chart';
import { RadialBarChart as RechartsRadialBarChart, PolarAngleAxis, RadialBar } from 'recharts';
import { cn } from '@/lib/utils';
import type { DashboardMetric, MetricStyling } from '../../page'; // Adjust path

interface RadialBarChartWidgetProps {
  metric: DashboardMetric;
  styling: MetricStyling;
}

const RadialBarChartWidget: React.FC<RadialBarChartWidgetProps> = ({ metric, styling }) => {
  if (!metric.isDataAvailable && metric.currentDataSource !== 'manual') {
    return <div className="text-muted-foreground text-center py-4 text-xs">Connect data source or input manually.</div>;
  }
  
  const dataKey = metric.dataKey || 'value';
  const chartData = metric.chartData && metric.chartData.length > 0 
    ? metric.chartData 
    : [{ name: metric.title, [dataKey]: 0, fill: 'hsl(var(--primary))' }];
  
  const radialValue = metric.isDataAvailable ? (chartData[0]?.[dataKey] ?? 0) : 0;
  const radialFillColor = styling.iconClass?.includes('green') || styling.iconClass?.includes('primary') ? 'hsl(var(--primary))' : 
                         styling.iconClass?.includes('orange') ? 'hsl(var(--chart-4))' : 
                         styling.iconClass?.includes('destructive') ? 'hsl(var(--chart-1))' : 
                         'hsl(var(--primary))'; 

  return (
    <div className="h-full w-full flex items-center justify-center p-2">
      <ChartContainer 
        config={metric.chartConfig || { [dataKey]: { label: metric.title, color: radialFillColor }}} 
        className="h-full max-h-[150px] w-full max-w-[150px]"
      >
        <RechartsRadialBarChart data={chartData} innerRadius="60%" outerRadius="100%" startAngle={90} endAngle={-270} barSize={14}>
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar background dataKey={dataKey} cornerRadius={10} fill={radialFillColor} className="opacity-90" />
          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className={cn("fill-foreground text-xl lg:text-2xl font-bold tabular-nums tracking-tight", styling.textClass)}>
            {`${radialValue}${metric.unit || '%'}`}
          </text>
        </RechartsRadialBarChart>
      </ChartContainer>
    </div>
  );
};

export default RadialBarChartWidget;
