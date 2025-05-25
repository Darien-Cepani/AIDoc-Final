
"use client";

import React from 'react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, Line, Area, CartesianGrid, XAxis, YAxis, BarChart as RechartsBarChart, LineChart as RechartsLineChart, AreaChart as RechartsAreaChart } from 'recharts';
import * as RechartsPrimitive from 'recharts';
import type { DashboardMetric } from '../../page'; // Adjust path

interface ChartWidgetProps {
  metric: DashboardMetric;
}

const ChartWidget: React.FC<ChartWidgetProps> = ({ metric }) => {
  if (!metric.chartData || metric.chartData.length === 0 || !metric.chartConfig) {
    return <p className="text-muted-foreground text-center py-4 text-xs">No chart data.</p>;
  }

  const dataKey = metric.dataKey || 'value';
  const ChartComponentType = metric.type === 'bar-chart' ? RechartsBarChart 
                          : metric.type === 'line-chart' ? RechartsLineChart 
                          : RechartsAreaChart;
  
  const ChartSeriesComponent = metric.type === 'bar-chart' ? Bar 
                              : metric.type === 'line-chart' ? Line 
                              : Area;

  return (
    <div className="h-full w-full p-2">
      <ChartContainer config={metric.chartConfig} className="h-full w-full">
        <ChartComponentType accessibilityLayer data={metric.chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="4 4" className="stroke-border/50" />
          <XAxis dataKey={metric.chartData[0]?.day ? "day" : (metric.chartData[0]?.month ? "month" : "name")} tickLine={false} axisLine={false} tickMargin={5} fontSize={10} />
          <YAxis tickLine={false} axisLine={false} tickMargin={5} fontSize={10} unit={metric.unit?.charAt(0)} />
          <ChartTooltip cursor={{fill: "hsl(var(--muted)/0.6)"}} content={<ChartTooltipContent indicator="dot" />} />
          {metric.type === 'area-chart' ? (
            <Area type="monotone" dataKey={dataKey} strokeWidth={2} stroke={`var(--color-${dataKey})`} fillOpacity={0.4} fill={`var(--color-${dataKey})`} activeDot={{ r: 5, className: "stroke-background fill-primary shadow-md" }} />
          ) : (
            <ChartSeriesComponent 
              dataKey={dataKey} 
              strokeWidth={metric.type === 'line-chart' ? 2 : undefined} 
              fill={`var(--color-${Object.keys(metric.chartConfig!)[0]})`} 
              stroke={metric.type === 'line-chart' ? `var(--color-${Object.keys(metric.chartConfig!)[0]})` : undefined} 
              radius={metric.type === 'bar-chart' ? 4 : undefined} 
              barSize={metric.type === 'bar-chart' ? 12 : undefined} 
              activeDot={metric.type === 'line-chart' ? {r:5, className:"stroke-background fill-primary shadow-md"} : undefined}
            />
          )}
        </ChartComponentType>
      </ChartContainer>
    </div>
  );
};

export default ChartWidget;
