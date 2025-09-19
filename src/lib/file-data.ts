import { Book, FileText, Presentation, TestTube2, Users, type LucideIcon } from 'lucide-react';

export interface File {
  name: string;
  size: string;
  date: string;
}

export interface Folder {
  name: string;
  icon: LucideIcon;
  color: string;
  files: File[];
}

const lectureFiles: File[] = [
    { name: 'Anatomy Lecture 1 - Intro.pptx', size: '5.5 MB', date: '2024-09-03' },
    { name: 'Physiology Lecture 1.pptx', size: '4.8 MB', date: '2024-09-04' },
    { name: 'Biochemistry Basics.pptx', size: '6.2 MB', date: '2024-09-05' },
    { name: 'Anatomy Lecture 2 - Thorax.pptx', size: '7.1 MB', date: '2024-09-10' },
];

const caseStudyFiles: File[] = [
    { name: 'Cardiology Case - Patient X.docx', size: '350 KB', date: '2024-09-05' },
    { name: 'Neurology Case - Seizures.docx', size: '450 KB', date: '2024-09-12' },
    { name: 'Endocrinology Case - Diabetes.docx', size: '400 KB', date: '2024-09-18' },
];

const textbookFiles: File[] = [
    { name: 'Grays Anatomy for Students.pdf', size: '150 MB', date: '2024-09-01' },
    { name: 'Guyton and Hall Physiology.pdf', size: '120 MB', date: '2024-09-01' },
];

const researchPaperFiles: File[] = [
    { name: 'Recent Advances in Cardiology.pdf', size: '2.1 MB', date: '2024-09-08' },
    { name: 'AI in Medical Diagnosis.pdf', size: '3.5 MB', date: '2024-09-15' },
];

const practicalSessionFiles: File[] = [
    { name: 'Anatomy Dissection Guide.pdf', size: '1.5 MB', date: '2024-09-09' },
];

export const recentFiles: File[] = [
    { name: 'Endocrinology Case - Diabetes.docx', size: '400 KB', date: '2024-09-18' },
    { name: 'AI in Medical Diagnosis.pdf', size: '3.5 MB', date: '2024-09-15' },
    { name: 'Neurology Case - Seizures.docx', size: '450 KB', date: '2024-09-12' },
    { name: 'Anatomy Lecture 2 - Thorax.pptx', size: '7.1 MB', date: '2024-09-10' },
];

export const folderData: Folder[] = [
  {
    name: 'Lectures',
    icon: Presentation,
    color: 'text-blue-400',
    files: lectureFiles
  },
  {
    name: 'Case Studies',
    icon: Users,
    color: 'text-purple-400',
    files: caseStudyFiles
  },
  {
    name: 'Textbooks',
    icon: Book,
    color: 'text-green-400',
    files: textbookFiles
  },
  {
    name: 'Research Papers',
    icon: FileText,
    color: 'text-red-400',
    files: researchPaperFiles
  },
  {
    name: 'Practical Sessions',
    icon: TestTube2,
    color: 'text-orange-400',
    files: practicalSessionFiles
  },
];
