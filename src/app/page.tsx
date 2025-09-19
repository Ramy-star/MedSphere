'use client';
import { useState } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mockFiles, mockSemesters, mockSubjects, mockYears, type MedicalFile } from '@/lib/mock-data';
import { SidebarYears } from '@/components/sidebar-years';
import { SubjectCard } from '@/components/subject-card';
import { FileCard } from '@/components/file-card';
import { PreviewModal } from '@/components/preview-modal';
import { Stethoscope } from 'lucide-react';

export default function Home() {
  const [selectedYear, setSelectedYear] = useState(mockYears[0].year);
  const [activeTab, setActiveTab] = useState<'subjects' | 'all-files'>('subjects');
  const [previewFile, setPreviewFile] = useState<MedicalFile | null>(null);

  const filteredSubjects = mockSubjects.filter(subject => subject.year === selectedYear);
  const filteredFiles = mockFiles.filter(file => file.year === selectedYear);

  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon" className="glass-card !border-glass-border">
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-accent bg-primary/20 hover:bg-primary/30 rounded-lg">
                <Stethoscope size={24} />
            </Button>
            <div className="flex flex-col">
              <h2 className="font-headline text-lg font-semibold tracking-tight text-highlight">
                MedicalStudyHub
              </h2>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarYears years={mockYears} selectedYear={selectedYear} setSelectedYear={setSelectedYear} />
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
          <div className="flex items-center justify-between space-y-2">
            <h1 className="text-3xl font-bold tracking-tight font-headline text-highlight">
              {selectedYear} Academic Year
            </h1>
            <div className="flex items-center space-x-2">
              <Avatar>
                <AvatarImage src="https://picsum.photos/seed/user/40/40" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
            </div>
          </div>
          
          <Tabs defaultValue="subjects" onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="bg-glass-surface border border-glass-border">
              <TabsTrigger value="subjects">Subjects</TabsTrigger>
              <TabsTrigger value="all-files">All Files</TabsTrigger>
            </TabsList>
            <TabsContent value="subjects">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredSubjects.map((subject) => (
                  <SubjectCard key={subject.id} subject={subject} />
                ))}
              </div>
            </TabsContent>
            <TabsContent value="all-files">
               <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredFiles.map((file) => (
                  <FileCard key={file.id} file={file} onPreview={setPreviewFile} />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </SidebarInset>

      {previewFile && (
        <PreviewModal
          file={previewFile}
          isOpen={!!previewFile}
          onOpenChange={(isOpen) => !isOpen && setPreviewFile(null)}
        />
      )}
    </SidebarProvider>
  );
}
