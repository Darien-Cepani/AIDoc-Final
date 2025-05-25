
"use client"; // Make root layout client component for AuthProvider

import type { Metadata } from 'next';
// import { Inter } from 'next/font/google'; // Using Inter as a fallback, Geist is specified via CSS variables
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/components/layout/ThemeProvider'; 
import { Geist, Geist_Mono } from 'next/font/google';
import { cn } from '@/lib/utils'; // Import cn utility

// const inter = Inter({ subsets: ['latin'], variable: '--font-sans' }); 

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>AIDoc - Your AI Health Companion</title>
        <meta name="description" content="Upload medical documents, get AI summaries, and chat about your health." />
      </head>
      <body 
        className={cn(
          geistSans.variable, 
          geistMono.variable, 
          "font-sans antialiased bg-background text-foreground" // Explicitly set bg-background and text-foreground
        )}
        suppressHydrationWarning={true}
      >
        <AuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
