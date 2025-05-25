
"use client";

import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DashboardMetric } from '../../page'; // Adjust path
import { iconNameToComponent } from '../../page'; // Assuming iconNameToComponent is exported

interface DataListWidgetProps {
  metric: DashboardMetric;
}

const DataListWidget: React.FC<DataListWidgetProps> = ({ metric }) => {
  return (
    <ScrollArea className="h-full max-h-[150px] text-sm custom-scrollbar p-3">
      {Array.isArray(metric.listData) && metric.listData.length > 0 ? (
        <ul className="space-y-2 pr-2">
          {metric.listData.map((item, index) => {
            const ItemIcon = typeof item === 'object' && item.iconName ? iconNameToComponent(item.iconName) : null;
            return (
              <li key={index} className="truncate flex items-center text-xs bg-background/50 p-1.5 rounded-md">
                {ItemIcon && <ItemIcon className="h-4 w-4 mr-2 text-primary shrink-0"/>}
                {typeof item === 'string' ? item : <><span className="font-medium text-foreground/90">{item.label}:</span>&nbsp;{String(item.value)}</>}
              </li>
            )
          })}
        </ul>
      ) : <p className="text-xs text-muted-foreground italic text-center py-2">No list data available.</p>}
    </ScrollArea>
  );
};

export default DataListWidget;
