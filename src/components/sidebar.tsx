
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
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { contentService, Content } from '@/lib/contentService';

export function Sidebar({ open, setOpen }: { open: boolean, setOpen: (open: boolean) => void }) {
  const pathname = usePathname();
  const [levels, setLevels] = useState<Content[]>([]);
  const [semestersByLevel, setSemestersByLevel] = useState<{[levelId: string]: Content[]}>({});
  const [activePath, setActivePath] = useState({ levelId: '', semesterId: '' });
  const [openLevelId, setOpenLevelId] = useState('');
  
  useEffect(() => {
    async function loadInitialData() {
        const topLevels = await contentService.getChildren(null);
        const allLevels = topLevels.filter(c => c.type === 'LEVEL');
        setLevels(allLevels);

        const semestersMap: {[levelId: string]: Content[]} = {};
        for (const level of allLevels) {
            const levelSemesters = await contentService.getChildren(level.id);
            semestersMap[level.id] = levelSemesters.filter(c => c.type === 'SEMESTER');
        }
        setSemestersByLevel(semestersMap);
    }
    loadInitialData();
  }, []);

  useEffect(() => {
    async function findActivePath() {
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
            } else {
                 setActivePath({ levelId: '', semesterId: '' });
            }
        } else if (pathParts[1] === 'level' && pathParts.length >= 3) {
            const levelName = decodeURIComponent(pathParts[2]);
            const allLevels = await contentService.getChildren(null);
            const currentLevel = allLevels.find(l => l.name === levelName && l.type === 'LEVEL');
            if (currentLevel) {
                 setActivePath({ levelId: currentLevel.id, semesterId: '' });
            } else {
                 setActivePath({ levelId: '', semesterId: '' });
            }
        } else {
             setActivePath({ levelId: '', semesterId: '' });
        }
    }
    findActivePath();
  }, [pathname]);

  const handleLevelChange = (levelId: string) => {
    setOpenLevelId(prevOpenLevelId => (prevOpenLevelId === levelId ? '' : levelId));
  };

  return (
    <motion.aside
      animate={{
        width: open ? 288 : 80,
        opacity: open ? 1 : 0.8,
      }}
      transition={{
        duration: 0.25,
        ease: [0.25, 0.8, 0.25, 1],
      }}
      className={cn("relative h-full flex-col glass-card p-4 hidden md:flex z-10 overflow-hidden")}
    >
      <div className={cn("flex items-center mb-4 transition-all", open ? "justify-between" : "justify-center")}>
        <motion.div 
            animate={{ opacity: open ? 1 : 0, display: open ? 'flex' : 'none' }}
            transition={{ duration: 0.2, delay: open ? 0.1 : 0 }}
            className="flex items-center gap-3 pl-2.5"
        >
          <GraduationCap className="text-blue-400" size={24} />
          <h2 className="text-base font-semibold text-white whitespace-nowrap">
            Academic Structure
          </h2>
        </motion.div>
        <div className={cn(!open && "w-full flex justify-center")}>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setOpen(!open)} 
              className={cn("text-white hover:bg-slate-700", open && "mr-2.5")}
            >
              <Menu size={24} />
            </Button>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
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
                    !open && 'flex justify-center'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <motion.div
                        animate={{ opacity: open ? 1 : 0, display: open ? 'flex' : 'none' }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center gap-3"
                    >
                        <Layers className="h-5 w-5 text-slate-400" />
                        <span className="font-medium whitespace-nowrap">{level.name}</span>
                    </motion.div>
                     <motion.div
                        animate={{ opacity: open ? 0 : 1, display: open ? 'none' : 'flex' }}
                        transition={{ duration: 0.2 }}
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
                          <Link key={semester.id} href={`/folder/${semester.id}`} passHref>
                            <div
                              className={cn(
                                "flex w-full items-center justify-between p-3 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white cursor-pointer",
                                isSemesterActive && 'bg-gradient-to-r from-green-500/20 to-green-600/20 text-white'
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <Calendar size={18} className="text-green-400" />
                                <span className={cn("whitespace-nowrap", !open && "hidden")}>{semester.name}</span>
                              </div>
                            </div>
                          </Link>
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
    </motion.aside>
  );
}
