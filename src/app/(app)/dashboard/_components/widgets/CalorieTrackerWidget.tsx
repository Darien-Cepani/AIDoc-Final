
"use client";

import React,
{
  useState,
  useMemo,
  useEffect
} from 'react';
import {
  Button
} from "@/components/ui/button";
import {
  Progress
} from "@/components/ui/progress";
import {
  Textarea
} from '@/components/ui/textarea';
import {
  ScrollArea
} from "@/components/ui/scroll-area";
import {
  Label
} from "@/components/ui/label";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent
} from "@/components/ui/tooltip";
import {
  Loader2,
  Plus,
  X,
  Edit3,
  Utensils,
  Flame,
  Scale,
  History,
  Fish,
  Wheat,
  EggFried,
  Info,
  CalendarDays,
  LineChart as LineChartIcon
} from "lucide-react";
import {
  cn
} from '@/lib/utils';
import type {
  DashboardMetric,
  UserProfile
} from '../../../page'; 
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter as DialogModalFooter
} from "@/components/ui/dialog";
import * as RechartsPrimitive from 'recharts';
import {
  ChartConfig,
  ChartContainer
} from '@/components/ui/chart';
import {
  Card
} from '@/components/ui/card';
import {
  Separator
} from '@/components/ui/separator';
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  isValid as isValidDate
} from 'date-fns';


export interface MealEntry {
  id: string;
  description: string;
  aiSuggestedMealName: string;
  estimatedCalories: number;
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
  healthinessNotes?: string | null;
  healthinessScore?: number | null; // 1-5
  estimationNotes?: string | null;
  timestamp: string;
}

export type StoredCalorieLog = {
  date: string; // YYYY-MM-DD
  totalCalories: number;
  goal: number;
  meals: MealEntry[];
  dailyProteinGrams: number;
  dailyCarbsGrams: number;
  dailyFatGrams: number;
};

interface CalorieHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  calorieHistory: StoredCalorieLog[];
}

