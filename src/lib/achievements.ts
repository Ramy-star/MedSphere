'use client';
import { 
    UploadCloud, FolderPlus, FolderKanban, Library, FileCheck2, GraduationCap, 
    MessageSquareQuote, BrainCircuit, Sunrise, CalendarDays, HeartHandshake, Moon, Compass
} from 'lucide-react';
import React from 'react';

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'special';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.FC<any>;
  tier: AchievementTier;
  category: 'Organization & Contribution' | 'Learning & Interaction' | 'Consistency & Perseverance' | 'Special';
  condition: {
    stat: 'filesUploaded' | 'foldersCreated' | 'examsCompleted' | 'aiQueries' | 'consecutiveLoginDays' | 'accountAgeDays';
    value: number;
  };
  group: string; // To group related achievements
}

export const allAchievements: Achievement[] = [
  // --- Organization & Contribution ---
  {
    id: 'FILES_UPLOADED_10',
    name: 'Novice Documenter',
    description: 'Upload 10 files',
    icon: UploadCloud,
    tier: 'bronze',
    category: 'Organization & Contribution',
    condition: { stat: 'filesUploaded', value: 10 },
    group: 'filesUploaded',
  },
  {
    id: 'FILES_UPLOADED_50',
    name: 'Librarian',
    description: 'Upload 50 files',
    icon: UploadCloud,
    tier: 'silver',
    category: 'Organization & Contribution',
    condition: { stat: 'filesUploaded', value: 50 },
    group: 'filesUploaded',
  },
  {
    id: 'FILES_UPLOADED_200',
    name: 'Knowledge Archivist',
    description: 'Upload 200 files',
    icon: UploadCloud,
    tier: 'gold',
    category: 'Organization & Contribution',
    condition: { stat: 'filesUploaded', value: 200 },
    group: 'filesUploaded',
  },
  {
    id: 'FOLDERS_CREATED_10',
    name: 'Organizer',
    description: 'Create 10 folders',
    icon: FolderPlus,
    tier: 'bronze',
    category: 'Organization & Contribution',
    condition: { stat: 'foldersCreated', value: 10 },
    group: 'foldersCreated',
  },
  {
    id: 'FOLDERS_CREATED_50',
    name: 'Structure Architect',
    description: 'Create 50 folders',
    icon: FolderKanban,
    tier: 'silver',
    category: 'Organization & Contribution',
    condition: { stat: 'foldersCreated', value: 50 },
    group: 'foldersCreated',
  },
  {
    id: 'FOLDERS_CREATED_100',
    name: 'Taxonomy Expert',
    description: 'Create 100 folders',
    icon: Library,
    tier: 'gold',
    category: 'Organization & Contribution',
    condition: { stat: 'foldersCreated', value: 100 },
    group: 'foldersCreated',
  },
  // --- Learning & Academic Interaction ---
  {
    id: 'EXAMS_COMPLETED_5',
    name: 'Test Taker',
    description: 'Complete 5 exams',
    icon: FileCheck2,
    tier: 'bronze',
    category: 'Learning & Interaction',
    condition: { stat: 'examsCompleted', value: 5 },
    group: 'examsCompleted',
  },
  {
    id: 'EXAMS_COMPLETED_25',
    name: 'Exam Expert',
    description: 'Complete 25 exams',
    icon: FileCheck2,
    tier: 'silver',
    category: 'Learning & Interaction',
    condition: { stat: 'examsCompleted', value: 25 },
    group: 'examsCompleted',
  },
  {
    id: 'EXAMS_COMPLETED_100',
    name: 'Assessment Legend',
    description: 'Complete 100 exams',
    icon: GraduationCap,
    tier: 'gold',
    category: 'Learning & Interaction',
    condition: { stat: 'examsCompleted', value: 100 },
    group: 'examsCompleted',
  },
  {
    id: 'AI_QUERIES_20',
    name: 'Curious Mind',
    description: 'Ask the AI 20 questions',
    icon: MessageSquareQuote,
    tier: 'bronze',
    category: 'Learning & Interaction',
    condition: { stat: 'aiQueries', value: 20 },
    group: 'aiQueries',
  },
  {
    id: 'AI_QUERIES_100',
    name: 'Diligent Researcher',
    description: 'Ask the AI 100 questions',
    icon: MessageSquareQuote,
    tier: 'silver',
    category: 'Learning & Interaction',
    condition: { stat: 'aiQueries', value: 100 },
    group: 'aiQueries',
  },
  {
    id: 'AI_QUERIES_500',
    name: 'AI Conversationalist',
    description: 'Ask the AI 500 questions',
    icon: BrainCircuit,
    tier: 'gold',
    category: 'Learning & Interaction',
    condition: { stat: 'aiQueries', value: 500 },
    group: 'aiQueries',
  },
  // --- Consistency & Perseverance (Reordered) ---
  {
    id: 'FIRST_LOGIN',
    name: 'A Good Start',
    description: 'Log in for the first time',
    icon: Sunrise,
    tier: 'silver',
    category: 'Consistency & Perseverance',
    condition: { stat: 'consecutiveLoginDays', value: 1 },
    group: 'milestones',
  },
  {
    id: 'LOGIN_STREAK_7',
    name: 'Consistent',
    description: 'Log in for 7 consecutive days',
    icon: CalendarDays,
    tier: 'bronze',
    category: 'Consistency & Perseverance',
    condition: { stat: 'consecutiveLoginDays', value: 7 },
    group: 'loginStreak',
  },
  {
    id: 'LOGIN_STREAK_30',
    name: 'Routine',
    description: 'Log in for 30 consecutive days',
    icon: CalendarDays,
    tier: 'silver',
    category: 'Consistency & Perseverance',
    condition: { stat: 'consecutiveLoginDays', value: 30 },
    group: 'loginStreak',
  },
  {
    id: 'ONE_YEAR_MEMBER',
    name: 'Dedicated Companion',
    description: 'Complete one full year as a member',
    icon: HeartHandshake,
    tier: 'gold',
    category: 'Consistency & Perseverance',
    condition: { stat: 'accountAgeDays', value: 365 },
    group: 'milestones',
  },
  // --- Special & Hidden Badges ---
  {
    id: 'NIGHT_OWL',
    name: 'Night Owl',
    description: 'Complete an exam between midnight and 4 AM',
    icon: Moon,
    tier: 'special',
    category: 'Special',
    condition: { stat: 'examsCompleted', value: -1 }, // Special condition handled in code
    group: 'hidden',
  },
  {
    id: 'EXPLORER',
    name: 'Explorer',
    description: 'Visit every main section of the app',
    icon: Compass,
    tier: 'special',
    category: 'Special',
    condition: { stat: 'examsCompleted', value: -1 }, // Special condition handled in code
    group: 'hidden',
  },
];