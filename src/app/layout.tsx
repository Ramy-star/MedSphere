'use client';

import type { Metadata } from "next";
import { Nunito_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Header } from "@/components/header";
import { useState } from "react";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { getFirebaseConfig } from "@/firebase/config";

const nunitoSans = Nunito_Sans({ subsets: ["latin"] });

// Metadata object can't be used in a client component.
// We can move it to a layout file on the server if needed.
// export const metadata: Metadata = {
//   title: "Medical Study Organizer",
//   description: "Organize your medical education journey",
// };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const firebaseConfig = getFirebaseConfig();

  return (
    <html lang="en" className="dark h-full">
      <head>
          <title>Medical Study Organizer</title>
          <meta name="description" content="Organize your medical education journey" />
          <link rel="icon" href="/logo.svg" type="image/svg+xml" sizes="any" />
      </head>
      <body className={`${nunitoSans.className} h-full`}>
        <FirebaseClientProvider config={firebaseConfig}>
          <div className="flex flex-col h-full w-full">
            <Header onMenuClick={() => setSidebarOpen(true)} />
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
