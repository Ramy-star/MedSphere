
'use client';
import { Sidebar } from "@/components/sidebar";
import { useSidebarStore } from "@/hooks/use-sidebar-store";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useAuthStore } from "@/stores/auth-store";


export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isMobileSidebarOpen, setMobileSidebarOpen } = useSidebarStore();
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const { user } = useAuthStore();
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
          "flex-1 flex flex-col h-full overflow-hidden relative",
          !isHomePage && "glass-card px-2 sm:px-6 py-4 md:py-6"
        )}
      >
        {isProfilePage && user?.metadata?.coverPhotoURL && (
            <div className="absolute inset-x-0 top-0 h-48 sm:h-64 z-0">
                <Image
                    src={user.metadata.coverPhotoURL}
                    alt="Cover photo"
                    fill
                    objectFit="cover"
                    className="pointer-events-none select-none"
                    priority
                />
                <div className="absolute inset-0 bg-black/40"></div>
            </div>
        )}

        <div className={cn(
          "flex-shrink-0 flex flex-col min-h-[48px] relative z-10",
          isHomePage && "px-2 sm:px-6 pt-4 md:pt-6" // Apply consistent padding on homepage
        )}>
            <Breadcrumbs />
        </div>
        
        <div className={cn(
          "flex-1 flex flex-col overflow-y-auto no-scrollbar relative z-10", 
          isHomePage && "pt-0", 
          !isQuestionsCreatorPage && !isHomePage && "pt-4"
        )}>
          {children}
        </div>
      </motion.main>
    </div>
  );
}
