
'use client';
import { Sidebar } from "@/components/sidebar";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRouter } from 'next/navigation';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const router = useRouter();

  // Disable prefetching for all links within this layout
  if (typeof window !== 'undefined') {
    (router as any).prefetch = async () => {};
  }

  return (
    <div className="flex flex-1 w-full p-2 sm:p-4 gap-4 overflow-hidden">
      {!isMobile && <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />}
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
