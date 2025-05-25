
"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Menu } from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Button, type ButtonProps } from "@/components/ui/button"
import { Sheet as RadixSheet, SheetTrigger as RadixSheetTriggerPrimitive, SheetContent as RadixSheetContentPrimitive } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"


export const SIDEBAR_BEHAVIOR_COOKIE_NAME = "aidoc_sidebar_behavior";
export const SIDEBAR_WIDTH_EXPANDED = "18rem"
export const SIDEBAR_WIDTH_COLLAPSED = "4.5rem"
export const SIDEBAR_WIDTH_MOBILE = "19rem"
export const SIDEBAR_TRANSITION_DURATION = "duration-300";


export type SidebarBehavior = "open" | "icon" | "auto";

interface SidebarContextType {
  isMobile: boolean;
  desktopBehavior: SidebarBehavior;
  setDesktopBehavior: React.Dispatch<React.SetStateAction<SidebarBehavior>>;
  isDesktopHovering: boolean;
  setDesktopHovering: React.Dispatch<React.SetStateAction<boolean>>;
  isMobileSheetOpen: boolean;
  setMobileSheetOpen: React.Dispatch<React.SetStateAction<boolean>>;
  desktopExplicitlyOpen: boolean | null;
  setDesktopExplicitlyOpen: React.Dispatch<React.SetStateAction<boolean | null>>;
  visualState: "expanded" | "collapsed";
  minimizeSidebar: () => void;
}

const SidebarContext = React.createContext<SidebarContextType | null>(null);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }
  return context;
}

export const RadixSheetContent = RadixSheetContentPrimitive;
export const RadixSheetTrigger = RadixSheetTriggerPrimitive;

interface SidebarProviderProps {
  children: React.ReactNode;
  defaultBehavior?: SidebarBehavior;
  style?: React.CSSProperties;
  className?: string;
}

export const SidebarProvider = React.forwardRef<HTMLDivElement, SidebarProviderProps>(
  ({ children, defaultBehavior = "auto", style, className, ...props }, ref) => {
    const isMobileHook = useIsMobile();
    const [isMobile, setIsMobile] = React.useState(false);
    const [isMobileSheetOpen, setMobileSheetOpen] = React.useState(false);
    const [isDesktopHovering, setDesktopHovering] = React.useState(false);
    const [desktopExplicitlyOpen, setDesktopExplicitlyOpen] = React.useState<boolean | null>(null);

    const [desktopBehavior, setDesktopBehavior] = React.useState<SidebarBehavior>(() => {
      if (typeof window !== "undefined") {
        const storedBehavior = localStorage.getItem(SIDEBAR_BEHAVIOR_COOKIE_NAME) as SidebarBehavior | null;
        if (storedBehavior && ["open", "icon", "auto"].includes(storedBehavior)) {
          if (storedBehavior === 'open') setDesktopExplicitlyOpen(true);
          else if (storedBehavior === 'icon') setDesktopExplicitlyOpen(false);
          else setDesktopExplicitlyOpen(null);
          return storedBehavior;
        }
      }
      if (defaultBehavior === 'open') setDesktopExplicitlyOpen(true);
      else if (defaultBehavior === 'icon') setDesktopExplicitlyOpen(false);
      else setDesktopExplicitlyOpen(null);
      return defaultBehavior;
    });

    React.useEffect(() => {
        setIsMobile(isMobileHook);
         if (isMobileHook) {
            setMobileSheetOpen(false);
        }
    }, [isMobileHook]);

    React.useEffect(() => {
      if (typeof window !== "undefined") {
         localStorage.setItem(SIDEBAR_BEHAVIOR_COOKIE_NAME, desktopBehavior);
      }
      if (desktopBehavior === 'open') setDesktopExplicitlyOpen(true);
      else if (desktopBehavior === 'icon') setDesktopExplicitlyOpen(false);
      else setDesktopExplicitlyOpen(null);
    }, [desktopBehavior]);

    let visualState: "expanded" | "collapsed";
    if (isMobile) {
      visualState = "expanded";
    } else {
      if (desktopBehavior === "open") visualState = "expanded";
      else if (desktopBehavior === "icon") visualState = "collapsed";
      else {
        visualState = isDesktopHovering ? "expanded" : "collapsed";
      }
    }

    const minimizeSidebar = () => {
        setDesktopBehavior(currentBehavior => {
            const newBehavior = currentBehavior === 'open' ? 'icon' : 'open';
            if (newBehavior === 'open') setDesktopExplicitlyOpen(true);
            else if (newBehavior === 'icon') setDesktopExplicitlyOpen(false);
            return newBehavior;
        });
    };

    const contextValue: SidebarContextType = {
      isMobile,
      desktopBehavior, setDesktopBehavior,
      isDesktopHovering, setDesktopHovering,
      isMobileSheetOpen, setMobileSheetOpen,
      desktopExplicitlyOpen, setDesktopExplicitlyOpen,
      visualState,
      minimizeSidebar,
    };

    const wrapperStyles = {
        "--sidebar-width-expanded": SIDEBAR_WIDTH_EXPANDED,
        "--sidebar-width-collapsed": SIDEBAR_WIDTH_COLLAPSED,
        "--sidebar-width-mobile": SIDEBAR_WIDTH_MOBILE,
        "--sidebar-current-width": isMobile ? "0px" : (visualState === "expanded" ? "var(--sidebar-width-expanded)" : "var(--sidebar-width-collapsed)"),
        "--sidebar-current-width-for-inset-margin": isMobile ? "0px" :
          (desktopBehavior === "auto" && visualState === "expanded" && isDesktopHovering) ? "var(--sidebar-width-collapsed)" :
          (visualState === "expanded" ? "var(--sidebar-width-expanded)" : "var(--sidebar-width-collapsed)"),
        ...style,
      } as React.CSSProperties;

    const content = (
      <div
        ref={ref}
        style={wrapperStyles}
        className={cn("group-sidebar-wrapper flex min-h-screen w-full", className)}
        data-sidebar-behavior={desktopBehavior}
        data-sidebar-visual-state={visualState}
        {...props}
      >
        {children}
      </div>
    );

    return (
      <SidebarContext.Provider value={contextValue}>
        {isMobile ? (
          <RadixSheet open={isMobileSheetOpen} onOpenChange={setMobileSheetOpen}>
            {children}
          </RadixSheet>
        ) : (
          content
        )}
      </SidebarContext.Provider>
    );
  }
);
SidebarProvider.displayName = "SidebarProvider";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: "left" | "right";
}

