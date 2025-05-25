
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { dailyHealthInsight, type DailyHealthInsightOutput } from '@/ai/flows/daily-health-insight';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Lightbulb, MessageSquareQuote, Sparkles } from 'lucide-react'; 
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card'; 
import type { SidebarBehavior } from '@/components/ui/sidebar';


interface SidebarHealthInsightProps {
  className?: string;
  visualState: "expanded" | "collapsed";
}

export function SidebarHealthInsight({ className, visualState }: SidebarHealthInsightProps) {
  const { user } = useAuth();
  const [insight, setInsight] = useState<DailyHealthInsightOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAndSetInsight = useCallback(async () => {
    const currentDayString = new Date().toDateString();
    const userIdForCache = user?.id || 'guest_user';
    const insightKey = `aidoc-sidebar-dailyInsight-${userIdForCache}-${currentDayString}`;

    // Try to load from localStorage first
    const cachedData = typeof window !== 'undefined' ? localStorage.getItem(insightKey) : null;
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData) as DailyHealthInsightOutput;
        if (parsed && parsed.healthTip && parsed.inspirationalQuote) {
          setInsight(parsed);
          setIsLoading(false);
          setError(null);
          return; // Found valid cached data for today
        }
      } catch (e) {
        console.warn("Failed to parse cached sidebar insight, fetching new.", e);
        localStorage.removeItem(insightKey); // Clear corrupted cache
      }
    }

    // If not cached or cache is invalid/old, fetch new insight
    setIsLoading(true);
    setError(null);
    try {
      let healthContext = "General well-being and daily motivation.";
      if (user?.existingConditions && user.existingConditions.length > 0) {
        healthContext += ` User is managing: ${user.existingConditions.join(', ')}.`;
      }
      
      const result = await dailyHealthInsight({
        userName: user?.name || 'User',
        healthContext: healthContext,
      });
      setInsight(result);
      if (typeof window !== 'undefined' && result?.healthTip) { // Cache the new insight
        localStorage.setItem(insightKey, JSON.stringify(result));
      }
    } catch (e) {
      console.error("Failed to fetch sidebar health insight:", e);
      setError("Could not load insight.");
      setInsight({ // Fallback insight
        healthTip: "Remember to take a moment for yourself today.",
        inspirationalQuote: "Strength grows in the moments when you think you can't go on but you keep going anyway."
      });
    } finally {
      setIsLoading(false);
    }
  }, [user]); // Dependency on user to refetch/re-cache if user changes

  useEffect(() => {
    fetchAndSetInsight();
  }, [fetchAndSetInsight]); // fetchAndSetInsight is memoized and depends on user

  const showLoader = isLoading && visualState === "expanded";
  const showContent = !isLoading && visualState === "expanded" && insight;
  const showError = !isLoading && visualState === "expanded" && error;

  if (visualState === "collapsed") { // Show nothing or a minimal icon if collapsed
    return null; 
  }

  if (showLoader) {
    return (
      <div className={cn("p-3 text-sidebar-muted-foreground flex items-center gap-2 text-xs", className)}>
        <Loader2 className="h-4 w-4 animate-spin text-primary" /> Loading insight...
      </div>
    );
  }

  const healthTipMessage = insight?.healthTip || "Stay positive and hydrated!";
  const quoteMessage = insight?.inspirationalQuote || "Every day is a fresh start.";
  const showPositiveAffirmation = !error && user?.onboardingComplete && !isLoading && insight;


  return (
    <Card className={cn(
        "bg-sidebar-accent/10 dark:bg-sidebar-accent/20 border-sidebar-border/30 shadow-sm rounded-lg overflow-hidden", 
        className
      )}>
      <CardContent className="p-3 space-y-2 text-xs text-sidebar-foreground/90 dark:text-sidebar-foreground/80">
        {showPositiveAffirmation && (
            <div className="flex items-center gap-1.5 font-medium text-primary text-[0.7rem]">
                <Sparkles className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                <p>Everything looks good! :)</p>
            </div>
        )}
        {showContent && (
          <>
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
              <div>
                <p className="font-semibold text-sidebar-foreground text-[0.8rem] leading-tight">Health Tip:</p>
                <p className="text-[0.75rem] leading-snug">{healthTipMessage}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MessageSquareQuote className="h-4 w-4 mt-0.5 text-primary/90 flex-shrink-0" />
              <div>
                 <p className="font-semibold text-sidebar-foreground text-[0.8rem] leading-tight">Quote:</p>
                <p className="italic text-[0.75rem] leading-snug">&ldquo;{quoteMessage}&rdquo;</p>
              </div>
            </div>
          </>
        )}
        {showError && (
          <p className="mt-1 text-xs text-destructive/80">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}
