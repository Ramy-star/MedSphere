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
  const [activePath, setActivePath] = useState({ level: '', semester: '' });
  const [openLevel, setOpenLevel] = useState('');
  
  useEffect(() => {
    const pathParts = pathname.split('/').map(decodeURIComponent);
    if (pathParts[1] === 'semester' && pathParts.length >= 4) {
      const levelName = pathParts[2];
      const semesterName = pathParts[3];
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
          {initialLevels.map((level, index) => {
            const isLevelActive = openLevel === level.name;
            return (
              <AccordionItem
                key={level.name}
                value={level.name}
                className="border-none"
              >
                <AccordionTrigger
                  className={cn(
                    'p-2.5 hover:no-underline rounded-xl w-full text-slate-300 hover:text-white group',
                    isLevelActive && open ? 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-white' : '',
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
                   {open && (
                    <ChevronDown
                      className={cn(
                        "h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200",
                        isLevelActive ? 'rotate-180 text-white' : 'group-hover:text-white'
                      )}
                      aria-hidden="true"
                    />
                  )}
                </AccordionTrigger>
                <AccordionContent className={cn("pl-4 pr-1 pb-0 pt-1 space-y-2", !open && "hidden")}>
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
                            <span className={cn(!open && "hidden")}>{semester.name}</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      </nav>
    </aside>
  );
}
