
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
import { ImageIcon } from "lucide-react";
import { Header } from "@/components/header";
import { FloatingAssistant } from "@/components/profile/FloatingAssistant";
import { useEffect, useState, useMemo } from 'react';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { Content } from '@/lib/contentService';


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

  const [isLevel2Descendant, setIsLevel2Descendant] = useState(false);
  const { data: allContent } = useCollection<Content>('content');

  const itemMap = useMemo(() => {
    if (!allContent) return new Map();
    return new Map(allContent.map(item => [item.id, item]));
  }, [allContent]);

  useEffect(() => {
    if (pathname === '/' || !allContent || allContent.length === 0) {
      setIsLevel2Descendant(false);
      return;
    }

    const pathSegments = pathname.split('/').filter(Boolean);
    const firstSegment = pathSegments[0];
    const secondSegment = pathSegments[1];
    let currentItem: Content | undefined;

    if (firstSegment === 'folder' && secondSegment) {
      currentItem = itemMap.get(secondSegment);
    } else if (firstSegment === 'level' && secondSegment) {
      const levelName = decodeURIComponent(secondSegment);
      currentItem = allContent.find(item => item.type === 'LEVEL' && item.name === levelName);
    } else {
      setIsLevel2Descendant(false);
      return;
    }

    if (!currentItem) {
      setIsLevel2Descendant(false);
      return;
    }

    if (currentItem.type === 'LEVEL' && currentItem.name === 'Level 2') {
      setIsLevel2Descendant(true);
      return;
    }

    const findLevel2Parent = (itemId: string | null): boolean => {
      if (!itemId) return false;
      const item = itemMap.get(itemId);
      if (!item) return false;
      if (item.type === 'LEVEL' && item.name === 'Level 2') {
        return true;
      }
      return findLevel2Parent(item.parentId);
    };

    setIsLevel2Descendant(findLevel2Parent(currentItem.id));

  }, [pathname, allContent, itemMap]);

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
           {isLevel2Descendant && (
            <div className="text-center py-3 text-sm text-slate-400 font-sans flex-shrink-0 mt-auto">
                <em className="italic">Powered by</em> <strong className="font-bold text-yellow-400 text-base">Spark Lab</strong>
            </div>
        )}
        </motion.main>
      </div>
      <div className="fixed bottom-8 right-6 sm:bottom-6 z-50">
        {!isProfilePage && user && <FloatingAssistant user={user} />}
      </div>
    </>
  );
}
