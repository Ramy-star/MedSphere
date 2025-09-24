import type { Metadata } from "next";
import { Nunito_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Header } from "@/components/header";

const nunitoSans = Nunito_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Medical Study Organizer",
  description: "Organize your medical education journey",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <body className={`${nunitoSans.className} h-full`}>
        <div className="flex flex-col h-full w-full">
          <Header />
          <main className="flex flex-1 w-full overflow-hidden">
            {children}
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
