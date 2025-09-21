
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
import { allSubjects } from '@/lib/file-data';


const initialLevels = [
  {
    name: 'Level 1',
    semesters: [
      { name: 'Semester 1', subjects: [] },
      { name: 'Semester 2', subjects: [] },
    ],
  },
  {
    name: 'Level 2',
    semesters: [
      { name: 'Semester 3', subjects: [] },
      { name: 'Semester 4', subjects: [] },
    ],
  },
  {
    name: 'Level 3',
    semesters: [
      { name: 'Semester 5', subjects: [] },
      { name: 'Semester 6', subjects: [] },
    ],
  },
  {
    name: 'Level 4',
    semesters: [
      { name: 'Semester 7', subjects: [] },
      { name: 'Semester 8', subjects: [] },
    ],
  },
  {
    name: 'Level 5',
    semesters: [
      { name: 'Semester 9', subjects: [] },
      { name: 'Semester 10', subjects: [] },
    ],
  },
];

export function Sidebar({ open, setOpen }: { open: boolean, setOpen: (open: boolean) => void }) {
  const pathname = usePathname();
  const [activePath, setActivePath] = useState({ level: '', semester: '' });
  const [openLevel, setOpenLevel] = useState('');
  
  useEffect(() => {
    const pathParts = pathname.split('/').map(decodeURIComponent);
    let levelName = '';
    let semesterName = '';

    if (pathParts[1] === 'semester' && pathParts.length >= 4) {
      levelName = pathParts[2];
      semesterName = pathParts[3];
    } else if (pathParts[1] === 'subject' && pathParts.length >= 5) {
        levelName = pathParts[2];
        semesterName = pathParts[3];
    } else if (pathParts[1] === 'folder' && pathParts.length >= 3) {
      // This is a bit of a workaround as folder structure isn't tied to levels yet.
      // We can make an assumption for now or look it up if we have the data.
      // For "Chest", it's under Level 1, Semester 1.
      if (pathParts[2] === 'Chest') {
        levelName = 'Level 1';
        semesterName = 'Semester 1';
      }
    }
    
    if (levelName) {
        setActivePath({ level: levelName, semester: semesterName });
        if (openLevel !== levelName) {
            setOpenLevel(levelName);
        }
    } else {
      setActivePath({ level: '', semester: '' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleLevelChange = (value: string) => {
    setOpenLevel(prevOpenLevel => (prevOpenLevel === value ? '' : value));
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
          {initialLevels.map((level, index) => {
            const isLevelActive = openLevel === level.name;
            const isPathActive = activePath.level === level.name;
            return (
              <div
                key={level.name}
                className={cn("border-none", !open && "mb-1")}
              >
                <button
                  onClick={() => handleLevelChange(level.name)}
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
                      {level.semesters.map((semester) => {
                        const isSemesterActive = activePath.semester === semester.name && activePath.level === level.name;
                        return (
                          <Link key={semester.name} href={`/semester/${encodeURIComponent(level.name)}/${encodeURIComponent(semester.name)}`} passHref>
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
