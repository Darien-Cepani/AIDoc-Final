
"use client"

import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch"; 
import { Palette, Apple, Database, Download, Trash2, Volume2, Contrast, TextIcon, Paintbrush, User as UserIconProfile, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState, useRef, useCallback } from "react";
import { useTheme } from "next-themes";
import { Input } from "@/components/ui/input"; 
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props} className="h-5 w-5 mr-2">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    <path d="M1 1h22v22H1z" fill="none" />
  </svg>
);

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

export default function SettingsPage() {
  const { user, updateUserProfile } = useAuth();
  const { theme } = useTheme(); // next-themes theme
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});

  // Local state for UI, initialized from user.preferences or defaults
  const [selectedAccentHex, setSelectedAccentHex] = useState<string>(user?.preferences?.accentColor || "#2E9AFE");
  const [fontSize, setFontSize] = useState<FontSize>(user?.preferences?.fontSize || "default");
  const [isHighContrast, setIsHighContrast] = useState<boolean>(user?.preferences?.highContrast || false);
  
  const colorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  // Sync local UI state with user.preferences when user object changes (e.g., after login or Firestore update)
  useEffect(() => {
    if (user?.preferences) {
      setSelectedAccentHex(user.preferences.accentColor || "#2E9AFE");
      setFontSize(user.preferences.fontSize || "default");
      setIsHighContrast(user.preferences.highContrast || false);
    }
  }, [user?.preferences]);


  const handlePreferenceChange = useCallback(async (key: keyof UserPreferences, value: any) => {
    setIsSaving(prev => ({ ...prev, [key]: true }));
    try {
      await updateUserProfile({ preferences: { ...user?.preferences, [key]: value } });
      // Update localStorage for immediate visual effect by ThemeProvider
      if (key === 'accentColor') {
        const hslColor = hexToHsl(value as string);
        if (hslColor) {
          const hslString = `${hslColor.h} ${hslColor.s}% ${hslColor.l}%`;
          localStorage.setItem("aidoc-primary-hsl-val", hslString);
          localStorage.setItem("aidoc-accent-color-hex-val", value as string);
          window.dispatchEvent(new CustomEvent('accentColorChanged', { detail: { hslString } }));
        }
      } else if (key === 'fontSize') {
        document.documentElement.classList.remove("text-size-sm", "text-size-default", "text-size-lg");
        document.documentElement.classList.add(`text-size-${value}`);
        localStorage.setItem("aidoc-font-size", value as string);
      } else if (key === 'highContrast') {
        if (value) document.documentElement.classList.add('high-contrast');
        else document.documentElement.classList.remove('high-contrast');
        localStorage.setItem("aidoc-high-contrast", String(value));
      }
      // toast({ title: "Preference Saved", description: `${key.replace(/([A-Z])/g, ' $1')} updated.`, iconType: "success" });
    } catch (error) {
      toast({ title: "Error", description: `Could not save ${key}.`, variant: "destructive", iconType: "error" });
      // Revert UI state if Firestore update fails (optional, or rely on next user object sync)
      if (key === 'accentColor') setSelectedAccentHex(user?.preferences?.accentColor || "#2E9AFE");
      if (key === 'fontSize') setFontSize(user?.preferences?.fontSize || "default");
      if (key === 'highContrast') setIsHighContrast(user?.preferences?.highContrast || false);
    } finally {
      setIsSaving(prev => ({ ...prev, [key]: false }));
    }
  }, [user?.preferences, updateUserProfile, toast]);


  if (!mounted) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-primary"/>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
      
      <Card className="glassmorphic">
        <CardHeader>
          <CardTitle className="flex items-center"><Paintbrush className="mr-2 h-5 w-5 text-primary"/>Appearance</CardTitle>
          <CardDescription>Customize the look and feel of the application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border p-4 hover:shadow-sm transition-shadow">
            <div>
              <Label htmlFor="theme-mode" className="text-base font-medium">Theme Mode</Label>
              <p className="text-sm text-muted-foreground">
                Cycle through Light, Dark, or System default themes.
              </p>
            </div>
            <ThemeToggle />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4 hover:shadow-sm transition-shadow">
            <div>
                <Label htmlFor="accent-color-display" className="text-base font-medium">Accent Color</Label>
                <p className="text-sm text-muted-foreground">Choose your preferred accent color.</p>
            </div>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[180px] justify-start text-left font-normal glassmorphic">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-sm border" style={{ backgroundColor: selectedAccentHex }} />
                            <span>{selectedAccentHex.toUpperCase()}</span>
                             {isSaving['accentColor'] && <Loader2 className="h-4 w-4 animate-spin ml-auto"/>}
                        </div>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <div className="p-4">
                        <Input 
                            ref={colorInputRef}
                            type="color" 
                            value={selectedAccentHex} 
                            onChange={(e) => {
                              setSelectedAccentHex(e.target.value); // Immediate UI update
                              handlePreferenceChange('accentColor', e.target.value);
                            }}
                            className="w-full h-10 p-0 border-none cursor-pointer rounded-md"
                            aria-label="Accent color picker"
                        />
                         <p className="text-xs text-muted-foreground mt-2 text-center">Click the swatch to pick a color.</p>
                    </div>
                </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      <Card className="glassmorphic">
        <CardHeader>
            <CardTitle className="flex items-center"><Contrast className="mr-2 h-5 w-5 text-primary"/>Accessibility</CardTitle>
            <CardDescription>Adjust settings for better accessibility.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center">
                    <TextIcon className="h-5 w-5 mr-2 text-primary"/>
                    <div>
                        <Label htmlFor="font-size" className="text-base font-medium">Font Size</Label>
                        <p className="text-sm text-muted-foreground">Adjust the application's font size.</p>
                    </div>
                </div>
                 <div className="flex items-center gap-2">
                    {isSaving['fontSize'] && <Loader2 className="h-4 w-4 animate-spin"/>}
                    <Select 
                        value={fontSize} 
                        onValueChange={(value: FontSize) => {
                            setFontSize(value);
                            handlePreferenceChange('fontSize', value);
                        }}
                        disabled={isSaving['fontSize']}
                    >
                        <SelectTrigger className="w-[180px] glassmorphic">
                            <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="sm">Small</SelectItem>
                            <SelectItem value="default">Default</SelectItem>
                            <SelectItem value="lg">Large</SelectItem>
                        </SelectContent>
                    </Select>
                 </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4 hover:shadow-sm transition-shadow">
                 <div className="flex items-center">
                    <Contrast className="h-5 w-5 mr-2 text-primary"/>
                    <div>
                        <Label htmlFor="high-contrast" className="text-base font-medium">High Contrast Mode</Label>
                        <p className="text-sm text-muted-foreground">Increase text and element contrast.</p>
                    </div>
                </div>
                 <div className="flex items-center gap-2">
                    {isSaving['highContrast'] && <Loader2 className="h-4 w-4 animate-spin"/>}
                    <Switch 
                        id="high-contrast" 
                        checked={isHighContrast}
                        onCheckedChange={(checked) => {
                            setIsHighContrast(checked);
                            handlePreferenceChange('highContrast', checked);
                        }}
                        disabled={isSaving['highContrast']}
                    />
                </div>
            </div>
        </CardContent>
      </Card>

      <Card className="glassmorphic">
        <CardHeader>
          <CardTitle className="flex items-center"><Database className="mr-2 h-5 w-5 text-primary"/>Data Integrations</CardTitle>
          <CardDescription>Connect to external health platforms to sync your data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center">
               <GoogleIcon />
              <div>
                <Label htmlFor="google-health" className="text-base font-medium">Google Health Connect</Label>
                <p className="text-sm text-muted-foreground">
                  Sync your health metrics from Google Health. (Coming Soon)
                </p>
              </div>
            </div>
            <Button variant="outline" disabled>Connect</Button>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4 hover:shadow-sm transition-shadow">
             <div className="flex items-center">
                <Apple className="h-5 w-5 mr-2" />
              <div>
                <Label htmlFor="apple-health" className="text-base font-medium">Apple Health</Label>
                <p className="text-sm text-muted-foreground">
                  Sync your health metrics from Apple Health. (Coming Soon)
                </p>
              </div>
            </div>
            <Button variant="outline" disabled>Connect</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glassmorphic">
        <CardHeader>
          <CardTitle className="flex items-center"><Volume2 className="mr-2 h-5 w-5 text-primary"/>Notifications</CardTitle>
          <CardDescription>Manage your notification preferences. (Features Coming Soon)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4 hover:shadow-sm transition-shadow">
            <div>
              <Label htmlFor="email-notifications" className="text-base font-medium">Email Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive important updates and summaries via email.
              </p>
            </div>
            <Switch id="email-notifications" disabled />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4 hover:shadow-sm transition-shadow">
            <div>
              <Label htmlFor="push-notifications" className="text-base font-medium">Push Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Get real-time alerts for critical insights or reminders.
              </p>
            </div>
            <Switch id="push-notifications" disabled />
          </div>
        </CardContent>
      </Card>

      <Card className="glassmorphic">
        <CardHeader>
            <CardTitle className="flex items-center"><Database className="mr-2 h-5 w-5 text-primary"/>Data Management</CardTitle> 
            <CardDescription>Manage your application data. (Features Coming Soon)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center">
                    <Download className="h-5 w-5 mr-2 text-primary"/>
                    <div>
                        <Label className="text-base font-medium">Export My Data</Label>
                        <p className="text-sm text-muted-foreground">Download all your health data and summaries.</p>
                    </div>
                </div>
                <Button variant="outline" disabled>Export</Button>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center">
                    <Trash2 className="h-5 w-5 mr-2 text-destructive"/>
                    <div>
                        <Label className="text-base font-medium">Clear Local Cache</Label>
                        <p className="text-sm text-muted-foreground">Remove locally stored chat history and document summaries.</p>
                    </div>
                </div>
                <Button variant="outline" disabled className="text-destructive border-destructive hover:bg-destructive/10 hover:text-destructive">Clear Cache</Button>
            </div>
        </CardContent>
      </Card>

      <Card className="glassmorphic">
        <CardHeader>
          <CardTitle className="flex items-center"><UserIconProfile className="mr-2 h-5 w-5 text-primary"/>Account</CardTitle> 
          <CardDescription>Manage your account settings. (Features Coming Soon)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="flex items-center justify-between rounded-lg border p-4 hover:shadow-sm transition-shadow">
            <div>
              <Label className="text-base font-medium">Change Password</Label>
              <p className="text-sm text-muted-foreground">
                Update your account password regularly for security.
              </p>
            </div>
            <Button variant="outline" disabled>Change Password</Button>
          </div>
           <div className="flex items-center justify-between rounded-lg border p-4 hover:shadow-sm transition-shadow">
            <div>
              <Label className="text-base font-medium">Delete Account</Label>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all associated data.
              </p>
            </div>
            <Button variant="destructive" disabled>Delete Account</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
