"use client"

import * as React from "react"
import { Moon, Sun, Laptop } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const themes = ["light", "dark", "system"] as const;
type ThemeSetting = (typeof themes)[number]; // 'light', 'dark', or 'system'

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme(); // theme is the setting, resolvedTheme is actual
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const cycleTheme = () => {
    const currentSettingIndex = themes.indexOf(theme as ThemeSetting);
    const nextThemeIndex = (currentSettingIndex + 1) % themes.length;
    setTheme(themes[nextThemeIndex]);
  }

  if (!mounted) { // Avoid hydration mismatch and rendering incorrect icon initially
    return <Button variant="ghost" size="icon" className="h-8 w-8 opacity-50 cursor-default"><Laptop className="h-[1.2rem] w-[1.2rem]" /></Button>;
  }

  const currentIcon = resolvedTheme === "dark" ? Moon : Sun; // Show Sun for light or system (if system is light)
  const nextThemeSetting = themes[(themes.indexOf(theme as ThemeSetting) + 1) % themes.length];
  const tooltipMessage = `Switch to ${nextThemeSetting.charAt(0).toUpperCase() + nextThemeSetting.slice(1)} mode`;
  
  const displayIcon = () => {
    if (theme === "system") return <Laptop className="h-[1.2rem] w-[1.2rem] transition-all"/>
    if (theme === "dark") return <Moon className="h-[1.2rem] w-[1.2rem] transition-all"/>
    return <Sun className="h-[1.2rem] w-[1.2rem] transition-all"/>
  }


  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={cycleTheme} aria-label={tooltipMessage} className="h-8 w-8">
            {displayIcon()}
            <span className="sr-only">{tooltipMessage}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipMessage}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
