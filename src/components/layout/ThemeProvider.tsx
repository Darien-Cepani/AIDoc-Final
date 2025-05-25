
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"
import type { ThemeProviderProps } from "next-themes/dist/types"
import { useAuth } from "@/contexts/AuthContext"

type FontSize = "sm" | "default" | "lg";

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return null;
    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max === min) { h = s = 0; } 
    else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslStringToRgb(hslStr: string): { r: number, g: number, b: number } | null {
    const match = hslStr.match(/(\d+)\s*(\d+)%\s*(\d+)%/);
    if (!match) return null;
    let h = parseInt(match[1], 10);
    let s = parseInt(match[2], 10) / 100;
    let l = parseInt(match[3], 10) / 100;
    if (s === 0) { 
        const greyVal = Math.round(l * 255);
        return { r: greyVal, g: greyVal, b: greyVal };
    }
    const hueToRgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hNormalized = h / 360;
    return {
        r: Math.round(hueToRgb(p, q, hNormalized + 1 / 3) * 255),
        g: Math.round(hueToRgb(p, q, hNormalized) * 255),
        b: Math.round(hueToRgb(p, q, hNormalized - 1 / 3) * 255),
    };
}

function calculateLuminance(rgb: { r: number, g: number, b: number }): number {
    const a = [rgb.r, rgb.g, rgb.b].map(function (v) {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function updatePrimaryForegroundColor(primaryHslStr: string) {
    const rgbColor = hslStringToRgb(primaryHslStr);
    if (rgbColor) {
        const luminance = calculateLuminance(rgbColor);
        if (luminance > 0.45) { 
            document.documentElement.style.setProperty('--primary-foreground-hsl', '0 0% 0%'); 
        } else { 
            document.documentElement.style.setProperty('--primary-foreground-hsl', '0 0% 100%'); 
        }
    } else { 
         document.documentElement.style.setProperty('--primary-foreground-hsl', '0 0% 100%');
    }
}

function ThemeInitializer() {
  const { user } = useAuth();

  React.useEffect(() => {
    // Apply accent color from user preferences or localStorage or default
    const userAccentHex = user?.preferences?.accentColor;
    const storedAccentHex = localStorage.getItem("aidoc-accent-color-hex-val");
    const accentHexToApply = userAccentHex || storedAccentHex || "#2E9AFE"; // Default blue

    const hslColor = hexToHsl(accentHexToApply);
    if (hslColor) {
      const hslString = `${hslColor.h} ${hslColor.s}% ${hslColor.l}%`;
      document.documentElement.style.setProperty('--primary-hsl', hslString);
      updatePrimaryForegroundColor(hslString);
      // Update localStorage if user preference was used, to keep it in sync for next non-authed load
      if (userAccentHex && userAccentHex !== storedAccentHex) {
        localStorage.setItem("aidoc-primary-hsl-val", hslString);
        localStorage.setItem("aidoc-accent-color-hex-val", userAccentHex);
      } else if (!userAccentHex && !storedAccentHex) { // First load, default applied
        localStorage.setItem("aidoc-primary-hsl-val", hslString);
        localStorage.setItem("aidoc-accent-color-hex-val", accentHexToApply);
      }
    }

    // Apply font size from user preferences or localStorage or default
    const userFontSize = user?.preferences?.fontSize;
    const storedFontSize = localStorage.getItem("aidoc-font-size") as FontSize | null;
    const fontSizeToApply = userFontSize || storedFontSize || "default";

    document.documentElement.classList.remove("text-size-sm", "text-size-default", "text-size-lg"); 
    document.documentElement.classList.add(`text-size-${fontSizeToApply}`);
    if (userFontSize && userFontSize !== storedFontSize) {
      localStorage.setItem("aidoc-font-size", userFontSize);
    } else if (!userFontSize && !storedFontSize) {
      localStorage.setItem("aidoc-font-size", fontSizeToApply);
    }

    // Apply high contrast from user preferences or localStorage or default
    const userHighContrast = user?.preferences?.highContrast;
    const storedHighContrast = localStorage.getItem("aidoc-high-contrast") === 'true';
    const highContrastToApply = userHighContrast !== undefined ? userHighContrast : storedHighContrast;
    
    if (highContrastToApply) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
    if (userHighContrast !== undefined && userHighContrast !== storedHighContrast) {
      localStorage.setItem("aidoc-high-contrast", String(userHighContrast));
    } else if (userHighContrast === undefined && localStorage.getItem("aidoc-high-contrast") === null) {
       localStorage.setItem("aidoc-high-contrast", String(false)); // Default
    }


    // Listen for accent color changes from settings page (which now also updates Firestore)
    const handleAccentChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ hslString: string }>;
      if (customEvent.detail && customEvent.detail.hslString) {
        document.documentElement.style.setProperty('--primary-hsl', customEvent.detail.hslString);
        updatePrimaryForegroundColor(customEvent.detail.hslString);
      }
    };
    window.addEventListener('accentColorChanged', handleAccentChange);
    
    return () => {
      window.removeEventListener('accentColorChanged', handleAccentChange);
    };

  }, [user?.preferences]); // Re-run if user preferences from Firestore change

  return null; // This component doesn't render anything itself
}


export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      <ThemeInitializer />
      {children}
    </NextThemesProvider>
  );
}
