import { 
    Bone, Microscope, Activity, FlaskConical, Brain, BarChart3, Lightbulb, Languages, Pill, Bug, Shield, DnaIcon, Syringe, Stethoscope,
    Wind, HeartPulse, UserCheck, Briefcase, Speech, GitMerge, Airplay, Globe, Dna, HelpingHand, Users, TestTube2, Baby, Eye, Ear,
    FolderKanban, Star, Ambulance, Home, Scale, Folder as FolderIcon, type LucideIcon, Inbox
} from 'lucide-react';
import type { Content } from './contentService';
import { SurgeryIcon } from '@/components/icons/SurgeryIcon';

export const allSubjectIcons: { [key: string]: LucideIcon } = {
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
    'Medicine 1': Stethoscope,
    'Surgery 1': SurgeryIcon,
    'Leadership Skills': Users,
    'Biomedical Research': TestTube2,
    'Pediatrics 1': Baby,
    'Gynecology 1': Dna,
    Ophthalmology: Eye,
    Otorhinolaryngology: Ear,
    'Community Medicine': Users,
    Economics: BarChart3,
    'Medicine 2': Stethoscope,
    'Surgery 2': SurgeryIcon,
    'Hospital Management': FolderKanban,
    'UE 2': Star,
    'Pediatrics 2': Baby,
    'Gynecology 2': Dna,
    'Emergency Medicine': Ambulance,
    'Family Medicine': Home,
    Toxicology: Scale,
    'UE 3': Star,
    Inbox: Inbox,
};

const levelsRaw = [
  { id: 'level-1', name: 'Level 1', semesters: [{id: 'sem-1', name: 'Semester 1'}, {id: 'sem-2', name: 'Semester 2'}] },
  { id: 'level-2', name: 'Level 2', semesters: [{id: 'sem-3', name: 'Semester 3'}, {id: 'sem-4', name: 'Semester 4'}] },
  { id: 'level-3', name: 'Level 3', semesters: [{id: 'sem-5', name: 'Semester 5'}, {id: 'sem-6', name: 'Semester 6'}] },
  { id: 'level-4', name: 'Level 4', semesters: [{id: 'sem-7', name: 'Semester 7'}, {id: 'sem-8', name: 'Semester 8'}] },
  { id: 'level-5', name: 'Level 5', semesters: [{id: 'sem-9', name: 'Semester 9'}, {id: 'sem-10', name: 'Semester 10'}] },
];

