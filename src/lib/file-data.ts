import { 
    Book, FileText, Presentation, TestTube2, Users, type LucideIcon, Heart, Brain, Dna, Bone, Shield, FlaskConical, Stethoscope, Microscope,
    Pill, Bug, Syringe, Activity, BarChart3, Lightbulb, Languages, BookOpen, UserCheck, Briefcase, Speech, Wind, HeartPulse, Airplay,
    GraduationCap, HelpingHand, Globe, GitMerge, DnaIcon, Baby, CircleDot, Ambulance, Home, Scale, FolderKanban, Star, Eye, Ear
} from 'lucide-react';

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

export interface Subject {
  name: string;
  icon: LucideIcon;
  color: string;
  level: string;
  semester: string;
}

export interface SemesterSubjects {
    [key: string]: Subject[];
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

export const subjectsBySemester: SemesterSubjects = {
  'Semester 1': [
    { name: 'Anatomy', icon: Bone, color: 'text-gray-400', level: 'Level 1', semester: 'Semester 1' },
    { name: 'Histology', icon: Microscope, color: 'text-pink-400', level: 'Level 1', semester: 'Semester 1' },
    { name: 'Physiology', icon: Activity, color: 'text-green-400', level: 'Level 1', semester: 'Semester 1' },
    { name: 'Biochemistry', icon: FlaskConical, color: 'text-yellow-400', level: 'Level 1', semester: 'Semester 1' },
    { name: 'Psychology', icon: Brain, color: 'text-blue-400', level: 'Level 1', semester: 'Semester 1' },
    { name: 'Biostatistics', icon: BarChart3, color: 'text-orange-400', level: 'Level 1', semester: 'Semester 1' },
    { name: 'Learning Skills', icon: Lightbulb, color: 'text-purple-400', level: 'Level 1', semester: 'Semester 1' },
    { name: 'Arabic', icon: Languages, color: 'text-teal-400', level: 'Level 1', semester: 'Semester 1' },
  ],
  'Semester 2': [
    { name: 'Pharmacology', icon: Pill, color: 'text-red-400', level: 'Level 1', semester: 'Semester 2' },
    { name: 'Pathology', icon: Bug, color: 'text-pink-500', level: 'Level 1', semester: 'Semester 2' },
    { name: 'Immunology', icon: Shield, color: 'text-yellow-500', level: 'Level 1', semester: 'Semester 2' },
    { name: 'Microbiology', icon: DnaIcon, color: 'text-purple-400', level: 'Level 1', semester: 'Semester 2' },
    { name: 'Parasitology', icon: Syringe, color: 'text-green-500', level: 'Level 1', semester: 'Semester 2' },
    { name: 'Clinical Practice', icon: Stethoscope, color: 'text-blue-400', level: 'Level 1', semester: 'Semester 2' },
    { name: 'Arabic', icon: Languages, color: 'text-teal-400', level: 'Level 1', semester: 'Semester 2' },
  ],
  'Semester 3': [
    { name: 'Blood', icon: Syringe, color: 'text-red-500', level: 'Level 2', semester: 'Semester 3' },
    { name: 'Locomotor', icon: Bone, color: 'text-gray-400', level: 'Level 2', semester: 'Semester 3' },
    { name: 'Clinical 1', icon: UserCheck, color: 'text-blue-400', level: 'Level 2', semester: 'Semester 3' },
    { name: 'Communication Skills', icon: Speech, color: 'text-green-400', level: 'Level 2', semester: 'Semester 3' },
    { name: 'Enterpreneurship', icon: Briefcase, color: 'text-yellow-500', level: 'Level 2', semester: 'Semester 3' },
  ],
  'Semester 4': [
    { name: 'Respiratory', icon: Wind, color: 'text-cyan-400', level: 'Level 2', semester: 'Semester 4' },
    { name: 'CVS', icon: HeartPulse, color: 'text-red-400', level: 'Level 2', semester: 'Semester 4' },
    { name: 'Clinical 2', icon: UserCheck, color: 'text-blue-500', level: 'Level 2', semester: 'Semester 4' },
    { name: 'Critical Thinking', icon: Lightbulb, color: 'text-yellow-400', level: 'Level 2', semester: 'Semester 4' },
  ],
  'Semester 5': [
    { name: 'CNS', icon: Brain, color: 'text-blue-400', level: 'Level 3', semester: 'Semester 5' },
    { name: 'Special Senses', icon: Airplay, color: 'text-purple-400', level: 'Level 3', semester: 'Semester 5' },
    { name: 'Endocrine', icon: GitMerge, color: 'text-orange-400', level: 'Level 3', semester: 'Semester 5' },
    { name: 'Clinical 3', icon: UserCheck, color: 'text-blue-600', level: 'Level 3', semester: 'Semester 5' },
    { name: 'Climate Change', icon: Globe, color: 'text-green-500', level: 'Level 3', semester: 'Semester 5' },
  ],
  'Semester 6': [
    { name: 'GIT', icon: Syringe, color: 'text-yellow-600', level: 'Level 3', semester: 'Semester 6' },
    { name: 'Urogenital', icon: Dna, color: 'text-purple-500', level: 'Level 3', semester: 'Semester 6' },
    { name: 'Clinical 4', icon: UserCheck, color: 'text-blue-700', level: 'Level 3', semester: 'Semester 6' },
    { name: 'Human Rights', icon: HelpingHand, color: 'text-red-400', level: 'Level 3', semester: 'Semester 6' },
  ],
  'Semester 7': [
    { name: 'Medicine 1', icon: BookOpen, color: 'text-blue-500', level: 'Level 4', semester: 'Semester 7' },
    { name: 'Surgery 1', icon: Stethoscope, color: 'text-green-500', level: 'Level 4', semester: 'Semester 7' },
    { name: 'Leadership Skills', icon: GraduationCap, color: 'text-yellow-500', level: 'Level 4', semester: 'Semester 7' },
    { name: 'Biomedical Research', icon: FlaskConical, color: 'text-orange-500', level: 'Level 4', semester: 'Semester 7' },
  ],
  'Semester 8': [
    { name: 'Pediatrics 1', icon: Baby, color: 'text-pink-400', level: 'Level 4', semester: 'Semester 8' },
    { name: 'Gynecology & Obstetrics 1', icon: CircleDot, color: 'text-red-400', level: 'Level 4', semester: 'Semester 8' },
    { name: 'Ophthalmology', icon: Eye, color: 'text-blue-400', level: 'Level 4', semester: 'Semester 8' },
    { name: 'Otorhinolaryngology', icon: Ear, color: 'text-purple-400', level: 'Level 4', semester: 'Semester 8' },
    { name: 'Community Medicine', icon: Users, color: 'text-green-400', level: 'Level 4', semester: 'Semester 8' },
    { name: 'UE 1', icon: Star, color: 'text-yellow-400', level: 'Level 4', semester: 'Semester 8' },
  ],
  'Semester 9': [
    { name: 'Medicine 2', icon: BookOpen, color: 'text-blue-600', level: 'Level 5', semester: 'Semester 9' },
    { name: 'Surgery 2', icon: Stethoscope, color: 'text-green-600', level: 'Level 5', semester: 'Semester 9' },
    { name: 'Hospital Management & Health Economics', icon: FolderKanban, color: 'text-gray-400', level: 'Level 5', semester: 'Semester 9' },
    { name: 'UE 2', icon: Star, color: 'text-yellow-500', level: 'Level 5', semester: 'Semester 9' },
  ],
  'Semester 10': [
    { name: 'Pediatrics 2', icon: Baby, color: 'text-pink-500', level: 'Level 5', semester: 'Semester 10' },
    { name: 'Gynecology & Obstetrics 2', icon: CircleDot, color: 'text-red-500', level: 'Level 5', semester: 'Semester 10' },
    { name: 'Emergency Medicine', icon: Ambulance, color: 'text-red-600', level: 'Level 5', semester: 'Semester 10' },
    { name: 'Family Medicine', icon: Home, color: 'text-green-500', level: 'Level 5', semester: 'Semester 10' },
    { name: 'Clinical Toxicology & Forensic Medicine', icon: Scale, color: 'text-gray-500', level: 'Level 5', semester: 'Semester 10' },
    { name: 'UE 3', icon: Star, color: 'text-yellow-600', level: 'Level 5', semester: 'Semester 10' },
  ],
};

// Fallback data in case a semester isn't found
export const subjectsData: Subject[] = [
  { name: 'Cardiology', icon: Heart, color: 'text-red-400', level: '?', semester: '?' },
  { name: 'Neurology', icon: Brain, color: 'text-blue-400', level: '?', semester: '?' },
  { name: 'Genetics', icon: Dna, color: 'text-purple-400', level: '?', semester: '?' },
  { name: 'Anatomy', icon: Bone, color: 'text-gray-400', level: '?', semester: '?' },
  { name: 'Immunology', icon: Shield, color: 'text-yellow-400', level: '?', semester: '?' },
  { name: 'Biochemistry', icon: FlaskConical, color: 'text-green-400', level: '?', semester: '?' },
  { name: 'Clinical Skills', icon: Stethoscope, color: 'text-teal-400', level: '?', semester: '?' },
  { name: 'Pathology', icon: Microscope, color: 'text-pink-400', level: '?', semester: '?' },
];

export const allSubjects: Subject[] = Object.values(subjectsBySemester).flat();
