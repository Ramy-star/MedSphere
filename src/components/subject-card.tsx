'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Folder } from 'lucide-react';
import type { Subject } from '@/lib/mock-data';

interface SubjectCardProps {
  subject: Subject;
}

export function SubjectCard({ subject }: SubjectCardProps) {
  return (
    <div className="group relative transition-transform duration-300 ease-in-out hover:!scale-105">
      <Card className="glass-card overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="font-headline text-lg text-highlight" title={subject.name}>
            {subject.name}
          </CardTitle>
          <Folder className="h-6 w-6 text-accent" />
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            {subject.fileCount} files
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