const CalorieHistoryModal: React.FC<CalorieHistoryModalProps> = ({
  isOpen,
  onClose,
  calorieHistory
}) => {
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');

  const filteredChartData = useMemo(() => {
    if (!calorieHistory || calorieHistory.length === 0) return [];
    const now = new Date();
    let interval;
    if (timeRange === 'week') {
      interval = {
        start: startOfWeek(now, {
          weekStartsOn: 1
        }),
        end: endOfWeek(now, {
          weekStartsOn: 1
        })
      };
    } else { // month
      interval = {
        start: startOfMonth(now),
        end: endOfMonth(now)
      };
    }

    return calorieHistory
      .filter(day => {
        const dayDate = parseISO(day.date);
        return isValidDate(dayDate) && isWithinInterval(dayDate, interval);
      })
      .map(day => {
        return {
          name: format(parseISO(day.date), 'MMM d'),
          date: day.date, // Keep original date for sorting/tooltip
          totalCalories: day.totalCalories,
          goal: day.goal,
          proteinGrams: day.dailyProteinGrams, 
          carbsGrams: day.dailyCarbsGrams,
          fatGrams: day.dailyFatGrams,
          meals: day.meals,
        };
      })
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
  }, [calorieHistory, timeRange]);

  const calorieChartConfig: ChartConfig = {
    proteinGrams: { label: "Protein", color: "hsl(var(--chart-1))" },
    carbsGrams: { label: "Carbs", color: "hsl(var(--chart-2))" },
    fatGrams: { label: "Fat", color: "hsl(var(--chart-4))" },
    goal: { label: "Goal (kcal)", color: "hsl(var(--muted-foreground))" }
  };
  
  const CustomTooltipContent = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const dayData = payload[0].payload; // The data object for the hovered bar
        if (!dayData) return null;

        const proteinCalories = dayData.proteinGrams * 4;
        const carbsCalories = dayData.carbsGrams * 4;
        const fatCalories = dayData.fatGrams * 9;
        const totalMacroCalories = proteinCalories + carbsCalories + fatCalories;

        return (
            <Card className="p-3 glassmorphic text-xs shadow-lg max-w-xs w-64">
                <p className="font-semibold mb-1">{dayData.name} ({isValidDate(parseISO(dayData.date)) ? format(parseISO(dayData.date), 'EEE') : 'Invalid Date'})</p>
                <p>Consumed: <span className="font-bold text-primary">{dayData.totalCalories}</span> kcal</p>
                <p>Goal: {dayData.goal} kcal</p>
                <Separator className="my-1.5" />
                <p className="font-medium mb-0.5">Daily Macros:</p>
                <div className="space-y-0.5">
                    <p style={{ color: 'hsl(var(--chart-1))' }}><span className="font-semibold">Protein:</span> {dayData.proteinGrams?.toFixed(0)}g ({proteinCalories.toFixed(0)} kcal)</p>
                    <p style={{ color: 'hsl(var(--chart-2))' }}><span className="font-semibold">Carbs:</span> {dayData.carbsGrams?.toFixed(0)}g ({carbsCalories.toFixed(0)} kcal)</p>
                    <p style={{ color: 'hsl(var(--chart-4))' }}><span className="font-semibold">Fat:</span> {dayData.fatGrams?.toFixed(0)}g ({fatCalories.toFixed(0)} kcal)</p>
                </div>

                {dayData.meals && dayData.meals.length > 0 && (
                    <>
                        <Separator className="my-1.5" />
                        <p className="font-medium mb-0.5">Meals ({dayData.meals.length}):</p>
                        <ScrollArea className="h-24 custom-scrollbar pr-2">
                            <ul className="space-y-1 text-muted-foreground">
                                {dayData.meals.map((meal: MealEntry, index: number) => (
                                    <li key={index}>
                                        <span className="text-foreground">{meal.aiSuggestedMealName}:</span> {meal.estimatedCalories} kcal
                                        (P:{meal.macros.protein.toFixed(0)}g, C:{meal.macros.carbs.toFixed(0)}g, F:{meal.macros.fat.toFixed(0)}g)
                                        {meal.healthinessScore && ` (Health: ${meal.healthinessScore}/5)`}
                                    </li>
                                ))}
                            </ul>
                        </ScrollArea>
                    </>
                )}
            </Card>
        );
    }
    return null;
  };

  const maxYValueMacros = useMemo(() => {
    if (!filteredChartData || filteredChartData.length === 0) return 100; // Default if no data, for grams
    const maxMacroSum = Math.max(...filteredChartData.map(d => d.proteinGrams + d.carbsGrams + d.fatGrams));
    return Math.max(maxMacroSum, 50) * 1.1; // Add 10% buffer, min 50g
  }, [filteredChartData]);

  const maxYValueCalories = useMemo(() => {
    if (!filteredChartData || filteredChartData.length === 0) return 2500; // Default if no data, for calories
    const maxCalories = Math.max(...filteredChartData.map(d => d.totalCalories));
    const maxGoal = Math.max(...filteredChartData.map(d => d.goal));
    return Math.max(maxCalories, maxGoal, 1000) * 1.1; // Add 10% buffer, min 1000 kcal
  }, [filteredChartData]);


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl md:max-w-4xl lg:max-w-5xl glassmorphic h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Calorie Intake History</DialogTitle>
          <DialogDescription>Your daily calorie consumption and macro breakdown over time.</DialogDescription>
        </DialogHeader>
        <div className="flex-grow flex flex-col min-h-0 py-4">
          <div className="flex justify-end gap-2 mb-4">
            <Button variant={timeRange === 'week' ? 'default' : 'outline'} size="sm" onClick={() => setTimeRange('week')}>This Week</Button>
            <Button variant={timeRange === 'month' ? 'default' : 'outline'} size="sm" onClick={() => setTimeRange('month')}>This Month</Button>
          </div>
          {filteredChartData.length > 0 ? (
            <ChartContainer config={calorieChartConfig} className="h-full w-full flex-grow">
              <RechartsPrimitive.ResponsiveContainer width="100%" height="100%">
                <RechartsPrimitive.BarChart data={filteredChartData} margin={{ top: 5, right: 20, left: -20, bottom: 20 }}>
                  <RechartsPrimitive.CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.3} />
                  <RechartsPrimitive.XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} angle={-30} textAnchor="end" height={50} interval={0} style={{ fontSize: '0.7rem' }} />
                  <RechartsPrimitive.YAxis yAxisId="left" unit="g" orientation="left" tickLine={false} axisLine={false} tickMargin={8} domain={[0, maxYValueMacros]} style={{ fontSize: '0.7rem' }} />
                  <RechartsPrimitive.YAxis yAxisId="right" unit="kcal" orientation="right" tickLine={false} axisLine={false} tickMargin={8} domain={[0, maxYValueCalories]} style={{ fontSize: '0.7rem' }} />

                  <RechartsPrimitive.Tooltip content={<CustomTooltipContent />} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} wrapperStyle={{ zIndex: 1000 }} />
                  <RechartsPrimitive.Legend wrapperStyle={{ fontSize: '0.8rem', paddingTop: '10px' }} />

                  <RechartsPrimitive.Bar yAxisId="left" dataKey="proteinGrams" stackId="macros" fill="hsl(var(--chart-1))" name="Protein (g)" radius={[4, 4, 0, 0]} barSize={30} />
                  <RechartsPrimitive.Bar yAxisId="left" dataKey="carbsGrams" stackId="macros" fill="hsl(var(--chart-2))" name="Carbs (g)" barSize={30} />
                  <RechartsPrimitive.Bar yAxisId="left" dataKey="fatGrams" stackId="macros" fill="hsl(var(--chart-4))" name="Fat (g)" radius={[0, 0, 4, 4]} barSize={30} />

                  {/* Goal Line for Calories */}
                  {filteredChartData.map((entry, index) => (
                      <RechartsPrimitive.ReferenceLine
                          yAxisId="right" // Ensure this matches the Y-axis for calories
                          key={`goal-cal-${index}`}
                          y={entry.goal}
                          stroke="hsl(var(--muted-foreground))"
                          strokeDasharray="3 3"
                          strokeWidth={1.5}
                          ifOverflow="extendDomain"
                      >
                          <RechartsPrimitive.Label
                              value={`${entry.goal}`}
                              position="insideTopRight"
                              fill="hsl(var(--muted-foreground))"
                              fontSize={9}
                              dy={-2}
                              dx={2}
                          />
                      </RechartsPrimitive.ReferenceLine>
                  ))}
                </RechartsPrimitive.BarChart>
              </RechartsPrimitive.ResponsiveContainer>
            </ChartContainer>
          ) : (
            <p className="text-center text-muted-foreground py-10 flex-grow flex items-center justify-center">No calorie history available for {timeRange === 'week' ? 'this week' : 'this month'}.</p>
          )}
        </div>
        <DialogModalFooter className="mt-auto">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogModalFooter>
      </DialogContent>
    </Dialog>
  );
};