const subjectsBySemesterRaw: { [key: string]: Omit<Content, 'id' | 'parentId' | 'type'>[] } = {
  'Semester 1': [
    { name: 'Anatomy', iconName: 'Anatomy', color: 'text-gray-400' },
    { name: 'Histology', iconName: 'Histology', color: 'text-pink-400' },
    { name: 'Physiology', iconName: 'Physiology', color: 'text-green-400' },
    { name: 'Biochemistry', iconName: 'Biochemistry', color: 'text-yellow-400' },
    { name: 'Psychology', iconName: 'Psychology', color: 'text-blue-400' },
    { name: 'Biostatistics', iconName: 'Biostatistics', color: 'text-orange-400' },
    { name: 'Learning Skills', iconName: 'Learning Skills', color: 'text-purple-400' },
    { name: 'Arabic', iconName: 'Arabic', color: 'text-teal-400' },
  ],
  'Semester 2': [
    { name: 'Pharmacology', iconName: 'Pharmacology', color: 'text-red-400' },
    { name: 'Pathology', iconName: 'Pathology', color: 'text-pink-500' },
    { name: 'Immunology', iconName: 'Immunology', color: 'text-yellow-500' },
    { name: 'Microbiology', iconName: 'Microbiology', color: 'text-purple-400' },
    { name: 'Parasitology', iconName: 'Parasitology', color: 'text-green-500' },
    { name: 'Clinical Practice', iconName: 'Clinical Practice', color: 'text-blue-400' },
    { name: 'Arabic', iconName: 'Arabic', color: 'text-teal-400' },
  ],
   'Semester 3': [
    { name: 'Blood', iconName: 'Blood', color: 'text-red-500', },
    { name: 'Locomotor', iconName: 'Locomotor', color: 'text-gray-400', },
    { name: 'Clinical 1', iconName: 'Clinical 1', color: 'text-blue-400', },
    { name: 'Communication Skills', iconName: 'Communication Skills', color: 'text-green-400', },
    { name: 'Enterpreneurship', iconName: 'Enterpreneurship', color: 'text-yellow-500', },
  ],
  'Semester 4': [
    { name: 'Respiratory', iconName: 'Respiratory', color: 'text-cyan-400', },
    { name: 'CVS', iconName: 'CVS', color: 'text-red-400', },
    { name: 'Clinical 2', iconName: 'Clinical 2', color: 'text-blue-500', },
    { name: 'Critical Thinking', iconName: 'Critical Thinking', color: 'text-yellow-400', },
  ],
  'Semester 5': [
    { name: 'CNS', iconName: 'CNS', color: 'text-blue-400', },
    { name: 'Special Senses', iconName: 'Special Senses', color: 'text-purple-400', },
    { name: 'Endocrine', iconName: 'Endocrine', color: 'text-orange-400', },
    { name: 'Clinical 3', iconName: 'Clinical 3', color: 'text-blue-600', },
    { name: 'Climate Change', iconName: 'Climate Change', color: 'text-green-500', },
  ],
  'Semester 6': [
    { name: 'GIT', iconName: 'GIT', color: 'text-yellow-600', },
    { name: 'Urogenital', iconName: 'Urogenital', color: 'text-purple-500', },
    { name: 'Clinical 4', iconName: 'Clinical 4', color: 'text-blue-700', },
    { name: 'Human Rights', iconName: 'Human Rights', color: 'text-red-400', },
  ],
  'Semester 7': [
    { name: 'Medicine 1', iconName: 'Medicine 1', color: 'text-blue-500', },
    { name: 'Surgery 1', iconName: 'Surgery 1', color: 'text-green-500', },
    { name: 'Leadership Skills', iconName: 'Leadership Skills', color: 'text-yellow-500', },
    { name: 'Biomedical Research', iconName: 'Biomedical Research', color: 'text-orange-500', },
  ],
  'Semester 8': [
    { name: 'Pediatrics 1', iconName: 'Pediatrics 1', color: 'text-pink-400', },
    { name: 'Gynecology 1', iconName: 'Gynecology 1', color: 'text-red-400', },
    { name: 'Ophthalmology', iconName: 'Ophthalmology', color: 'text-blue-400', },
    { name: 'Otorhinolaryngology', iconName: 'Otorhinolaryngology', color: 'text-purple-400', },
    { name: 'Community Medicine', iconName: 'Community Medicine', color: 'text-green-400', },
    { name: 'Economics', iconName: 'Economics', color: 'text-yellow-400', },
  ],
  'Semester 9': [
    { name: 'Medicine 2', iconName: 'Medicine 2', color: 'text-blue-600', },
    { name: 'Surgery 2', iconName: 'Surgery 2', color: 'text-green-600', },
    { name: 'Hospital Management', iconName: 'Hospital Management', color: 'text-gray-400', },
    { name: 'UE 2', iconName: 'UE 2', color: 'text-yellow-500', },
  ],
  'Semester 10': [
    { name: 'Pediatrics 2', iconName: 'Pediatrics 2', color: 'text-pink-500', },
    { name: 'Gynecology 2', iconName: 'Gynecology 2', color: 'text-red-500', },
    { name: 'Emergency Medicine', iconName: 'Emergency Medicine', color: 'text-red-600', },
    { name: 'Family Medicine', iconName: 'Family Medicine', color: 'text-green-500', },
    { name: 'Toxicology', iconName: 'Toxicology', color: 'text-gray-500', },
    { name: 'UE 3', iconName: 'UE 3', color: 'text-yellow-600', },
  ],
};

export const telegramInbox: Content = {
    id: 'telegram-inbox-folder', // Fixed ID
    name: 'Telegram Inbox',
    type: 'FOLDER',
    parentId: null,
    iconName: 'Inbox',
    color: 'text-blue-400',
    metadata: {
        isHidden: true,
    }
};

export const allContent: Content[] = [];

levelsRaw.forEach(level => {
    allContent.push({
        id: level.id,
        name: level.name,
        type: 'LEVEL',
        parentId: null,
    });

    level.semesters.forEach(semester => {
        allContent.push({
            id: semester.id,
            name: semester.name,
            type: 'SEMESTER',
            parentId: level.id,
        });

        const subjects = subjectsBySemesterRaw[semester.name];
        if (subjects) {
            subjects.forEach(subject => {
                const subjectId = `${semester.id}-${subject.name.toLowerCase().replace(/ /g, '-')}`;
                allContent.push({
                    id: subjectId,
                    ...subject,
                    type: 'SUBJECT',
                    parentId: semester.id
                });
            });
        }
    });
});
