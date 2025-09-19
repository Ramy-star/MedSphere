import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Header } from '@/components/header';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MedicalStudyHub',
  description: 'A modern platform for medical study materials.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gradient-to-br from-[#0A1024] to-[#1C162E] min-h-screen`}>
        <Header />
        <main>{children}</main>
        <Toaster />
      </body>
    </html>
  );
}