interface SegmentedMacroBarProps {
  macros: { protein: number; carbs: number; fat: number }; // in grams
}

const SegmentedMacroBar: React.FC<SegmentedMacroBarProps> = ({ macros }) => {
  const { protein, carbs, fat } = macros;
  const proteinCalories = protein * 4;
  const carbsCalories = carbs * 4;
  const fatCalories = fat * 9;
  const totalCaloriesFromMacros = proteinCalories + carbsCalories + fatCalories;

  if (totalCaloriesFromMacros === 0) {
    return (
      <div className="my-2 px-3 w-full">
        <div className="h-3 w-full rounded-full bg-muted flex items-center justify-center">
          <p className="text-xs text-muted-foreground">Log meals to see macro breakdown</p>
        </div>
        <div className="mt-1.5 grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
          <div>P: 0g (0%)</div>
          <div>C: 0g (0%)</div>
          <div>F: 0g (0%)</div>
        </div>
      </div>
    );
  }

  const macroData = [
    { name: 'Protein', value: protein, percent: (proteinCalories / totalCaloriesFromMacros) * 100, color: 'bg-[hsl(var(--chart-1))]', textColor: 'text-[hsl(var(--chart-1))]' },
    { name: 'Carbs', value: carbs, percent: (carbsCalories / totalCaloriesFromMacros) * 100, color: 'bg-[hsl(var(--chart-2))]', textColor: 'text-[hsl(var(--chart-2))]' },
    { name: 'Fat', value: fat, percent: (fatCalories / totalCaloriesFromMacros) * 100, color: 'bg-[hsl(var(--chart-4))]', textColor: 'text-[hsl(var(--chart-4))]' },
  ];

  return (
    <div className="my-2 w-full px-3">
      <div className="flex h-3 w-full rounded-full overflow-hidden bg-muted">
        {macroData.map((macro) => (
          macro.percent > 0 && (
            <TooltipProvider key={macro.name} delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn('h-full transition-all duration-300 ease-in-out', macro.color)}
                    style={{ width: `${macro.percent}%` }}
                  />
                </TooltipTrigger>
                <TooltipContent className="text-xs p-1.5">
                  <p>{macro.name}: {macro.value.toFixed(0)}g ({macro.percent.toFixed(0)}% of calories)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-3 gap-2 text-center text-xs">
        {macroData.map((macro) => (
          <div key={macro.name} className={cn("truncate", macro.textColor)}>
            <p className="font-medium">{macro.name.substring(0,1)}: {macro.value.toFixed(0)}g</p>
            <p className="text-muted-foreground/80">({macro.percent.toFixed(0)}%)</p>
          </div>
        ))}
      </div>
    </div>
  );
};


interface CalorieTrackerWidgetProps {
  metric: DashboardMetric;
  user: UserProfile | null;
  onAddMeal: (metricId: string, mealDescription: string) => Promise<void>;
  onRemoveMeal: (metricId: string, mealId: string) => void;
  onEditMetric: (metric: DashboardMetric) => void;
  isEstimatingCalories: boolean;
  isCalorieHistoryModalOpen: boolean;
  setIsCalorieHistoryModalOpen: (isOpen: boolean) => void;
  calorieHistory: StoredCalorieLog[];
}

const CalorieTrackerWidget: React.FC<CalorieTrackerWidgetProps> = ({
  metric, user, onAddMeal, onRemoveMeal, onEditMetric,
  isEstimatingCalories: isEstimatingCaloriesGlobal,
  isCalorieHistoryModalOpen, setIsCalorieHistoryModalOpen, calorieHistory
}) => {
  const [internalMealDescription, setInternalMealDescription] = useState('');
  const [internalIsEstimating, setInternalIsEstimating] = useState(false);

  const totalCaloriesToday = (metric.dailyMeals || []).reduce((sum, meal) => sum + meal.estimatedCalories, 0);
  const goal = metric.dailyCalorieGoal || user?.dailyCalorieGoal || 2000;
  const progress = goal > 0 ? Math.min((totalCaloriesToday / goal) * 100, 100) : 0;
  
  let baseColorClass = 'primary'; // Default
  if (totalCaloriesToday > goal * 1.1) baseColorClass = 'destructive';
  else if (totalCaloriesToday > goal) baseColorClass = 'orange-500';
  else if (totalCaloriesToday < goal * 0.9 && totalCaloriesToday > 0) baseColorClass = 'yellow-500';
  else if (totalCaloriesToday === 0 && goal > 0) baseColorClass = 'muted-foreground';

  const textColorClass = `text-${baseColorClass}`;
  const progressIndicatorColorClass = `bg-${baseColorClass}`;
  const progressTrackColorClass = `bg-${baseColorClass === 'muted-foreground' ? 'muted' : baseColorClass + '/20' }`;


  const dailyMacros = (metric.dailyMeals || []).reduce((acc, meal) => {
    acc.protein += meal.macros.protein;
    acc.carbs += meal.macros.carbs;
    acc.fat += meal.macros.fat;
    return acc;
  }, { protein: 0, carbs: 0, fat: 0 });

  const handleLogMeal = async () => {
    if (!internalMealDescription.trim()) return;
    setInternalIsEstimating(true);
    await onAddMeal(metric.id, internalMealDescription);
    setInternalMealDescription('');
    setInternalIsEstimating(false);
  };

  return (
    <>
      <div className="flex flex-col h-full p-0">
        {/* Top Section: Summary */}
        <div className="px-3 pt-2 space-y-1.5">
          <div className="flex justify-between items-baseline">
            <div className="flex items-baseline">
              <span className={cn("text-2xl sm:text-3xl font-bold tabular-nums", textColorClass)}>
                {totalCaloriesToday}
              </span>
              <span className={cn("text-sm ml-1", textColorClass === 'text-muted-foreground' ? 'text-muted-foreground' : 'text-foreground/80')}> / {goal} kcal</span>
            </div>
          </div>
          <Progress 
            value={progress} 
            className={cn("h-2.5 rounded-md", progressTrackColorClass)} 
            indicatorClassName={progressIndicatorColorClass} // Pass indicator color class
          />
        </div>

        <SegmentedMacroBar macros={dailyMacros} />

        <div className="flex-grow flex flex-col min-h-0 gap-2 px-3 pb-3 pt-1">
          <Textarea
            placeholder="Describe your meal..."
            value={internalMealDescription}
            onChange={(e) => setInternalMealDescription(e.target.value)}
            rows={2}
            className="text-sm glassmorphic minimal-scrollbar py-2 px-2.5 min-h-[60px] flex-shrink-0"
          />
          <Button
            size="sm"
            onClick={handleLogMeal}
            disabled={internalIsEstimating || isEstimatingCaloriesGlobal || !internalMealDescription?.trim()}
            className="w-full h-9 bg-primary hover:bg-primary/90 text-sm flex-shrink-0"
          >
            {internalIsEstimating || isEstimatingCaloriesGlobal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} Log Meal
          </Button>

          <div className="flex-grow flex flex-col min-h-0 pt-1">
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 flex-shrink-0">Today&apos;s Meals:</Label>
            <ScrollArea className="flex-grow custom-scrollbar pr-1 -mr-1">
              {(metric.dailyMeals || []).length > 0 ? (
                <ul className="space-y-1.5">
                  {(metric.dailyMeals || []).slice().reverse().map(meal => {
                    let healthIndicatorColor = 'bg-muted';
                    if (meal.healthinessScore) {
                      if (meal.healthinessScore >= 4) healthIndicatorColor = 'bg-green-500';
                      else if (meal.healthinessScore === 3) healthIndicatorColor = 'bg-yellow-500';
                      else if (meal.healthinessScore <= 2) healthIndicatorColor = 'bg-red-500';
                    }
                    return (
                      <li key={meal.id} className="flex items-center justify-between hover:bg-accent/10 p-2 pr-1 rounded-md group transition-colors">
                        <TooltipProvider delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2.5 truncate flex-1 cursor-default">
                                <Utensils className="h-4 w-4 text-primary/80 group-hover:text-primary transition-colors flex-shrink-0" />
                                <span className="font-medium text-sm truncate group-hover:text-primary">{meal.aiSuggestedMealName}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" align="start" className="text-xs p-2 shadow-xl glassmorphic max-w-[280px] w-auto z-[150]">
                              <p className="font-semibold mb-0.5">{meal.aiSuggestedMealName}</p>
                              <p className="text-muted-foreground text-[0.7rem] mb-1 line-clamp-2">Original: {meal.description}</p>
                              <div className="space-y-0.5 mb-1.5">
                                <p className="text-[hsl(var(--chart-1))]"><span className="font-medium">Protein:</span> {meal.macros.protein.toFixed(0)}g</p>
                                <p className="text-[hsl(var(--chart-2))]"><span className="font-medium">Carbs:</span> {meal.macros.carbs.toFixed(0)}g</p>
                                <p className="text-[hsl(var(--chart-4))]"><span className="font-medium">Fat:</span> {meal.macros.fat.toFixed(0)}g</p>
                              </div>
                              {meal.healthinessScore && (
                                <div className="flex items-center gap-1.5 mt-1 pt-1 border-t border-border/30">
                                  <span className={cn("h-2.5 w-2.5 rounded-full", healthIndicatorColor)}></span>
                                  <p className="text-xs">Healthiness: {meal.healthinessScore}/5</p>
                                </div>
                              )}
                              {meal.healthinessNotes && <p className="text-xs italic mt-1">{meal.healthinessNotes}</p>}
                              {meal.estimationNotes && <p className="text-xs italic mt-1 pt-1 border-t border-border/30 text-muted-foreground/80">{meal.estimationNotes}</p>}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <div className="flex items-center gap-1.5 shrink-0 pl-2">
                          <span className="font-semibold text-sm text-primary/90">{meal.estimatedCalories} kcal</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-80 hover:!opacity-100 hover:bg-destructive/20 text-destructive transition-opacity flex-shrink-0" onClick={() => onRemoveMeal(metric.id, meal.id)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : <p className="text-center text-sm text-muted-foreground italic py-8">No meals logged today.</p>}
            </ScrollArea>
          </div>
        </div>
      </div>
      <CalorieHistoryModal
        isOpen={isCalorieHistoryModalOpen}
        onClose={() => setIsCalorieHistoryModalOpen(false)}
        calorieHistory={calorieHistory}
      />
    </>
  );
};

export default CalorieTrackerWidget;
export { Card as CalorieWidgetCard };

