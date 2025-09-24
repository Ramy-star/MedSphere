
'use client';

import { cn } from '@/lib/utils';
import {
  Calendar,
  ChevronDown,
  GraduationCap,
  Layers,
  Menu,
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { contentService, Content } from '@/lib/contentService';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";

function SidebarContent({ open, setOpen }: { open: boolean, setOpen: (open: boolean) => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [levels, setLevels] = useState<Content[]>([]);
  const [semestersByLevel, setSemestersByLevel] = useState<{[levelId: string]: Content[]}>({});
  const [activePath, setActivePath] = useState({ levelId: '', semesterId: '' });
  const [openLevelId, setOpenLevelId] = useState('');
  
  const loadInitialData = useCallback(async () => {
    const topLevels = await contentService.getChildren(null);
    const allLevels = topLevels.filter(c => c.type === 'LEVEL');
    setLevels(allLevels);

    const semestersMap: {[levelId: string]: Content[]} = {};
    for (const level of allLevels) {
        const levelSemesters = await contentService.getChildren(level.id);
        semestersMap[level.id] = levelSemesters.filter(c => c.type === 'SEMESTER');
    }
    setSemestersByLevel(semestersMap);
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const findActivePath = useCallback(async () => {
    if (pathname === '/') {
        setActivePath({ levelId: '', semesterId: '' });
        setOpenLevelId('');
        return;
    }

    const pathParts = pathname.split('/');
    
    if (pathParts[1] === 'folder' && pathParts.length >= 3) {
        const currentId = pathParts[2];
        const ancestors = await contentService.getAncestors(currentId);
        const current = await contentService.getById(currentId);
        const pathItems = [...ancestors, current].filter(Boolean) as Content[];

        const level = pathItems.find(p => p.type === 'LEVEL');
        const semester = pathItems.find(p => p.type === 'SEMESTER');

        if (level) {
            setActivePath({ levelId: level.id, semesterId: semester?.id || '' });
            if (open) setOpenLevelId(level.id);
        } else {
             setActivePath({ levelId: '', semesterId: '' });
        }
    } else if (pathParts[1] === 'level' && pathParts.length >= 3) {
        const levelName = decodeURIComponent(pathParts[2]);
        const allLevels = await contentService.getChildren(null);
        const currentLevel = allLevels.find(l => l.name === levelName && l.type === 'LEVEL');
        if (currentLevel) {
             setActivePath({ levelId: currentLevel.id, semesterId: '' });
             if (open) setOpenLevelId(currentLevel.id);
        } else {
             setActivePath({ levelId: '', semesterId: '' });
        }
    } else {
         setActivePath({ levelId: '', semesterId: '' });
    }
  }, [pathname, open]);

  useEffect(() => {
    findActivePath();
  }, [findActivePath]);

  const handleLevelChange = (levelId: string) => {
    setOpenLevelId(prevOpenLevelId => (prevOpenLevelId === levelId ? '' : levelId));
  };

  const handleLinkClick = (path: string) => {
    router.push(path);
    if (isMobile) {
      setOpen(false);
    }
  }

  const headerVariants = {
    open: { opacity: 1, transition: { delay: 0.1, duration: 0.2 } },
    closed: { opacity: 0, transition: { duration: 0.1 } },
  };

  const levelTextVariants = {
      open: { opacity: 1, x: 0, transition: { duration: 0.2 } },
      closed: { opacity: 0, x: -10, transition: { duration: 0.1 } },
  };

  const levelIconVariants = {
      open: { opacity: 0, display: 'none', transition: { duration: 0.1 } },
      closed: { opacity: 1, display: 'flex', transition: { delay: 0.1, duration: 0.2 } },
  };

  return (
    <div className='flex flex-col h-full'>
       <div className="flex items-center justify-between mb-4 h-10 px-2.5">
          <motion.div
            className="flex items-center gap-2 flex-1 min-w-0"
            variants={headerVariants}
            initial="closed"
            animate={open ? "open" : "closed"}
            style={{ display: open ? 'flex' : 'none' }}
          >
            <GraduationCap className="text-green-400" size={24} />
            <h2 className="text-base font-semibold text-white whitespace-nowrap">
              Academic Structure
            </h2>
          </motion.div>
          
          <div className={cn("flex items-center", !open && "w-full justify-center")}>
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setOpen(!open)} 
                className="text-white hover:bg-slate-700 hidden sm:flex w-8 h-8"
            >
                <Menu size={20} />
            </Button>
          </div>
      </div>


      <nav className="flex-1 space-y-2 overflow-y-auto">
        <div className="w-full">
          {levels.map((level, index) => {
            const isLevelActive = openLevelId === level.id;
            const isPathActive = activePath.levelId === level.id;
            return (
              <div
                key={level.id}
                className={cn("border-none", !open && "mb-1")}
              >
                <button
                  onClick={() => handleLevelChange(level.id)}
                  className={cn(
                    'p-2.5 rounded-xl w-full text-slate-300 hover:text-white flex items-center justify-between',
                    (isLevelActive && open) && 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-white',
                    (!open && isPathActive) && 'bg-blue-500/20 text-white',
                    !open && 'justify-center'
                  )}
                >
                  <div className="flex items-center gap-3">
                     <motion.div
                        className="flex items-center gap-3"
                        variants={levelTextVariants}
                        initial="closed"
                        animate={open ? "open" : "closed"}
                        style={{ display: open ? 'flex' : 'none' }}
                     >
                        <Layers className="h-5 w-5 text-slate-400" />
                        <span className="font-medium whitespace-nowrap">{level.name}</span>
                     </motion.div>
                     <motion.div
                        variants={levelIconVariants}
                        initial="open"
                        animate={open ? "open" : "closed"}
                        className="items-center justify-center"
                     >
                       <span className="font-semibold text-sm whitespace-nowrap">{`Lvl ${index + 1}`}</span>
                    </motion.div>
                  </div>
                   <motion.div
                     animate={{ opacity: open ? 1 : 0, display: open ? 'flex' : 'none', rotate: isLevelActive ? 180 : 0 }}
                     transition={{ duration: 0.25, ease: "easeInOut" }}
                   >
                    <ChevronDown
                      className={cn(
                        "h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200",
                        isLevelActive ? 'text-white' : ''
                      )}
                      aria-hidden="true"
                    />
                  </motion.div>
                </button>
                 <AnimatePresence initial={false}>
                    {isLevelActive && open && (
                    <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className={cn("pl-4 pr-1 pt-1 space-y-2 overflow-hidden", !open && "hidden")}
                    >
                      {(semestersByLevel[level.id] || []).map((semester) => {
                        const isSemesterActive = activePath.semesterId === semester.id;
                        return (
                          <button key={semester.id} onClick={() => handleLinkClick(`/folder/${semester.id}`)}
                            className={cn(
                              "flex w-full items-center justify-between p-3 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white cursor-pointer text-left",
                              isSemesterActive && 'bg-gradient-to-r from-green-500/20 to-green-600/20 text-white'
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <Calendar size={18} className="text-green-400" />
                              <span className={cn("whitespace-nowrap", !open && "hidden")}>{semester.name}</span>
                            </div>
                          </button>
                        );
                      })}
                    </motion.div>
                    )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </nav>
    </div>
  )
}


export function Sidebar({ open, setOpen }: { open: boolean, setOpen: (open: boolean) => void }) {
  const isMobile = useIsMobile();
  const [desktopOpen, setDesktopOpen] = useState(true);

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="glass-card p-4 !w-72">
           <SidebarContent open={true} setOpen={setOpen} />
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <motion.aside
      animate={{
        width: desktopOpen ? 288 : 80,
      }}
      transition={{
        duration: 0.2,
        ease: "easeInOut",
      }}
      className={cn("relative h-full flex-col glass-card p-4 hidden md:flex z-10")}
    >
      <SidebarContent open={desktopOpen} setOpen={setDesktopOpen} />
    </motion.aside>
  );
}
