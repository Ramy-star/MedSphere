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

const levels = [
  { 
    name: 'Level 1', 
    semesters: [
      { name: 'Semester 1', subjects: 5 },
      { name: 'Semester 2', subjects: 6 },
    ], 
    fileCount: 1, 
    active: false 
  },
  { 
    name: 'Level 2', 
    semesters: [
      { name: 'Semester 3', subjects: 7 },
      { name: 'Semester 4', subjects: 8 },
    ], 
    fileCount: 2, 
    active: false 
  },
  { 
    name: 'Level 3', 
    semesters: [
      { name: 'Semester 5', subjects: 9 },
      { name: 'Semester 6', subjects: 8 },
    ], 
    fileCount: 3, 
    active: false 
  },
  { 
    name: 'Level 4', 
    semesters: [
      { name: 'Semester 7', subjects: 7 },
      { name: 'Semester 8', subjects: 6 },
    ], 
    fileCount: 4, 
    active: false 
  },
  {
    name: 'Level 5',
    semesters: [
      { name: 'Semester 9', subjects: 9 },
      { name: 'Semester 10', subjects: 10 },
    ],
    fileCount: 5,
    active: true,
  },
];

export function Sidebar() {
  return (
    <aside className="w-80 flex-col glass-card p-6 hidden md:flex">
      <div className="mb-6">
        <h2 className="text-base font-semibold text-white flex items-center gap-3 mb-1">
          <GraduationCap className="text-blue-400" size={24} />
          Academic Structure
        </h2>
        <p className="text-sm text-slate-400">Navigate your medical education</p>
      </div>

      <nav className="flex-1 space-y-2">
        <Accordion
          type="multiple"
          defaultValue={['Level 5']}
          className="w-full space-y-1"
        >
          {levels.map((level) => (
            <AccordionItem
              key={level.name}
              value={level.name}
              className={cn(
                'border-none rounded-lg transition-all',
                'data-[state=open]:bg-blue-500/10 data-[state=open]:border data-[state=open]:border-blue-500/30'
              )}
            >
              <AccordionTrigger
                className={cn(
                  'p-3 hover:no-underline rounded-lg w-full text-slate-300 hover:text-white group',
                  'data-[state=open]:text-white'
                )}
              >
                <div className="flex items-center gap-3">
                  <ChevronRight
                      className="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 group-data-[state=open]:rotate-90"
                      aria-hidden="true"
                    />
                  <span className="font-medium">{level.name}</span>
                </div>
                <div
                  className={cn(
                    'h-6 w-6 flex items-center justify-center rounded-full text-xs font-semibold',
                    'group-data-[state=open]:bg-blue-500/20 group-data-[state=open]:text-blue-300 group-data-[state=open]:border group-data-[state=open]:border-blue-400',
                    'bg-slate-700 text-slate-300'
                  )}
                >
                  {level.fileCount}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-8 pr-3 pb-3 space-y-2">
                {level.semesters.map((semester) => (
                  <a
                    href="#"
                    key={semester.name}
                    className="flex items-center justify-between p-2 rounded-lg text-slate-400 hover:bg-slate-800/50 hover:text-white"
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
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </nav>
    </aside>
  );
}
