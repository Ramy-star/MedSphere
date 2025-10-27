

'use client';

import type { Metadata } from "next";
import { Nunito_Sans, Ubuntu, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Header } from "@/components/header";
import { useState, useEffect } from "react";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { VerificationScreen } from "@/components/VerificationScreen";
import { useMobileViewStore } from "@/hooks/use-mobile-view-store";
import { cn } from "@/lib/utils";
import { useAuthStore } from '@/stores/auth-store';


const nunitoSans = Nunito_Sans({ 
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-nunito-sans',
});

const ubuntu = Ubuntu({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-ubuntu',
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const WELCOME_SCREEN_KEY = 'medsphere-has-visited';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [showWelcome, setShowWelcome] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const { isAuthenticated, checkAuth, loading } = useAuthStore();

  useEffect(() => {
    setIsClient(true);
    const hasVisited = localStorage.getItem(WELCOME_SCREEN_KEY);

    if (hasVisited) {
      setShowWelcome(false);
    }
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const setDynamicVh = () => {
      document.documentElement.style.setProperty('--1dvh', `${window.innerHeight}px`);
    };

    setDynamicVh();
    window.addEventListener('resize', setDynamicVh);
    return () => window.removeEventListener('resize', setDynamicVh);
  }, []);

  const handleGetStarted = () => {
    localStorage.setItem(WELCOME_SCREEN_KEY, 'true');
    setShowWelcome(false);
  };

  if (!isClient) {
    return (
        <html lang="en" className="dark h-full">
            <body className={`${nunitoSans.variable} ${ubuntu.variable} ${inter.variable} font-sans h-full bg-background`}></body>
        </html>
    );
  }

  if (showWelcome) {
    return (
        <html lang="en" className="dark h-full">
            <head>
                <title>Welcome to MedSphere</title>
                <meta name="description" content="Organize your medical education journey" />
                <link rel="icon" href="/logo.svg" type="image/svg+xml" sizes="any" />
                <meta name="viewport" content="width=device-width, initial-scale=1, interactive-widget=resizes-content" />
                <link rel="manifest" href="/manifest.json" />
                <meta name="theme-color" content="#0B0F12" />
                <link rel="apple-touch-icon" href="/logo.svg" />
            </head>
            <body className={`${nunitoSans.variable} ${ubuntu.variable} ${inter.variable} font-sans h-full`}>
                 <WelcomeScreen onGetStarted={handleGetStarted} />
            </body>
        </html>
    );
  }

  if (loading) {
    // You can return a global loading spinner here if desired
    return (
       <html lang="en" className="dark h-full">
            <body className={`${nunitoSans.variable} ${ubuntu.variable} ${inter.variable} font-sans h-full bg-background`}></body>
        </html>
    )
  }

  if (!isAuthenticated) {
     return (
        <html lang="en" className="dark h-full">
            <head>
                <title>Verification - MedSphere</title>
                <meta name="description" content="Student ID Verification" />
                <link rel="icon" href="/logo.svg" type="image/svg+xml" sizes="any" />
            </head>
            <body className={`${nunitoSans.variable} ${ubuntu.variable} ${inter.variable} font-sans h-full`}>
                 <VerificationScreen onVerified={() => checkAuth()} />
            </body>
        </html>
    );
  }

  return (
    <html lang="en" className="dark h-full">
      <head>
          <title>MedSphere</title>
          <meta name="description" content="Organize your medical education journey" />
          <link rel="icon" href="/logo.svg" type="image/svg+xml" sizes="any" />
          <meta name="viewport" content="width=device-width, initial-scale=1, interactive-widget=resizes-content" />
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#0B0F12" />
          <link rel="apple-touch-icon" href="/logo.svg" />
          <link rel="preconnect" href="https://res.cloudinary.com" />
      </head>
      <body className={`${nunitoSans.variable} ${ubuntu.variable} ${inter.variable} font-sans h-full`}>
            <div className="flex flex-col h-full w-full">
              <header className="z-50 w-full">
                <Header />
              </header>
              <main className="flex flex-1 w-full overflow-hidden">
                {children}
              </main>
            </div>
            <Toaster />
      </body>
    </html>
  );
}
