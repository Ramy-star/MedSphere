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
      { name: 'Semester 1', subjects: 1, active: true, content: 'No subjects yet' },
      { name: 'Semester 2', subjects: 2, active: false },
    ],
    fileCount: 1,
    active: true,
  },
  {
    name: 'Level 2',
    semesters: [],
    fileCount: 2,
    active: false,
  },
  {
    name: 'Level 3',
    semesters: [],
    fileCount: 3,
    active: false,
  },
  {
    name: 'Level 4',
    semesters: [],
    fileCount: 4,
    active: false,
  },
  {
    name: 'Level 5',
    semesters: [],
    fileCount: 5,
    active: false,
  },
];

export function Sidebar() {
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
          type="multiple"
          defaultValue={['Level 1', 'Semester 1']}
          className="w-full"
        >
          {levels.map((level) => (
            <AccordionItem
              key={level.name}
              value={level.name}
              className="border-none"
            >
              <AccordionTrigger
                className={cn(
                  'p-3 hover:no-underline rounded-lg w-full text-slate-300 hover:text-white group',
                  level.active && 'bg-blue-600 text-white hover:bg-blue-600/90'
                )}
              >
                <div className="flex items-center gap-3">
                  {level.active ? (
                     <ChevronDown
                      className="h-5 w-5 shrink-0 transition-transform duration-200"
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
                    level.active
                      ? 'border border-white/50 text-white'
                      : 'bg-slate-700 text-slate-300'
                  )}
                >
                  {level.fileCount}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-4 pr-1 pb-1 space-y-1">
                {level.semesters.map((semester) =>
                  semester.content ? (
                    <AccordionItem
                      key={semester.name}
                      value={semester.name}
                      className="border-none"
                    >
                      <AccordionTrigger
                        className={cn(
                          'flex items-center justify-between p-3 rounded-lg text-slate-400 hover:text-white',
                           'bg-green-600/30 border border-green-400/50 text-white hover:bg-green-600/40'
                        )}
                      >
                         <div className="flex items-center gap-3">
                            <ChevronDown size={18} />
                            <Calendar size={18} />
                            <span>{semester.name}</span>
                          </div>
                          <div className="h-6 w-6 flex items-center justify-center rounded-full border border-white/50 text-white text-xs font-semibold">
                            {semester.subjects}
                          </div>
                      </AccordionTrigger>
                      <AccordionContent className="py-2 px-4 text-slate-400 text-sm">
                        {semester.content}
                      </AccordionContent>
                    </AccordionItem>
                  ) : (
                    <a
                      href="#"
                      key={semester.name}
                      className="flex items-center justify-between p-3 rounded-lg text-slate-400 hover:bg-slate-800/50 hover:text-white"
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
                  )
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </nav>
    </aside>
  );
}