export const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ side = "left", className, children, style, onMouseEnter, onMouseLeave, ...props }, ref) => {
    const { visualState, desktopBehavior, setDesktopHovering, isMobile, isDesktopHovering } = useSidebar();

    if (isMobile) return null;

    const handleMouseEnter: React.MouseEventHandler<HTMLDivElement> = (e) => {
      if (desktopBehavior === "auto") setDesktopHovering(true);
      onMouseEnter?.(e);
    };
    const handleMouseLeave: React.MouseEventHandler<HTMLDivElement> = (e) => {
      if (desktopBehavior === "auto") setDesktopHovering(false);
      onMouseLeave?.(e);
    };

    const currentWidth = visualState === "expanded" ? "var(--sidebar-width-expanded)" : "var(--sidebar-width-collapsed)";
    const isFloating = desktopBehavior === 'auto' && isDesktopHovering && visualState === 'expanded';

    return (
      <aside
        ref={ref}
        className={cn(
          "sidebar-component hidden md:flex",
          "bg-sidebar text-sidebar-foreground",
          "glassmorphic-sidebar",
          side === "left" ? "left-0" : "right-0",
          isFloating && "floating-sidebar shadow-2xl z-[100]", // Increased z-index to ensure it's above header
          className
        )}
        style={{ width: currentWidth, ...style }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        data-visual-state={visualState}
        data-behavior={desktopBehavior}
        {...props}
      >
        {children}
      </aside>
    );
  }
);
Sidebar.displayName = "Sidebar";


export const SidebarTrigger = React.forwardRef<
  React.ElementRef<typeof RadixSheetTriggerPrimitive>,
  React.ComponentProps<typeof RadixSheetTriggerPrimitive>
>(({ className, children, ...props }, ref) => {
  const { isMobile, setMobileSheetOpen, isMobileSheetOpen } = useSidebar(); // Added isMobileSheetOpen to control
  if (!isMobile) return null;

  return (
    <RadixSheetTriggerPrimitive // Directly use RadixSheetTriggerPrimitive
      ref={ref}
      className={cn(className)}
      onClick={() => setMobileSheetOpen(!isMobileSheetOpen)} // Toggle open state
      asChild={!!children}
      {...props}
    >
      {children || <Button variant="ghost" size="icon" className="text-foreground"><Menu className="h-5 w-5"/></Button>}
    </RadixSheetTriggerPrimitive>
  );
});
SidebarTrigger.displayName = "MobileSidebarTrigger"; // Renamed to avoid conflict


export const SidebarInset = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, style, ...props }, ref) => {
    const { desktopBehavior, visualState, isMobile, isDesktopHovering } = useSidebar();

    let marginLeftValue;
    if (isMobile) {
      marginLeftValue = "0px";
    } else if (desktopBehavior === "auto" && visualState === 'expanded' && isDesktopHovering) {
      marginLeftValue = "var(--sidebar-width-collapsed)";
    } else {
      marginLeftValue = visualState === "expanded" ? "var(--sidebar-width-expanded)" : "var(--sidebar-width-collapsed)";
    }

    return (
      <main
        ref={ref}
        className={cn(
            "relative flex min-h-screen flex-1 flex-col bg-background",
            SIDEBAR_TRANSITION_DURATION,
            "ease-in-out",
            className
        )}
        style={{ marginLeft: marginLeftValue, ...style }}
        {...props}
      />
    );
  }
);
SidebarInset.displayName = "SidebarInset";

