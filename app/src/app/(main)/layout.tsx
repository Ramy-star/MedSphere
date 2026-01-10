
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
import { ImageIcon, Loader2 } from "lucide-react";
import { Header } from "@/components/header";
import { FloatingAssistant } from "@/components/profile/FloatingAssistant";
import { useEffect, useState, Suspense, lazy } from 'react';
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useFilePreviewStore } from '@/stores/file-preview-store';
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { VerificationScreen } from "@/components/VerificationScreen";
import { Logo } from "@/components/logo";

const FilePreviewModal = lazy(() => import('@/components/FilePreviewModal').then(module => ({ default: module.FilePreviewModal })));
const WELCOME_SCREEN_KEY = 'medsphere-has-visited';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isMobileSidebarOpen, setMobileSidebarOpen } = useSidebarStore();
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const { authState, user } = useAuthStore();
  const { previewItem, setPreviewItem } = useFilePreviewStore();

  const [showWelcome, setShowWelcome] = useState(true);
  const [isClient, setIsClient] = useState(false);
  
  useKeyboardShortcuts();

  useEffect(() => {
    setIsClient(true);
    const hasVisited = localStorage.getItem(WELCOME_SCREEN_KEY);
    if (hasVisited) {
      setShowWelcome(false);
    }
  }, []);

  const handleGetStarted = () => {
    localStorage.setItem(WELCOME_SCREEN_KEY, 'true');
    setShowWelcome(false);
  };
  
  if (!isClient || authState === 'loading') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Logo className="h-16 w-16 animate-pulse" />
          <p className="text-slate-400">Connecting to MedSphere...</p>
        </div>
      </div>
    );
  }
  
  if (showWelcome) {
    return (
        <>
            <WelcomeScreen onGetStarted={handleGetStarted} />
            <footer className="absolute bottom-4 text-center text-xs text-slate-500 z-10 w-full">
                © 2025 MedSphere. All rights reserved.
            </footer>
        </>
    );
  }

  if (authState !== 'authenticated') {
    return (
        <>
          <VerificationScreen />
          <footer className="absolute bottom-4 text-center text-xs text-slate-500 z-10 w-full">
            © 2025 MedSphere. All rights reserved.
          </footer>
        </>
    );
  }

  if (user?.isBlocked) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500">Account Blocked</h1>
          <p className="text-slate-400 mt-2">
            Your account has been blocked. Please contact an administrator.
          </p>
        </div>
      </div>
    );
  }


  const isHomePage = pathname === '/';
  const isQuestionsCreatorPage = pathname.startsWith('/questions-creator');
  const isProfilePage = pathname === '/profile';

  return (
    <>
      <Header />
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
          {isProfilePage ? (
              user?.metadata?.coverPhotoURL ? (
                  <div className="absolute inset-x-0 top-0 h-40 sm:h-64 z-0">
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
              ) : (
                  <div className="absolute inset-x-0 top-0 h-40 sm:h-64 z-0 flex flex-col items-center justify-center bg-slate-900/50 border-b border-dashed border-slate-700">
                      <ImageIcon className="w-10 h-10 text-slate-500 mb-2" />
                      <p className="text-sm font-medium text-slate-400">Add a cover photo</p>
                      <p className="text-xs text-slate-500">Drag & drop an image or use the button</p>
                  </div>
              )
          ) : null}

          <div className={cn(
            "flex-shrink-0 flex flex-col min-h-[48px] relative z-10",
            isHomePage && "px-2 sm:px-6 pt-4 md:pt-6"
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
      <FloatingAssistant user={user} />
       <Suspense fallback={null}>
        {previewItem && (
          <FilePreviewModal
            item={previewItem}
            onOpenChange={(isOpen) => {
              if (!isOpen) setPreviewItem(null);
            }}
          />
        )}
      </Suspense>
    </>
  );
}
