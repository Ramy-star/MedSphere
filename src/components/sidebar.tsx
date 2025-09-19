'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Layers,
  Menu,
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { usePathname } from 'next/navigation';


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
  const [activeLevel, setActiveLevel] = useState('');
  const [activeSemester, setActiveSemester] = useState('');
  const [openLevel, setOpenLevel] = useState('');
  
  useEffect(() => {
    const pathParts = pathname.split('/').map(decodeURIComponent);
    if (pathParts[1] === 'semester' && pathParts.length === 4) {
      const levelName = pathParts[2];
      const semesterName = pathParts[3];
      setActiveLevel(levelName);
      setOpenLevel(levelName);
      setActiveSemester(semesterName);
    } else {
        // On home page or other pages, reset active states
        setActiveLevel('');
        setActiveSemester('');
        setOpenLevel('');
    }
  }, [pathname]);

  const handleLevelChange = (value: string) => {
    const newLevel = value || '';
    setOpenLevel(newLevel);
  };

  const handleSemesterClick = (levelName: string, semesterName: string) => {
    setActiveLevel(levelName);
    setActiveSemester(semesterName);
    setOpenLevel(levelName);
  }

  return (
    <aside className={cn("relative h-full flex-col glass-card p-4 hidden md:flex transition-all duration-300 z-10", open ? 'w-72' : 'w-20')}>
      <div className={cn("flex items-center mb-4 transition-all", open ? "justify-between" : "justify-center")}>
        <div className={cn("flex items-center gap-3 pl-2.5", !open && "hidden")}>
          <GraduationCap className="text-blue-400" size={24} />
          <h2 className="text-base font-semibold text-white whitespace-nowrap">
            Academic Structure
          </h2>
        </div>
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
        <Accordion
          type="single"
          collapsible
          value={openLevel}
          onValueChange={handleLevelChange}
          className="w-full"
        >
          {initialLevels.map((level, index) => (
            <AccordionItem
              key={level.name}
              value={level.name}
              className="border-none"
            >
              <AccordionTrigger
                className={cn(
                  'p-2.5 hover:no-underline rounded-xl w-full text-slate-300 hover:text-white group',
                   (activeLevel === level.name || openLevel === level.name) && open ? 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-white' : '',
                   !open && 'flex justify-center'
                )}
              >
                <div className="flex items-center gap-3">
                  {open ? (
                    <>
                      <Layers className="h-5 w-5 text-slate-400" />
                      <span className={cn("font-medium", !open && "hidden")}>{level.name}</span>
                    </>
                  ) : (
                     <span className="font-bold text-lg">{index + 1}</span>
                  )}

                </div>
                 {open && (openLevel === level.name ? (
                  <ChevronDown
                    className="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 group-data-[state=open]:text-white"
                    aria-hidden="true"
                  />
                ) : (
                  <ChevronRight
                    className="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200"
                    aria-hidden="true"
                  />
                ))}
              </AccordionTrigger>
              <AccordionContent className={cn("pl-4 pr-1 pb-0 pt-1 space-y-2", !open && "hidden")}>
                 <Accordion type="single" collapsible value={activeSemester} onValueChange={(value) => setActiveSemester(value)}>
                  {level.semesters.map((semester) => {
                    const isSemesterActive = activeSemester === semester.name && activeLevel === level.name;
                    return (
                       <AccordionItem key={semester.name} value={semester.name} className="border-none">
                         <Link href={`/semester/${encodeURIComponent(level.name)}/${encodeURIComponent(semester.name)}`} passHref>
                          <AccordionTrigger
                             onClick={() => handleSemesterClick(level.name, semester.name)}
                            className={cn(
                              "flex w-full items-center justify-between p-3 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white hover:no-underline",
                              isSemesterActive && 'bg-gradient-to-r from-green-500/20 to-green-600/20 text-white'
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <Calendar size={18} className="text-green-400" />
                              <span className={cn(!open && "hidden")}>{semester.name}</span>
                            </div>
                             <ChevronRight size={18} className="text-slate-500" />
                          </AccordionTrigger>
                        </Link>
                         <AccordionContent className={cn("text-slate-400 text-center py-2", !open && "hidden")}>
                           No subjects yet
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                 </Accordion>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </nav>
    </aside>
  );
}
