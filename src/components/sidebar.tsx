'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import {
  ChevronRight,
  Folder,
  GraduationCap,
  LayoutDashboard,
} from 'lucide-react';

const levels = [
  { name: 'Level 1', semesterCount: 2, fileCount: 1 },
  { name: 'Level 2', semesterCount: 2, fileCount: 2 },
  { name: 'Level 3', semesterCount: 2, fileCount: 3 },
  { name: 'Level 4', semesterCount: 2, fileCount: 4 },
  { name: 'Level 5', semesterCount: 2, fileCount: 5, active: true },
];

export function Sidebar() {
  return (
    <aside className="w-80 flex-col border border-slate-800 bg-slate-900/50 p-6 rounded-2xl hidden md:flex">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-blue-500/10 text-blue-400 p-2 rounded-lg">
          <GraduationCap />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">
            Medical Study Organizer
          </h1>
          <p className="text-sm text-slate-400">
            Organize your medical education journey
          </p>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-1">
          <LayoutDashboard className="text-slate-400" size={20} />
          Academic Structure
        </h2>
        <p className="text-sm text-slate-400">Navigate your medical education</p>
      </div>

      <nav className="flex-1 space-y-2">
        <Accordion
          type="multiple"
          defaultValue={['Level 5']}
          className="w-full"
        >
          {levels.map((level, index) => (
            <AccordionItem
              key={level.name}
              value={level.name}
              className={cn(
                'border-none rounded-lg',
                level.active && 'bg-blue-500/10'
              )}
            >
              <AccordionTrigger
                className={cn(
                  'p-3 hover:no-underline rounded-lg w-full text-slate-300 hover:text-white',
                  level.active && 'text-white'
                )}
              >
                <div className="flex items-center gap-3">
                  <ChevronRight
                    className={cn(
                      'h-5 w-5 shrink-0 transition-transform duration-200 text-slate-400',
                      'group-data-[state=open]:rotate-90 group-data-[state=open]:text-white'
                    )}
                  />
                  <span className="font-medium">{level.name}</span>
                </div>
                <div
                  className={cn(
                    'h-6 w-6 flex items-center justify-center rounded-full text-xs font-semibold',
                    level.active
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-700 text-slate-300'
                  )}
                >
                  {level.active ? level.fileCount : index + 1}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-6 pr-3 pb-2">
                <div className="space-y-2">
                  <a
                    href="#"
                    className="flex items-center justify-between p-2 rounded-lg text-slate-400 hover:bg-slate-800/50 hover:text-white"
                  >
                    <div className="flex items-center gap-2">
                      <Folder size={18} />
                      <span>Semester {index * 2 + 1}</span>
                    </div>
                    <div className="h-6 w-6 flex items-center justify-center rounded-full bg-slate-700 text-slate-300 text-xs font-semibold">
                      {level.active ? 9 : ''}
                    </div>
                  </a>
                  <a
                    href="#"
                    className="flex items-center justify-between p-2 rounded-lg text-slate-400 hover:bg-slate-800/50 hover:text-white"
                  >
                    <div className="flex items-center gap-2">
                      <Folder size={18} />
                      <span>Semester {index * 2 + 2}</span>
                    </div>
                     <div className="h-6 w-6 flex items-center justify-center rounded-full bg-slate-700 text-slate-300 text-xs font-semibold">
                      {level.active ? 10 : ''}
                    </div>
                  </a>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </nav>
    </aside>
  );
}
