
"use client" 

import { UserNav } from "@/components/layout/UserNav"
import { useSidebar, type SidebarBehavior } from "@/components/ui/sidebar" // Removed SidebarTrigger
import { useIsMobile } from "@/hooks/use-mobile"
import { usePathname } from "next/navigation"
import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { PanelLeftOpen, PanelRightOpen, ChevronsLeftRight, PanelLeftClose, Menu } from "lucide-react"
import { ThemeToggle } from "./ThemeToggle" 


// Helper to get page title from pathname
function getPageTitle(pathname: string): string {
  if (pathname.startsWith('/dashboard')) return 'Dashboard';
  if (pathname.startsWith('/chat')) return 'AI Health Chat';
  if (pathname.startsWith('/documents')) return 'Medical Documents';
  if (pathname.startsWith('/profile')) return 'User Profile';
  if (pathname.startsWith('/settings')) return 'Settings';
  if (pathname.startsWith('/onboarding')) return 'Onboarding';
  return 'AIDoc'; // Default title
}

function DesktopSidebarToggle() {
  const { desktopBehavior, setDesktopBehavior, setDesktopExplicitlyOpen, isMobile } = useSidebar();

  if (isMobile) return null; // Do not render on mobile

  const cycleSidebarBehavior = () => {
    setDesktopBehavior(prev => {
      const behaviors: SidebarBehavior[] = ["open", "icon", "auto"];
      const currentIndex = behaviors.indexOf(prev);
      const nextIndex = (currentIndex + 1) % behaviors.length;
      const newBehavior = behaviors[nextIndex];
      
      if (newBehavior === "open") setDesktopExplicitlyOpen(true);
      else if (newBehavior === "icon") setDesktopExplicitlyOpen(false);
      else setDesktopExplicitlyOpen(null); // For 'auto'
      
      return newBehavior;
    });
  };

  let BehaviorIcon = ChevronsLeftRight; 
  let behaviorTooltip = "Sidebar: Auto (Hover to expand)";

  if (desktopBehavior === "open") { 
    BehaviorIcon = PanelLeftClose; 
    behaviorTooltip = "Sidebar: Always Open (Click for Icon Only)"; 
  } else if (desktopBehavior === "icon") { 
    BehaviorIcon = PanelRightOpen; 
    behaviorTooltip = "Sidebar: Icon Only (Click for Auto Hover)"; 
  }
  
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={cycleSidebarBehavior} className="h-9 w-9 text-muted-foreground hover:text-foreground">
            <BehaviorIcon className="h-5 w-5"/>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center" className="tooltip-content"> {/* Use class for z-index */}
          <p>{behaviorTooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}


export function AppHeader() {
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const pageTitle = useMemo(() => getPageTitle(pathname), [pathname]);
  // const { setMobileSheetOpen } = useSidebar(); // No longer needed if mobile sheet is removed

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-background/75 px-4 backdrop-blur-lg md:px-6 glassmorphic-header">
      <DesktopSidebarToggle /> {/* This component now handles its mobile visibility internally */}
      {/* Mobile Sidebar Trigger (Hamburger Menu) is removed */}
      {/* {isMobile && (
         <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setMobileSheetOpen(true)}>
            <Menu className="h-5 w-5"/>
        </Button>
      )} */}
      <div className="flex-1">
        <h1 className="text-xl font-semibold tracking-tight">{pageTitle}</h1>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <UserNav />
      </div>
    </header>
  )
}