export const SidebarHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { visualState } = useSidebar();
    return (
      <div
        ref={ref}
        className={cn(
          "sidebar-header-component",
          visualState === "collapsed" && "sidebar-header-component-collapsed",
          className
        )}
        {...props}
      />
    );
  }
);
SidebarHeader.displayName = "SidebarHeader";

export const SidebarContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { visualState } = useSidebar();
    return (
      <div
        ref={ref}
        className={cn(
          "sidebar-content-component",
          visualState === "collapsed" && "sidebar-content-component-collapsed",
          className
        )}
        {...props}
      />
    );
  }
);
SidebarContent.displayName = "SidebarContent";

export const SidebarFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
     const { visualState } = useSidebar();
    return (
      <div ref={ref} className={cn(
        "sidebar-footer-component",
        visualState === "collapsed" && "sidebar-footer-component-collapsed",
        className
        )} {...props} />
    )
  }
);
SidebarFooter.displayName = "SidebarFooter";

export const SidebarSectionTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => {
    const { visualState } = useSidebar();
    return (
      <p
        ref={ref}
        className={cn(
          "sidebar-section-title-component",
          visualState === "collapsed" && "sidebar-section-title-component-collapsed",
          className
        )}
        {...props}
      >
        {children}
      </p>
    );
  }
);
SidebarSectionTitle.displayName = "SidebarSectionTitle";

export const SidebarMenu = React.forwardRef<HTMLUListElement, React.HTMLAttributes<HTMLUListElement>>(
  ({ className, ...props }, ref) => (
    <ul ref={ref} className={cn("flex w-full min-w-0 flex-col gap-1.5", className)} {...props} />
  )
);
SidebarMenu.displayName = "SidebarMenu";

export const SidebarMenuItem = React.forwardRef<HTMLLIElement, React.HTMLAttributes<HTMLLIElement>>(
  ({ className, ...props }, ref) => (
    <li ref={ref} className={cn("group/menu-item relative w-full", className)} {...props} />
  )
);
SidebarMenuItem.displayName = "SidebarMenuItem";

const sidebarMenuButtonVariants = cva(
  "sidebar-menu-item-component",
  {
    variants: {
      variant: {
        default: "sidebar-menu-item-default",
        active: "sidebar-menu-item-active",
        destructive: "sidebar-menu-item-destructive",
      },
      size: {
        default: "",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

interface SidebarMenuButtonProps extends ButtonProps, VariantProps<typeof sidebarMenuButtonVariants> {
  isActive?: boolean;
  tooltip?: React.ReactNode | Omit<React.ComponentProps<typeof TooltipContent>, "children">;
}

export const SidebarMenuButton = React.forwardRef<HTMLButtonElement, SidebarMenuButtonProps>(
  ({ asChild = false, isActive = false, variant, size, tooltip, className, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const { visualState, isMobile } = useSidebar();
    const isCollapsed = visualState === "collapsed" && !isMobile;

    const childrenArray = React.Children.toArray(children);

    const iconElement = childrenArray.find(child =>
      React.isValidElement(child) &&
      typeof child.type !== 'string' &&
      (child.props as any)?.className?.includes('menu-button-icon')
    );

    const textChildren = childrenArray.filter(child =>
      !React.isValidElement(child) ||
      typeof child === 'string' ||
      (React.isValidElement(child) && (child.props as any)?.className?.includes('menu-button-text'))
    );

    const buttonContent = (
      <Comp
        ref={ref}
        data-sidebar="menu-button"
        data-active={isActive ? "true" : undefined}
        data-variant={variant || "default"}
        className={cn(
          sidebarMenuButtonVariants({ variant: isActive ? "active" : variant, size, className }),
          isCollapsed && "sidebar-menu-item-component-collapsed"
        )}
        {...props}
      >
        {iconElement}
         <span className={cn(
            "menu-button-text",
            isCollapsed && "sidebar-collapsed-text"
          )}>
            {textChildren}
          </span>
      </Comp>
    );

    const showTooltip = tooltip && isCollapsed && !isMobile;

    if (!showTooltip) return buttonContent;

    const tooltipContentProps = typeof tooltip === "string" ? { children: <p>{tooltip}</p> }
                             : React.isValidElement(tooltip) ? { children: tooltip }
                             : tooltip as Omit<React.ComponentProps<typeof TooltipContent>, "children">;

    return (
      <TooltipProvider delayDuration={50}>
        <Tooltip>
          <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
          <TooltipContent side="right" align="center" {...tooltipContentProps} className="z-[101] bg-popover text-popover-foreground rounded-md shadow-lg" />
        </Tooltip>
      </TooltipProvider>
    );
  }
);
SidebarMenuButton.displayName = "SidebarMenuButton";

