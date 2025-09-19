import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

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
      <body className={`${inter.className} bg-[#111921] font-display text-white`} style={{
          backgroundImage: 'radial-gradient(at 27% 37%, hsla(215, 98%, 61%, 0.1) 0px, transparent 50%), radial-gradient(at 97% 21%, hsla(125, 98%, 72%, 0.1) 0px, transparent 50%), radial-gradient(at 52% 99%, hsla(355, 98%, 61%, 0.1) 0px, transparent 50%), radial-gradient(at 10% 29%, hsla(256, 96%, 61%, 0.1) 0px, transparent 50%), radial-gradient(at 97% 96%, hsla(38, 60%, 74%, 0.1) 0px, transparent 50%), radial-gradient(at 33% 50%, hsla(222, 67%, 73%, 0.1) 0px, transparent 50%), radial-gradient(at 79% 53%, hsla(343, 68%, 79%, 0.1) 0px, transparent 50%)'
        }}>
        <div className="flex h-screen w-full overflow-hidden">
          {children}
        </div>
        <Toaster />
      </body>
    </html>
  );
}
