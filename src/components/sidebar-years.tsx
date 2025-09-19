'use client';
import { SidebarGroup, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { Calendar } from 'lucide-react';
import type { StudyYear } from '@/lib/mock-data';

interface SidebarYearsProps {
  years: StudyYear[];
  selectedYear: string;
  setSelectedYear: (year: string) => void;
}

export function SidebarYears({ years, selectedYear, setSelectedYear }: SidebarYearsProps) {
  return (
    <SidebarGroup>
      <SidebarMenu>
        {years.map((item) => (
          <SidebarMenuItem key={item.year}>
            <SidebarMenuButton
              onClick={() => setSelectedYear(item.year)}
              isActive={selectedYear === item.year}
              tooltip={item.year}
            >
              <Calendar />
              <span>{item.year}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
