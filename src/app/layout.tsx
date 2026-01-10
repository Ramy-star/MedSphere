'use client';
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { getFirebaseConfig } from "@/firebase/config";
import { AchievementToast } from "@/components/AchievementToast";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { useAuthStore } from "@/stores/auth-store";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { Nunito_Sans, Ubuntu, Inter } from "next/font/google";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
    const [isClient, setIsClient] = useState(false);
    const firebaseConfig = getFirebaseConfig();
    const newlyEarnedAchievement = useAuthStore(state => state.newlyEarnedAchievement);

    useEffect(() => {
        setIsClient(true);
        const setDynamicVh = () => {
            if (typeof window !== 'undefined') {
                document.documentElement.style.setProperty('--1dvh', `${window.innerHeight}px`);
            }
        };

        setDynamicVh();
        window.addEventListener('resize', setDynamicVh);
        return () => window.removeEventListener('resize', setDynamicVh);
    }, []);

    const bodyClassName = `${nunitoSans.variable} ${ubuntu.variable} ${inter.variable} font-sans h-full bg-background overflow-hidden`;

    if (!isClient) {
        return (
            <html lang="en" className="dark h-full">
                <body className={bodyClassName}>
                     <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
                        <div className="flex flex-col items-center gap-4">
                            <Logo className="h-16 w-16 animate-pulse" />
                        </div>
                    </div>
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
            <body className={bodyClassName}>
                <FirebaseClientProvider config={firebaseConfig}>
                    <div className="flex flex-col h-full w-full">
                        <OfflineIndicator />
                        <div className="flex-1 flex flex-col min-h-0">
                            {children}
                        </div>
                        {newlyEarnedAchievement && <AchievementToast achievement={newlyEarnedAchievement} />}
                    </div>
                    <Toaster />
                </FirebaseClientProvider>
            </body>
        </html>
    );
}
