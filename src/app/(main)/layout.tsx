
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
  const isQuestionsCreatorPage = pathname.startsWith('/questions-creator');
  const isProfilePage = pathname === '/profile';


  return (
    <div className="flex flex-1 w-full p-2 sm:p-4 gap-4 overflow-hidden">
      <Sidebar 
        open={isMobile ? isMobileSidebarOpen : undefined} 
        setOpen={isMobile ? setMobileSidebarOpen : undefined} 
      />
      <motion.main
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={cn(
          "flex-1 flex flex-col h-full overflow-hidden px-2 sm:px-6 py-4 md:py-6",
          !isHomePage && !isProfilePage && "glass-card",
           isProfilePage && "px-0 sm:px-0"
        )}
      >
        <div className={cn(
          "flex-shrink-0 flex flex-col min-h-[48px]",
           "px-2 sm:px-6 md:px-6",
          isProfilePage && "-mx-6 -mt-6" // Remove padding for full-width cover
        )}>
            {!isProfilePage && <Breadcrumbs />}
        </div>
        
        <div className={cn(
          "flex-1 flex flex-col overflow-y-auto no-scrollbar", 
          isHomePage && "pt-0", 
          !isQuestionsCreatorPage && !isHomePage && "pt-4",
          isProfilePage && "pt-0"
        )}>
          {children}
        </div>
      </motion.main>
    </div>
  );
}
