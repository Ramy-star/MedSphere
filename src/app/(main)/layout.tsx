'use client';
import { Sidebar } from "@/components/sidebar";
import { useSidebarStore } from "@/hooks/use-sidebar-store";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";


export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isMobileSidebarOpen, setMobileSidebarOpen } = useSidebarStore();
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const isHomePage = pathname === '/';

  return (
    <div className="flex flex-1 w-full p-2 sm:p-4 gap-4 overflow-hidden">
      <Sidebar 
        open={isMobile ? isMobileSidebarOpen : undefined} 
        setOpen={isMobile ? setMobileSidebarOpen : undefined} 
      />
      <motion.main
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={cn(
          "flex-1 flex flex-col h-full overflow-hidden p-4 md:p-6",
          !isHomePage && "glass-card"
        )}
      >
        <div className="flex-shrink-0 min-h-[56px] flex flex-col">
            <Breadcrumbs />
        </div>
        
        <div className={cn("flex-1 flex flex-col overflow-hidden", !isHomePage && "mt-4")}>
          {children}
        </div>
      </motion.main>
    </div>
  );
}
