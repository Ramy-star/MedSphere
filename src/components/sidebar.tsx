
'use client';

import {
  Calendar,
  ChevronDown,
  GraduationCap,
  Layers,
  Menu,
  HeartPulse,
  Brain,
  Bone,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from './ui/button';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Content } from '@/lib/contentService';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { useCollection } from '@/firebase/firestore/use-collection';
import { cn } from '@/lib/utils';

function SidebarContent({ open, setOpen }: { open: boolean, setOpen: (open: boolean) => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();
  
  const { data: allItems } = useCollection<Content>('content');

  const { levels, semestersByLevel, itemMap } = useMemo(() => {
    if (!allItems) {
      return { levels: [], semestersByLevel: {} as { [levelId: string]: Content[] }, itemMap: new Map() };
    }
    const levels = allItems.filter(item => item.type === 'LEVEL').sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const semesters = allItems.filter(item => item.type === 'SEMESTER').sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    
    const semesterMap: { [levelId: string]: Content[] } = {};
    levels.forEach(level => {
        semesterMap[level.id] = semesters.filter(s => s.parentId === level.id);
    });

    const map = new Map(allItems.map(item => [item.id, item]));

    return { levels, semestersByLevel: semesterMap, itemMap: map };
  }, [allItems]);

  const [activePath, setActivePath] = useState({ levelId: '', semesterId: '' });
  const [openLevelId, setOpenLevelId] = useState('');
  
  const findActivePath = useCallback(() => {
    if (!allItems || pathname === '/') {
        setActivePath({ levelId: '', semesterId: '' });
        setOpenLevelId('');
        return;
    }

    const pathParts = pathname.split('/');
    let currentId: string | null = null;
    
    if (pathParts[1] === 'folder' && pathParts.length >= 3) {
        currentId = pathParts[2];
    } else if (pathParts[1] === 'level' && pathParts.length >= 3) {
        const levelName = decodeURIComponent(pathParts[2]);
        const level = allItems.find(l => l.name === levelName);
        if (level) {
            currentId = level.id;
        }
    }

    if (!currentId) {
      setActivePath({ levelId: '', semesterId: '' });
      return;
    }

    let levelId = '';
    let semesterId = '';
    let tempItem = itemMap.get(currentId);

    while (tempItem) {
        if (tempItem.type === 'SEMESTER') {
            semesterId = tempItem.id;
        }
        if (tempItem.type === 'LEVEL') {
            levelId = tempItem.id;
            break;
        }
        tempItem = tempItem.parentId ? itemMap.get(tempItem.parentId) : undefined;
    }

    if (levelId) {
        setActivePath({ levelId, semesterId });
        if (open) setOpenLevelId(levelId);
    } else {
         setActivePath({ levelId: '', semesterId: '' });
    }
  }, [pathname, open, allItems, itemMap]);

  useEffect(() => {
    if(allItems) {
      findActivePath();
    }
  }, [findActivePath, allItems]);

  const handleLevelChange = (levelId: string) => {
    setOpenLevelId(prevOpenLevelId => (prevOpenLevelId === levelId ? '' : levelId));
  };

  const handleLinkClick = (path: string) => {
    router.push(path);
    if (isMobile) {
      setOpen(false);
    }
  }

  const sidebarIcons: { [key: string]: LucideIcon } = {
    'Level 1': Bone,
    'Level 2': HeartPulse,
    'Level 3': Brain,
    'Level 4': Brain,
    'Level 5': Brain,
  };


  return (
    <div className='flex flex-col h-full'>
      <div className={cn("flex items-center mb-4 h-10 px-2.5", open ? "justify-between" : "justify-center")}>
        <AnimatePresence>
            {open && (
                <motion.div
                    className="flex items-center gap-2 overflow-hidden"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                >
                    <GraduationCap className="text-green-400 flex-shrink-0" size={24} />
                    <h2 className="font-semibold text-white whitespace-nowrap">
                        Academic Structure
                    </h2>
                </motion.div>
            )}
        </AnimatePresence>
        
        <div className={cn("flex items-center")}>
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

      <nav className="flex-1 overflow-y-auto pr-1 -mr-1 flex flex-col gap-1">
        {levels && levels.map((level, index) => {
        const isLevelActive = openLevelId === level.id;
        const isPathActive = activePath.levelId === level.id;
        const Icon = sidebarIcons[level.name] || Layers;
        return (
            <div key={level.id} className="w-full">
            <motion.button
                onClick={() => handleLevelChange(level.id)}
                className={cn(
                'p-2.5 rounded-xl w-full text-slate-300 hover:text-white flex items-center',
                open ? 'justify-between' : 'justify-center',
                (isLevelActive && open) && 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-white',
                (!open && isPathActive) && 'bg-blue-500/20 text-white',
                )}
                whileHover={{ backgroundColor: (isLevelActive && open) ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.1)' }}
                transition={{ duration: 0.2 }}
                layout
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    <motion.div layout="position">
                        <Icon className="h-5 w-5 text-slate-400 shrink-0" />
                    </motion.div>
                    <AnimatePresence>
                    {open && (
                      <motion.span
                        className="font-medium whitespace-nowrap leading-none"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10, transition: { duration: 0.1 } }}
                        transition={{ duration: 0.2, delay: 0.1 }}
                      >
                        {level.name}
                      </motion.span>
                    )}
                    </AnimatePresence>
                </div>
                 <AnimatePresence>
                    {!open && (
                         <motion.div
                            className="flex-1 flex justify-center items-center"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                           <span className="font-semibold text-sm whitespace-nowrap leading-none">{`Lvl ${index + 1}`}</span>
                        </motion.div>
                    )}
                </AnimatePresence>
                <AnimatePresence>
                {open && (
                    <motion.div
                    key={`chevron-${level.id}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { delay: 0.2 } }}
                    exit={{ opacity: 0, transition: { duration: 0.1 } }}
                    >
                    <ChevronDown
                        className={cn(
                        "h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200",
                        isLevelActive ? 'text-white rotate-180' : ''
                        )}
                        aria-hidden="true"
                    />
                    </motion.div>
                )}
                </AnimatePresence>
            </motion.button>
                <AnimatePresence initial={false}>
                {isLevelActive && open && (
                <motion.div
                    key="content"
                    initial="collapsed"
                    animate="open"
                    exit="collapsed"
                    variants={{
                        open: { opacity: 1, height: 'auto' },
                        collapsed: { opacity: 0, height: 0 }
                    }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="pl-4 pr-1 pt-1 space-y-1 overflow-hidden"
                >
                    {(semestersByLevel[level.id] || []).map((semester) => {
                    const isSemesterActive = activePath.semesterId === semester.id;
                    return (
                        <motion.button key={semester.id} onClick={() => handleLinkClick(`/folder/${semester.id}`)}
                        className={cn(
                            "flex w-full items-center justify-between p-3 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white cursor-pointer text-left",
                            isSemesterActive && 'bg-gradient-to-r from-green-500/20 to-green-600/20 text-white'
                        )}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                        >
                        <div className="flex items-center gap-3">
                            <Calendar size={18} className="text-green-400" />
                            <span className="whitespace-nowrap">{semester.name}</span>
                        </div>
                        </motion.button>
                    );
                    })}
                </motion.div>
                )}
            </AnimatePresence>
            </div>
        )
        })}
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
        type: 'spring',
        stiffness: 400,
        damping: 40,
      }}
      className={cn("relative h-full flex-col glass-card p-4 hidden md:flex z-10")}
    >
      <SidebarContent open={desktopOpen} setOpen={setDesktopOpen} />
    </motion.aside>
  );
}
