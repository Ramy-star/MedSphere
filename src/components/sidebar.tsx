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
import { ChevronsLeft, Menu, X, ChevronRight, ChevronsRight, School, TestTube, Microscope, HeartPulse, Brain, Dna, FlaskConical, Shield } from 'lucide-react';

const levelIcons = {
  "Level 1": School,
  "Level 2": School,
  "Level 3": School,
  "Level 4": School,
  "Level 5": School,
}

const subjectIcons = {
    'Anatomy': Brain,
    'Histology': Microscope,
    'Physiology': HeartPulse,
    'Biochemistry': FlaskConical,
    'Immunology': Shield,
    'Genetics': Dna,
};

const semesterIcons = [
    ChevronRight,
    ChevronsRight,
]

const levels = [
  {
    name: 'Level 1',
    semesters: [
      {
        name: 'Semester 1',
        subjects: [
          { name: 'Anatomy', active: true },
          { name: 'Histology' },
        ],
      },
      { 
        name: 'Semester 2', 
        subjects: [
            { name: 'Physiology' },
            { name: 'Biochemistry' },
        ] 
      },
    ],
  },
  {
    name: 'Level 2',
    semesters: [
      { 
          name: 'Semester 3', 
          subjects: [
            { name: 'Immunology' },
          ]
      },
      { 
          name: 'Semester 4',
          subjects: [
            { name: 'Genetics' },
          ]
      },
    ],
  },
  { name: 'Level 3', semesters: [] },
  { name: 'Level 4', semesters: [] },
  { name: 'Level 5', semesters: [] },
];

export function Sidebar({ isMobileOpen, setMobileOpen }: { isMobileOpen: boolean; setMobileOpen: (open: boolean) => void; }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);
  const closeMobileMenu = () => setMobileOpen(false);
  
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
       <div className="flex items-center justify-between text-white p-4 border-b border-dark h-16">
        <div className={cn("flex items-center gap-3 overflow-hidden", isCollapsed && "w-0")}>
          <div className="flex items-center justify-center rounded-lg bg-primary/10 text-primary p-2">
            <TestTube />
          </div>
          <h2 className={cn("text-lg font-bold whitespace-nowrap", isCollapsed && "hidden")}>
            MedicalStudyHub
          </h2>
        </div>
        <Button onClick={toggleSidebar} variant="ghost" size="icon" className="hidden md:flex p-1 rounded-full hover:bg-surface-dark">
          {isCollapsed ? <Menu /> : <ChevronsLeft />}
        </Button>
         <Button onClick={closeMobileMenu} variant="ghost" size="icon" className="md:hidden p-1 rounded-full hover:bg-surface-dark">
          <X />
        </Button>
      </div>
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        <Accordion type="multiple" defaultValue={['Level 1', 'Semester 1']} className="w-full">
          {levels.map((level) => {
            const LevelIcon = levelIcons[level.name as keyof typeof levelIcons] || School;
            return (
              <AccordionItem value={level.name} key={level.name} className="border-none">
                <AccordionTrigger className="w-full flex items-center justify-between text-slate-300 hover:text-white hover:bg-surface-dark p-2 rounded-lg hover:no-underline">
                  <div className="flex items-center gap-3">
                    <LevelIcon />
                    <span className={cn("font-semibold", isCollapsed && "hidden")}>{level.name}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pl-4 mt-1 space-y-1 overflow-hidden">
                  {level.semesters.length > 0 ? (
                    <Accordion
                      type="multiple"
                      defaultValue={['Semester 1']}
                    >
                      {level.semesters.map((semester, semIndex) => {
                        const SemesterIcon = semesterIcons[semIndex % semesterIcons.length];
                        return (
                          <AccordionItem
                            value={semester.name}
                            key={semester.name}
                            className="border-none"
                          >
                            <AccordionTrigger className="w-full flex items-center justify-between text-slate-300 hover:text-white hover:bg-surface-dark p-2 rounded-lg hover:no-underline">
                              <div className="flex items-center gap-3">
                                <SemesterIcon />
                                <span className={cn(isCollapsed && "hidden")}>{semester.name}</span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pl-4 mt-1 space-y-1">
                              {semester.subjects.map((subject) => {
                                const SubjectIcon = subjectIcons[subject.name as keyof typeof subjectIcons] || TestTube;
                                return (
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
                                    <SubjectIcon />
                                    <span className={cn(isCollapsed && "hidden")}>{subject.name}</span>
                                  </Link>
                                )
                              })}
                            </AccordionContent>
                          </AccordionItem>
                        )
                      })}
                    </Accordion>
                  ) : !isCollapsed && (
                     <div className="pl-6 text-slate-500 text-sm">No semesters</div>
                  )}
                </AccordionContent>
              </AccordionItem>
            )
          })}
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
        <div className="fixed inset-0 z-40 flex md:hidden" onClick={closeMobileMenu}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
           <aside onClick={(e) => e.stopPropagation()} className="relative z-50 flex flex-col h-full w-64 bg-black/20 backdrop-blur-lg border-r border-dark">
             <SidebarContent />
           </aside>
        </div>
      )}
    </>
  );
}
