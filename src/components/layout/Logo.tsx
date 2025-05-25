
import { HeartPulse } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link href="/dashboard" className={cn(
      "flex items-center gap-2.5 text-primary transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar-background rounded-md",
      collapsed ? "justify-center w-full py-2.5" : "px-0 py-1.5" 
    )}>
      <HeartPulse 
        className={cn(
          "shrink-0 transition-transform duration-300 ease-out", 
          collapsed ? "h-7 w-7" : "h-6 w-6"
        )} 
      />
      {!collapsed && <span className="text-xl font-bold tracking-tight">AIDoc</span>}
    </Link>
  );
}
