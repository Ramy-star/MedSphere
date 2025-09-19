import { File as LucideFileIcon } from 'lucide-react';

export interface File {
  name: string;
  size: string;
  date: string;
}

export const fileData: File[] = [
  {
    name: 'Course Syllabus.pdf',
    size: '2.1 MB',
    date: '2024-09-01',
  },
  {
    name: 'Quick Reference Guide.pdf',
    size: '1.5 MB',
    date: '2024-09-15',
  },
  {
    name: 'Anatomy Lecture 1 - Intro.pptx',
    size: '5.5 MB',
    date: '2024-09-03',
  },
  {
    name: 'Cardiology Case Study - Patient X.docx',
    size: '350 KB',
    date: '2024-09-05',
  },
];
