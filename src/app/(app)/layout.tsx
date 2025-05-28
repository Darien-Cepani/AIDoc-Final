
"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, MessageCircle, FileUp, User, Settings as SettingsIcon, LogOut,
  HeartPulse, HelpCircle, History, PlusCircle, Menu
} from 'lucide-react';

import {
  SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar, SidebarSectionTitle
} from '@/components/ui/sidebar'; 
import { Sheet as RadixSheet, SheetTrigger as RadixSheetTrigger, SheetContent as RadixSheetContentPrimitive } from '@/components/ui/sheet'; 
import { AppHeader } from '@/components/layout/AppHeader';
import { Logo } from '@/components/layout/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { OnboardingFormContent } from '@/app/(app)/onboarding/page'; 
import { TooltipProvider } from '@/components/ui/tooltip';
import { SidebarHealthInsight } from '@/components/layout/SidebarHealthInsight';
import { Button } from '@/components/ui/button';


const mainNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/chat', label: 'AI Health Chat', icon: MessageCircle },
  { href: '/documents', label: 'Documents', icon: FileUp },
];

const userNavItems = [
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/settings', label: 'Settings', icon: SettingsIcon },
];

const bottomNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
  { href: '/documents', label: 'Docs', icon: FileUp },
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/settings', label: 'Settings', icon: SettingsIcon }, 
];


function BottomNavigationBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] border-t bg-background/95 backdrop-blur-lg md:hidden">
      <div className="grid h-16 grid-cols-5 items-center justify-around"> 
        {bottomNavItems.map((item) => (
          <Link key={item.href} href={item.href} legacyBehavior passHref>
            <a className={cn(
              "flex flex-col items-center justify-center gap-0.5 p-2 rounded-md transition-colors h-full",
              (pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href)))
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground"
            )}>
              <item.icon className="h-5 w-5" />
              <span className="text-[0.7rem] truncate">{item.label}</span>
            </a>
          </Link>
        ))}
      </div>
    </nav>
  );
}

function SidebarNavStructure() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { visualState, isMobile, setMobileSheetOpen } = useSidebar();

  const handleLinkClick = () => {
    if (isMobile && setMobileSheetOpen) { 
      setMobileSheetOpen(false);
    }
  };
  
  const showText = visualState === "expanded";

  return (
    <>
      <SidebarHeader className="h-16 border-b border-border/70">
        <div className={cn("flex items-center w-full", showText ? "justify-start" : "justify-center")}>
          <Logo collapsed={!showText} />
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarSectionTitle>Main</SidebarSectionTitle>
        <SidebarMenu>
          {mainNavItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} legacyBehavior passHref>
                <SidebarMenuButton
                  isActive={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))}
                  tooltip={{ children: item.label, side: 'right', align: 'center' }}
                  onClick={handleLinkClick}
                >
                  <item.icon className="menu-button-icon" /> 
                  <span className="menu-button-text">{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        <SidebarSectionTitle>Account</SidebarSectionTitle>
        <SidebarMenu>
        {userNavItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} legacyBehavior passHref>
                <SidebarMenuButton
                  isActive={pathname.startsWith(item.href)}
                  tooltip={{ children: item.label, side: 'right', align: 'center' }}
                  onClick={handleLinkClick}
                >
                  <item.icon className="menu-button-icon" />
                  <span className="menu-button-text">{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        
        <div className={cn("mt-auto pt-4", !showText && "hidden")}>
          <SidebarHealthInsight className="mx-0" visualState={visualState} />
        </div>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => { logout(); handleLinkClick(); }}
              tooltip={{ children: "Logout", side: 'right', align: 'center' }}
              variant="destructive" 
            >
              <LogOut className="menu-button-icon"/>
              <span className="menu-button-text">Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}


function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, showOnboardingModal, setShowOnboardingModal, completeOnboarding } = useAuth();
  const { isMobile, visualState: sidebarVisualState, isMobileSheetOpen, setMobileSheetOpen } = useSidebar(); 
  const pathname = usePathname();

  return (
    <>
      {isMobile ? (
          <RadixSheet open={isMobileSheetOpen} onOpenChange={setMobileSheetOpen}>
            <RadixSheetContentPrimitive side="left" className="p-0 w-[var(--sidebar-width-mobile)] sidebar-component glassmorphic flex flex-col z-[120]">
                <SidebarNavStructure />
            </RadixSheetContentPrimitive>
          </RadixSheet>
      ) : (
        <Sidebar>
          <SidebarNavStructure />
        </Sidebar>
      )}

      <div 
        className={cn(
            "relative flex min-h-screen flex-1 flex-col bg-background transition-[margin-left] ease-in-out",
            "duration-300"
          )}
        style={{ marginLeft: isMobile ? '0px' : (sidebarVisualState === "expanded" ? "var(--sidebar-width-expanded)" : "var(--sidebar-width-collapsed)") }}
      >
        <AppHeader />
        <main className={cn(
            "flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar", 
            (pathname.startsWith('/chat')) ? "p-0" : "p-4 md:p-6 lg:p-8", 
            (isMobile && !pathname.startsWith('/chat')) && "pb-20" 
          )}>
          {children}
        </main>
      </div>
      
      {isMobile && !pathname.startsWith('/chat') && <BottomNavigationBar />}

      <Dialog open={showOnboardingModal && !user?.onboardingComplete} onOpenChange={(open) => { if (!open && !user?.onboardingComplete) { /* Keep modal open if onboarding not done */ } else {setShowOnboardingModal(open)} }}>
        <DialogContent 
            className="sm:max-w-lg glassmorphic shadow-2xl animate-fade-in dialog-content" 
            onInteractOutside={(e) => {
              const target = e.target as HTMLElement;
              if (target.closest('[data-radix-select-content]') || target.closest('.rdp')) { 
                return;
              }
              if(!user?.onboardingComplete) {
                e.preventDefault();
              }
            }}
        >
          <OnboardingFormContent onComplete={() => { completeOnboarding(); setShowOnboardingModal(false); }} />
        </DialogContent>
      </Dialog>
    </>
  );
}


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading: authLoading, user, setShowOnboardingModal } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!authLoading && !isAuthenticated && pathname !== '/login' && pathname !== '/signup') {
      router.push('/login');
    } else if (isAuthenticated && user && !user.onboardingComplete && pathname !== '/onboarding' && !['/login', '/signup'].includes(pathname)) {
      setShowOnboardingModal(true); 
    }
  }, [isAuthenticated, authLoading, router, pathname, user, setShowOnboardingModal]);


  if (authLoading) {
    return ( 
      <div className="flex h-screen items-center justify-center bg-background"> 
        <Logo collapsed={false} /> 
      </div> 
    );
  }
  
  if (!isAuthenticated && !['/login', '/signup'].includes(pathname)) return null;
  
  return (
    <SidebarProvider defaultBehavior="auto"> 
      <TooltipProvider>
        <AppLayoutContent>{children}</AppLayoutContent>
      </TooltipProvider>
    </SidebarProvider>
  );
}
