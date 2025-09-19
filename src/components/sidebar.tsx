'use client';
import { useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

const ScienceIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14.5 2.5a2.5 2.5 0 0 0-5 0v1.44a.5.5 0 0 1-.4.49L5.3 6.22a.5.5 0 0 0-.27.53l.91 3.26a.5.5 0 0 0 .49.4H8V20a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-9.1a.5.5 0 0 0 .49-.4l.91-3.26a.5.5 0 0 0-.27-.53l-3.8-1.83a.5.5 0 0 1-.4-.49V2.5Z" />
    <path d="M6 14h12" />
  </svg>
);

const SchoolIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 22v-4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4"/><path d="M18 10v6"/><path d="M6 10v6"/><path d="M2 12h20"/><path d="m20 8-8-6-8 6"/><path d="M4 10v12"/></svg>
);

const MenuOpenIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h10"/><path d="M4 6h16"/><path d="M4 18h16"/><path d="m18 15 3 3-3 3"/></svg>
);

const MenuIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
);

const Filter1Icon = () => <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/></svg>;
const Filter2Icon = () => <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/></svg>;
const Filter3Icon = () => <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/></svg>;
const Filter4Icon = () => <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/></svg>;

const AnatomyIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6.5 A2.5 2.5 0 0 1 14.5 9 A2.5 2.5 0 0 1 12 11.5 A2.5 2.5 0 0 1 9.5 9 A2.5 2.5 0 0 1 12 6.5 Z"/><path d="M12 11.5 V 22"/><path d="M9 22 h 6"/><path d="M9 16 h 6"/><path d="M12 11.5 L 6 14"/><path d="M12 11.5 L 18 14"/><path d="M6 3 L 6 9"/><path d="M18 3 L 18 9"/></svg>;
const BiotechIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.5 22H6a2 2 0 0 1-2-2V7l-2.5-2.5 1.5-1.5L6 6h2"/><path d="m18 15-4-4"/><path d="m15 12-1.5 1.5"/><path d="M10 2l6 6"/><circle cx="17" cy="8" r="3"/><path d="M10 12h.01"/></svg>;


const levels = [
  {
    name: 'Level 1',
    icon: SchoolIcon,
    semesters: [
      {
        name: 'Semester 1',
        icon: Filter1Icon,
        subjects: [
          { name: 'Anatomy', icon: AnatomyIcon, active: true },
          { name: 'Histology', icon: BiotechIcon },
        ],
      },
      { name: 'Semester 2', icon: Filter2Icon, subjects: [] },
    ],
  },
  {
    name: 'Level 2',
    icon: SchoolIcon,
    semesters: [
      { name: 'Semester 3', icon: Filter3Icon, subjects: [] },
      { name: 'Semester 4', icon: Filter4Icon, subjects: [] },
    ],
  },
  { name: 'Level 3', icon: SchoolIcon, semesters: [] },
  { name: 'Level 4', icon: SchoolIcon, semesters: [] },
  { name: 'Level 5', icon: SchoolIcon, semesters: [] },
];

export function Sidebar({ isMobileOpen, setMobileOpen }: { isMobileOpen: boolean; setMobileOpen: (open: boolean) => void; }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);
  const toggleMobileMenu = () => setMobileOpen(false);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
       <div className="flex items-center justify-between text-white p-4 border-b border-dark h-16">
        <div className={cn("flex items-center gap-3 overflow-hidden", isCollapsed && "w-0")}>
          <div className="flex items-center justify-center rounded-lg bg-primary/10 text-primary p-2">
            <ScienceIcon />
          </div>
          <h2 className={cn("text-lg font-bold whitespace-nowrap", isCollapsed && "hidden")}>
            MedicalStudyHub
          </h2>
        </div>
        <Button onClick={toggleSidebar} variant="ghost" size="icon" className="hidden md:flex p-1 rounded-full hover:bg-surface-dark">
          {isCollapsed ? <MenuIcon /> : <MenuOpenIcon />}
        </Button>
         <Button onClick={toggleMobileMenu} variant="ghost" size="icon" className="md:hidden p-1 rounded-full hover:bg-surface-dark">
          <X />
        </Button>
      </div>
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        <Accordion type="multiple" defaultValue={['Level 1', 'Semester 1']} className="w-full">
          {levels.map((level) => (
            <AccordionItem value={level.name} key={level.name} className="border-none">
              <AccordionTrigger className="w-full flex items-center justify-between text-slate-300 hover:text-white hover:bg-surface-dark p-2 rounded-lg hover:no-underline [&>svg.lucide-chevron-down]:hidden">
                <div className="flex items-center gap-3">
                  <level.icon />
                  <span className={cn("font-semibold", isCollapsed && "hidden")}>{level.name}</span>
                </div>
                {!isCollapsed && level.semesters.length > 0 && <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 chevron transition-transform"><path d="m6 9 6 6 6-6"/></svg>}
              </AccordionTrigger>
              <AccordionContent className="pl-4 mt-1 space-y-1 overflow-hidden">
                {level.semesters.map((semester) =>
                  semester.subjects.length > 0 ? (
                    <Accordion
                      type="multiple"
                      defaultValue={['Semester 1']}
                      key={semester.name}
                    >
                      <AccordionItem
                        value={semester.name}
                        className="border-none"
                      >
                        <AccordionTrigger className="w-full flex items-center justify-between text-slate-300 hover:text-white hover:bg-surface-dark p-2 rounded-lg hover:no-underline [&>svg.lucide-chevron-down]:hidden">
                          <div className="flex items-center gap-3">
                            <semester.icon />
                            <span className={cn(isCollapsed && "hidden")}>{semester.name}</span>
                          </div>
                           {!isCollapsed && <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 chevron transition-transform"><path d="m6 9 6 6 6-6"/></svg>}
                        </AccordionTrigger>
                        <AccordionContent className="pl-4 mt-1 space-y-1">
                          {semester.subjects.map((subject) => (
                            <Link
                              href="#"
                              key={subject.name}
                              className={cn(
                                'flex items-center gap-3 p-2 rounded-lg',
                                subject.active
                                  ? 'text-white bg-primary/80 font-semibold'
                                  : 'text-slate-400 hover:text-white hover:bg-surface-dark'
                              )}
                            >
                              <subject.icon />
                              <span className={cn(isCollapsed && "hidden")}>{subject.name}</span>
                            </Link>
                          ))}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  ) : (
                     <Link
                      href="#"
                      key={semester.name}
                      className='w-full flex items-center gap-3 text-slate-300 hover:text-white hover:bg-surface-dark p-2 rounded-lg'
                    >
                      <semester.icon />
                      <span className={cn(isCollapsed && "hidden")}>{semester.name}</span>
                    </Link>
                  )
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </nav>
    </div>
  );

  return (
    <>
    <aside
      className={cn(
        'hidden md:flex flex-col h-full bg-black/20 backdrop-blur-lg border-r border-dark transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      <SidebarContent />
    </aside>
     {isMobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
           <aside onClick={(e) => e.stopPropagation()} className="relative z-50 flex flex-col h-full w-64 bg-black/20 backdrop-blur-lg border-r border-dark">
             <SidebarContent />
           </aside>
        </div>
      )}
    </>
  );
}
