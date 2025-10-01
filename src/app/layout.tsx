
'use client';

import type { Metadata } from "next";
import { Nunito_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Header } from "@/components/header";
import { useState, useEffect } from "react";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { getFirebaseConfig } from "@/firebase/config";
import { WelcomeScreen } from "@/components/WelcomeScreen";


const nunitoSans = Nunito_Sans({ subsets: ["latin"] });

const WELCOME_SCREEN_KEY = 'medsphere-has-visited';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const firebaseConfig = getFirebaseConfig();
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    // Check localStorage only on the client side
    const hasVisited = localStorage.getItem(WELCOME_SCREEN_KEY);
    if (hasVisited) {
      setShowWelcome(false);
    }
  }, []);

  const handleGetStarted = () => {
    localStorage.setItem(WELCOME_SCREEN_KEY, 'true');
    setShowWelcome(false);
  };

  if (showWelcome) {
    return (
        <html lang="en" className="dark h-full">
            <head>
                <title>Welcome to MedSphere</title>
                <meta name="description" content="Organize your medical education journey" />
                <link rel="icon" href="/logo.svg" type="image/svg+xml" sizes="any" />
                <link rel="manifest" href="/manifest.json" />
                <meta name="theme-color" content="#0B0F12" />
                <link rel="apple-touch-icon" href="/icon-192.png" />
            </head>
            <body className={`${nunitoSans.className} h-full`}>
                 <WelcomeScreen onGetStarted={handleGetStarted} />
            </body>
        </html>
    );
  }

  return (
    <html lang="en" className="dark h-full">
      <head>
          <title>Medical Study Organizer</title>
          <meta name="description" content="Organize your medical education journey" />
          <link rel="icon" href="/logo.svg" type="image/svg+xml" sizes="any" />
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#0B0F12" />
          <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className={`${nunitoSans.className} h-full`}>
        <FirebaseClientProvider config={firebaseConfig}>
          <div className="flex flex-col h-full w-full">
            <Header />
            <main className="flex flex-1 w-full overflow-hidden">
              {children}
            </main>
          </div>
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
