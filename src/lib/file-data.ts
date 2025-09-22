import { 
    Book, FileText, Presentation, TestTube2, Users, type LucideIcon, Heart, Brain, Dna, Bone, Shield, FlaskConical, Stethoscope, Microscope,
    Pill, Bug, Syringe, Activity, BarChart3, Lightbulb, Languages, BookOpen, UserCheck, Briefcase, Speech, Wind, HeartPulse, Airplay,
    GraduationCap, HelpingHand, Globe, GitMerge, DnaIcon, Baby, CircleDot, Ambulance, Home, Scale, FolderKanban, Star, Eye, Ear, Folder as FolderIcon
} from 'lucide-react';

export const allSubjectIcons: { [key: string]: LucideIcon } = {
    Heart, Brain, Dna, Bone, Shield, FlaskConical, Stethoscope, Microscope,
    Pill, Bug, Syringe, Activity, BarChart3, Lightbulb, Languages, BookOpen, UserCheck, Briefcase, Speech, Wind, HeartPulse, Airplay,
    GraduationCap, HelpingHand, Globe, GitMerge, DnaIcon, Baby, CircleDot, Ambulance, Home, Scale, FolderKanban, Star, Eye, Ear,
    Anatomy: Bone,
    Histology: Microscope,
    Physiology: Activity,
    Biochemistry: FlaskConical,
    Psychology: Brain,
    Biostatistics: BarChart3,
    'Learning Skills': Lightbulb,
    Arabic: Languages,
    Pharmacology: Pill,
    Pathology: Bug,
    Immunology: Shield,
    Microbiology: DnaIcon,
    Parasitology: Syringe,
    'Clinical Practice': Stethoscope,
    Blood: Syringe,
    Locomotor: Bone,
    'Clinical 1': UserCheck,
    'Communication Skills': Speech,
    Enterpreneurship: Briefcase,
    Respiratory: Wind,
    CVS: HeartPulse,
    'Clinical 2': UserCheck,
    'Critical Thinking': Lightbulb,
    CNS: Brain,
    'Special Senses': Airplay,
    Endocrine: GitMerge,
    'Clinical 3': UserCheck,
    'Climate Change': Globe,
    GIT: Syringe,
    Urogenital: Dna,
    'Clinical 4': UserCheck,
    'Human Rights': HelpingHand,
    'Medicine 1': BookOpen,
    'Surgery 1': Stethoscope,
    'Leadership Skills': GraduationCap,
    'Biomedical Research': FlaskConical,
    'Pediatrics 1': Baby,
    'Gynecology & Obstetrics 1': CircleDot,
    Ophthalmology: Eye,
    Otorhinolaryngology: Ear,
    'Community Medicine': Users,
    'UE 1': Star,
    'Medicine 2': BookOpen,
    'Surgery 2': Stethoscope,
    'Hospital Management & Health Economics': FolderKanban,
    'UE 2': Star,
    'Pediatrics 2': Baby,
    'Gynecology & Obstetrics 2': CircleDot,
    'Emergency Medicine': Ambulance,
    'Family Medicine': Home,
    'Clinical Toxicology & Forensic Medicine': Scale,
    'UE 3': Star,
    'Cardiology': Heart,
    'Neurology': Brain,
    'Genetics': Dna,
    'Clinical Skills': Stethoscope,
    'Folder': FolderIcon,
};


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
  iconName: string;
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
    { name: 'Anatomy', iconName: 'Anatomy', color: 'text-gray-400', level: 'Level 1', semester: 'Semester 1' },
    { name: 'Histology', iconName: 'Histology', color: 'text-pink-400', level: 'Level 1', semester: 'Semester 1' },
    { name: 'Physiology', iconName: 'Physiology', color: 'text-green-400', level: 'Level 1', semester: 'Semester 1' },
    { name: 'Biochemistry', iconName: 'Biochemistry', color: 'text-yellow-400', level: 'Level 1', semester: 'Semester 1' },
    { name: 'Psychology', iconName: 'Psychology', color: 'text-blue-400', level: 'Level 1', semester: 'Semester 1' },
    { name: 'Biostatistics', iconName: 'Biostatistics', color: 'text-orange-400', level: 'Level 1', semester: 'Semester 1' },
    { name: 'Learning Skills', iconName: 'Learning Skills', color: 'text-purple-400', level: 'Level 1', semester: 'Semester 1' },
    { name: 'Arabic', iconName: 'Arabic', color: 'text-teal-400', level: 'Level 1', semester: 'Semester 1' },
  ],
  'Semester 2': [
    { name: 'Pharmacology', iconName: 'Pharmacology', color: 'text-red-400', level: 'Level 1', semester: 'Semester 2' },
    { name: 'Pathology', iconName: 'Pathology', color: 'text-pink-500', level: 'Level 1', semester: 'Semester 2' },
    { name: 'Immunology', iconName: 'Immunology', color: 'text-yellow-500', level: 'Level 1', semester: 'Semester 2' },
    { name: 'Microbiology', iconName: 'Microbiology', color: 'text-purple-400', level: 'Level 1', semester: 'Semester 2' },
    { name: 'Parasitology', iconName: 'Parasitology', color: 'text-green-500', level: 'Level 1', semester: 'Semester 2' },
    { name: 'Clinical Practice', iconName: 'Clinical Practice', color: 'text-blue-400', level: 'Level 1', semester: 'Semester 2' },
    { name: 'Arabic', iconName: 'Arabic', color: 'text-teal-400', level: 'Level 1', semester: 'Semester 2' },
  ],
  'Semester 3': [
    { name: 'Blood', iconName: 'Blood', color: 'text-red-500', level: 'Level 2', semester: 'Semester 3' },
    { name: 'Locomotor', iconName: 'Locomotor', color: 'text-gray-400', level: 'Level 2', semester: 'Semester 3' },
    { name: 'Clinical 1', iconName: 'Clinical 1', color: 'text-blue-400', level: 'Level 2', semester: 'Semester 3' },
    { name: 'Communication Skills', iconName: 'Communication Skills', color: 'text-green-400', level: 'Level 2', semester: 'Semester 3' },
    { name: 'Enterpreneurship', iconName: 'Enterpreneurship', color: 'text-yellow-500', level: 'Level 2', semester: 'Semester 3' },
  ],
  'Semester 4': [
    { name: 'Respiratory', iconName: 'Respiratory', color: 'text-cyan-400', level: 'Level 2', semester: 'Semester 4' },
    { name: 'CVS', iconName: 'CVS', color: 'text-red-400', level: 'Level 2', semester: 'Semester 4' },
    { name: 'Clinical 2', iconName: 'Clinical 2', color: 'text-blue-500', level: 'Level 2', semester: 'Semester 4' },
    { name: 'Critical Thinking', iconName: 'Critical Thinking', color: 'text-yellow-400', level: 'Level 2', semester: 'Semester 4' },
  ],
  'Semester 5': [
    { name: 'CNS', iconName: 'CNS', color: 'text-blue-400', level: 'Level 3', semester: 'Semester 5' },
    { name: 'Special Senses', iconName: 'Special Senses', color: 'text-purple-400', level: 'Level 3', semester: 'Semester 5' },
    { name: 'Endocrine', iconName: 'Endocrine', color: 'text-orange-400', level: 'Level 3', semester: 'Semester 5' },
    { name: 'Clinical 3', iconName: 'Clinical 3', color: 'text-blue-600', level: 'Level 3', semester: 'Semester 5' },
    { name: 'Climate Change', iconName: 'Climate Change', color: 'text-green-500', level: 'Level 3', semester: 'Semester 5' },
  ],
  'Semester 6': [
    { name: 'GIT', iconName: 'GIT', color: 'text-yellow-600', level: 'Level 3', semester: 'Semester 6' },
    { name: 'Urogenital', iconName: 'Urogenital', color: 'text-purple-500', level: 'Level 3', semester: 'Semester 6' },
    { name: 'Clinical 4', iconName: 'Clinical 4', color: 'text-blue-700', level: 'Level 3', semester: 'Semester 6' },
    { name: 'Human Rights', iconName: 'Human Rights', color: 'text-red-400', level: 'Level 3', semester: 'Semester 6' },
  ],
  'Semester 7': [
    { name: 'Medicine 1', iconName: 'Medicine 1', color: 'text-blue-500', level: 'Level 4', semester: 'Semester 7' },
    { name: 'Surgery 1', iconName: 'Surgery 1', color: 'text-green-500', level: 'Level 4', semester: 'Semester 7' },
    { name: 'Leadership Skills', iconName: 'Leadership Skills', color: 'text-yellow-500', level: 'Level 4', semester: 'Semester 7' },
    { name: 'Biomedical Research', iconName: 'Biomedical Research', color: 'text-orange-500', level: 'Level 4', semester: 'Semester 7' },
  ],
  'Semester 8': [
    { name: 'Pediatrics 1', iconName: 'Pediatrics 1', color: 'text-pink-400', level: 'Level 4', semester: 'Semester 8' },
    { name: 'Gynecology & Obstetrics 1', iconName: 'Gynecology & Obstetrics 1', color: 'text-red-400', level: 'Level 4', semester: 'Semester 8' },
    { name: 'Ophthalmology', iconName: 'Ophthalmology', color: 'text-blue-400', level: 'Level 4', semester: 'Semester 8' },
    { name: 'Otorhinolaryngology', iconName: 'Otorhinolaryngology', color: 'text-purple-400', level: 'Level 4', semester: 'Semester 8' },
    { name: 'Community Medicine', iconName: 'Community Medicine', color: 'text-green-400', level: 'Level 4', semester: 'Semester 8' },
    { name: 'UE 1', iconName: 'UE 1', color: 'text-yellow-400', level: 'Level 4', semester: 'Semester 8' },
  ],
  'Semester 9': [
    { name: 'Medicine 2', iconName: 'Medicine 2', color: 'text-blue-600', level: 'Level 5', semester: 'Semester 9' },
    { name: 'Surgery 2', iconName: 'Surgery 2', color: 'text-green-600', level: 'Level 5', semester: 'Semester 9' },
    { name: 'Hospital Management & Health Economics', iconName: 'Hospital Management & Health Economics', color: 'text-gray-400', level: 'Level 5', semester: 'Semester 9' },
    { name: 'UE 2', iconName: 'UE 2', color: 'text-yellow-500', level: 'Level 5', semester: 'Semester 9' },
  ],
  'Semester 10': [
    { name: 'Pediatrics 2', iconName: 'Pediatrics 2', color: 'text-pink-500', level: 'Level 5', semester: 'Semester 10' },
    { name: 'Gynecology & Obstetrics 2', iconName: 'Gynecology & Obstetrics 2', color: 'text-red-500', level: 'Level 5', semester: 'Semester 10' },
    { name: 'Emergency Medicine', iconName: 'Emergency Medicine', color: 'text-red-600', level: 'Level 5', semester: 'Semester 10' },
    { name: 'Family Medicine', iconName: 'Family Medicine', color: 'text-green-500', level: 'Level 5', semester: 'Semester 10' },
    { name: 'Clinical Toxicology & Forensic Medicine', iconName: 'Clinical Toxicology & Forensic Medicine', color: 'text-gray-500', level: 'Level 5', semester: 'Semester 10' },
    { name: 'UE 3', iconName: 'UE 3', color: 'text-yellow-600', level: 'Level 5', semester: 'Semester 10' },
  ],
};

// Fallback data in case a semester isn't found
export const subjectsData: Subject[] = [
  { name: 'Cardiology', iconName: 'Cardiology', color: 'text-red-400', level: '?', semester: '?' },
  { name: 'Neurology', iconName: 'Neurology', color: 'text-blue-400', level: '?', semester: '?' },
  { name: 'Genetics', iconName: 'Genetics', color: 'text-purple-400', level: '?', semester: '?' },
  { name: 'Anatomy', iconName: 'Anatomy', color: 'text-gray-400', level: '?', semester: '?' },
  { name: 'Immunology', iconName: 'Immunology', color: 'text-yellow-400', level: '?', semester: '?' },
  { name: 'Biochemistry', iconName: 'Biochemistry', color: 'text-green-400', level: '?', semester: '?' },
  { name: 'Clinical Skills', iconName: 'Clinical Skills', color: 'text-teal-400', level: '?', semester: '?' },
  { name: 'Pathology', iconName: 'Pathology', color: 'text-pink-400', level: '?', semester: '?' },
];

export const allSubjects: Subject[] = Object.values(subjectsBySemester).flat();
