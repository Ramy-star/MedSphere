'use client';
import { Sidebar } from "@/components/sidebar";
import { useSidebarStore } from "@/hooks/use-sidebar-store";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Separator } from "@/components/ui/separator";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isMobileSidebarOpen, setMobileSidebarOpen } = useSidebarStore();
  const isMobile = useIsMobile();

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
        className="flex-1 p-4 md:p-6 glass-card flex flex-col h-full overflow-hidden"
      >
        <div className="flex-shrink-0 min-h-[56px] flex flex-col justify-center">
            <Breadcrumbs />
        </div>
        <Separator className="my-4" />
        <div className="flex-1 flex flex-col overflow-hidden">
          {children}
        </div>
      </motion.main>
    </div>
  );
}
