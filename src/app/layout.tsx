
'use client';

import type { Metadata } from "next";
import { Nunito_Sans, Ubuntu, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Header } from "@/components/header";
import { useState, useEffect } from "react";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { VerificationScreen } from "@/components/VerificationScreen";
import { CreateSecretCodeScreen } from "@/components/CreateSecretCodeScreen";
import { useMobileViewStore } from "@/hooks/use-mobile-view-store";
import { cn } from "@/lib/utils";
import { useAuthStore } from '@/stores/auth-store';
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { getFirebaseConfig } from "@/firebase/config";
import { AchievementToast } from "@/components/AchievementToast";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/logo";


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
  const { authState, user, newlyEarnedAchievement, checkAuth } = useAuthStore();
  const firebaseConfig = getFirebaseConfig();

  useEffect(() => {
    setIsClient(true);
    const hasVisited = localStorage.getItem(WELCOME_SCREEN_KEY);

    if (hasVisited) {
      setShowWelcome(false);
    }
  }, []);
  
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
  
  const renderContent = () => {
    switch (authState) {
        case 'loading':
            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
                    <div className="flex flex-col items-center gap-4">
                        <Logo className="h-16 w-16 animate-pulse" />
                        <p className="text-slate-400">Connecting to MedSphere...</p>
                    </div>
                </div>
            );
        case 'anonymous':
        case 'awaiting_secret_creation':
            return <VerificationScreen />;
        case 'authenticated':
            if (user?.isBlocked) {
              return (
                <div className="flex h-full w-full items-center justify-center bg-background p-4">
                  <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-500">Account Blocked</h1>
                    <p className="text-slate-400 mt-2">
                      Your account has been blocked. Please contact an administrator.
                    </p>
                  </div>
                </div>
              );
            }
            // This is the key fix: Render the children directly, which will be the main authenticated layout.
            return children;
        default:
             return <VerificationScreen />;
    }
  };

  if (!isClient) {
    return (
        <html lang="en" className="dark h-full">
            <body className={`${nunitoSans.variable} ${ubuntu.variable} ${inter.variable} font-sans h-full bg-background overflow-hidden`}></body>
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
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, interactive-widget=resizes-content" />
                <link rel="manifest" href="/manifest.json" />
                <meta name="theme-color" content="#0B0F12" />
                <link rel="apple-touch-icon" href="/logo.svg" />
            </head>
            <body className={`${nunitoSans.variable} ${ubuntu.variable} ${inter.variable} font-sans h-full bg-background overflow-hidden`}>
                 <WelcomeScreen onGetStarted={handleGetStarted} />
                 <footer className="absolute bottom-4 text-center text-xs text-slate-500 z-10 w-full">
                    © 2025 MedSphere. All rights reserved.
                </footer>
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
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, interactive-widget=resizes-content" />
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#0B0F12" />
          <link rel="apple-touch-icon" href="/logo.svg" />
          <link rel="preconnect" href="https://res.cloudinary.com" />
      </head>
      <body className={`${nunitoSans.variable} ${ubuntu.variable} ${inter.variable} font-sans h-full bg-background overflow-hidden`}>
          <FirebaseClientProvider config={firebaseConfig}>
            <div className="flex flex-col h-full w-full">
                {renderContent()}
                 {authState !== 'authenticated' && authState !== 'loading' && (
                     <footer className="absolute bottom-4 text-center text-xs text-slate-500 z-10 w-full">
                        © 2025 MedSphere. All rights reserved.
                    </footer>
                )}
            </div>
            <Toaster />
            {newlyEarnedAchievement && <AchievementToast achievement={newlyEarnedAchievement} />}
          </FirebaseClientProvider>
      </body>
    </html>
  );
}
