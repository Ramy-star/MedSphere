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
} from 'lucide-react';
import { useState } from 'react';

const initialLevels = [
  {
    name: 'Level 1',
    semesters: [
      { name: 'Semester 1', subjects: 1 },
      { name: 'Semester 2', subjects: 2 },
    ],
    fileCount: 1,
  },
  {
    name: 'Level 2',
    semesters: [
      { name: 'Semester 3', subjects: 4 },
      { name: 'Semester 4', subjects: 5 },
    ],
    fileCount: 2,
  },
  {
    name: 'Level 3',
    semesters: [
      { name: 'Semester 5', subjects: 3 },
      { name: 'Semester 6', subjects: 4 },
    ],
    fileCount: 3,
  },
  {
    name: 'Level 4',
    semesters: [
      { name: 'Semester 7', subjects: 5 },
      { name: 'Semester 8', subjects: 3 },
    ],
    fileCount: 4,
  },
  {
    name: 'Level 5',
    semesters: [
      { name: 'Semester 9', subjects: 2 },
      { name: 'Semester 10', subjects: 3 },
    ],
    fileCount: 5,
  },
];

export function Sidebar() {
  const [activeLevel, setActiveLevel] = useState('Level 1');
  const [activeSemester, setActiveSemester] = useState('');
  const [openLevel, setOpenLevel] = useState('Level 1');
  
  return (
    <aside className="w-80 flex-col glass-card p-4 hidden md:flex">
      <div className="mb-4 px-2">
        <h2 className="text-base font-semibold text-white flex items-center gap-3 mb-1">
          <GraduationCap className="text-blue-400" size={24} />
          Academic Structure
        </h2>
        <p className="text-sm text-slate-400">Navigate your medical education</p>
      </div>

      <nav className="flex-1 space-y-1">
        <Accordion
          type="single"
          collapsible
          value={openLevel}
          onValueChange={(value) => setOpenLevel(value || '')}
          className="w-full"
        >
          {initialLevels.map((level) => (
            <AccordionItem
              key={level.name}
              value={level.name}
              className="border-none"
            >
              <AccordionTrigger
                onClick={() => setActiveLevel(level.name)}
                className={cn(
                  'p-2.5 hover:no-underline rounded-xl w-full text-slate-300 hover:text-white group',
                  activeLevel === level.name && 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-white'
                )}
              >
                <div className="flex items-center gap-3">
                  {openLevel === level.name ? (
                     <ChevronDown
                      className="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 group-data-[state=open]:text-white"
                      aria-hidden="true"
                    />
                  ) : (
                    <ChevronRight
                      className="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200"
                      aria-hidden="true"
                    />
                  )}

                  <span className="font-medium">{level.name}</span>
                </div>
                <div
                  className={cn(
                    'h-6 w-6 flex items-center justify-center rounded-full text-xs font-semibold',
                    activeLevel === level.name
                      ? 'border border-white/50 text-white'
                      : 'bg-slate-700 text-slate-300'
                  )}
                >
                  {level.fileCount}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-4 pr-1 pb-0 pt-1 space-y-1">
                {level.semesters.map((semester) => {
                  const isSemesterActive = activeSemester === semester.name && activeLevel === level.name;
                  return (
                    <a
                      href="#"
                      key={semester.name}
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveSemester(semester.name);
                        setActiveLevel(level.name);
                         if (openLevel !== level.name) {
                          setOpenLevel(level.name);
                        }
                      }}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white",
                        isSemesterActive && 'bg-gradient-to-r from-green-500/20 to-green-600/20 text-white'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <ChevronRight size={18} className="text-slate-500" />
                        <Calendar size={18} className="text-green-400" />
                        <span>{semester.name}</span>
                      </div>
                      <div className="h-6 w-6 flex items-center justify-center rounded-full bg-slate-700 text-slate-300 text-xs font-semibold">
                        {semester.subjects}
                      </div>
                    </a>
                  );
                })}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </nav>
    </aside>
  );
}
