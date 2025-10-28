
import { 
    UploadCloud, FolderPlus, FolderKanban, Library, FileCheck2, GraduationCap, 
    MessageSquareQuote, BrainCircuit, Sunrise, CalendarDays, HeartHandshake, Moon, Compass, Wand2, ZoomIn 
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'special';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  tier: AchievementTier;
  category: 'Organization' | 'Learning' | 'Consistency' | 'Special';
  condition: {
    stat: 'filesUploaded' | 'foldersCreated' | 'examsCompleted' | 'aiQueries' | 'consecutiveLoginDays' | 'accountAgeDays';
    value: number;
  };
}

export const allAchievements: Achievement[] = [
  // --- Organization & Contribution ---
  {
    id: 'FILES_UPLOADED_10',
    name: 'الموثِّق المبتدئ',
    description: 'رفع 10 ملفات',
    icon: UploadCloud,
    tier: 'bronze',
    category: 'Organization',
    condition: { stat: 'filesUploaded', value: 10 },
  },
  {
    id: 'FILES_UPLOADED_50',
    name: 'أمين المكتبة',
    description: 'رفع 50 ملفًا',
    icon: UploadCloud,
    tier: 'silver',
    category: 'Organization',
    condition: { stat: 'filesUploaded', value: 50 },
  },
  {
    id: 'FILES_UPLOADED_200',
    name: 'أرشيف المعرفة',
    description: 'رفع 200 ملف',
    icon: UploadCloud,
    tier: 'gold',
    category: 'Organization',
    condition: { stat: 'filesUploaded', value: 200 },
  },
  {
    id: 'FOLDERS_CREATED_10',
    name: 'المُنظِّم',
    description: 'إنشاء 10 مجلدات',
    icon: FolderPlus,
    tier: 'bronze',
    category: 'Organization',
    condition: { stat: 'foldersCreated', value: 10 },
  },
  {
    id: 'FOLDERS_CREATED_50',
    name: 'مهندس الهيكل',
    description: 'إنشاء 50 مجلدًا',
    icon: FolderKanban,
    tier: 'silver',
    category: 'Organization',
    condition: { stat: 'foldersCreated', value: 50 },
  },
  {
    id: 'FOLDERS_CREATED_100',
    name: 'خبير التصنيف',
    description: 'إنشاء 100 مجلد',
    icon: Library,
    tier: 'gold',
    category: 'Organization',
    condition: { stat: 'foldersCreated', value: 100 },
  },
  // --- Learning & Academic Interaction ---
  {
    id: 'EXAMS_COMPLETED_5',
    name: 'المُختبِر',
    description: 'إكمال 5 اختبارات',
    icon: FileCheck2,
    tier: 'bronze',
    category: 'Learning',
    condition: { stat: 'examsCompleted', value: 5 },
  },
  {
    id: 'EXAMS_COMPLETED_25',
    name: 'خبير الامتحانات',
    description: 'إكمال 25 اختبارًا',
    icon: FileCheck2,
    tier: 'silver',
    category: 'Learning',
    condition: { stat: 'examsCompleted', value: 25 },
  },
  {
    id: 'EXAMS_COMPLETED_100',
    name: 'أسطورة التقييم',
    description: 'إكمال 100 اختبار',
    icon: GraduationCap,
    tier: 'gold',
    category: 'Learning',
    condition: { stat: 'examsCompleted', value: 100 },
  },
  {
    id: 'AI_QUERIES_20',
    name: 'الفضولي',
    description: 'طرح 20 سؤالاً على الذكاء الاصطناعي',
    icon: MessageSquareQuote,
    tier: 'bronze',
    category: 'Learning',
    condition: { stat: 'aiQueries', value: 20 },
  },
  {
    id: 'AI_QUERIES_100',
    name: 'الباحث الدؤوب',
    description: 'طرح 100 سؤال على الذكاء الاصطناعي',
    icon: MessageSquareQuote,
    tier: 'silver',
    category: 'Learning',
    condition: { stat: 'aiQueries', value: 100 },
  },
  {
    id: 'AI_QUERIES_500',
    name: 'المحاور الذكي',
    description: 'طرح 500 سؤال على الذكاء الاصطناعي',
    icon: BrainCircuit,
    tier: 'gold',
    category: 'Learning',
    condition: { stat: 'aiQueries', value: 500 },
  },
  // --- Consistency & Perseverance ---
  {
    id: 'FIRST_LOGIN',
    name: 'بداية موفقة',
    description: 'تسجيل الدخول لأول مرة',
    icon: Sunrise,
    tier: 'special',
    category: 'Consistency',
    condition: { stat: 'consecutiveLoginDays', value: 1 },
  },
  {
    id: 'LOGIN_STREAK_7',
    name: 'المواظب',
    description: 'تسجيل الدخول لمدة 7 أيام متتالية',
    icon: CalendarDays,
    tier: 'bronze',
    category: 'Consistency',
    condition: { stat: 'consecutiveLoginDays', value: 7 },
  },
  {
    id: 'LOGIN_STREAK_30',
    name: 'الروتيني',
    description: 'تسجيل الدخول لمدة 30 يومًا متتاليًا',
    icon: CalendarDays,
    tier: 'silver',
    category: 'Consistency',
    condition: { stat: 'consecutiveLoginDays', value: 30 },
  },
  {
    id: 'ONE_YEAR_MEMBER',
    name: 'رفيق الدرب',
    description: 'إكمال سنة كاملة كعضو في MedSphere',
    icon: HeartHandshake,
    tier: 'gold',
    category: 'Consistency',
    condition: { stat: 'accountAgeDays', value: 365 },
  },
  // --- Special & Hidden Badges ---
  {
    id: 'NIGHT_OWL',
    name: 'البومة الليلية',
    description: 'إكمال اختبار بين منتصف الليل و4 صباحًا',
    icon: Moon,
    tier: 'special',
    category: 'Special',
    condition: { stat: 'examsCompleted', value: -1 }, // Special condition handled in code
  },
  {
    id: 'EXPLORER',
    name: 'المستكشف',
    description: 'زيارة كل قسم رئيسي في التطبيق',
    icon: Compass,
    tier: 'special',
    category: 'Special',
    condition: { stat: 'examsCompleted', value: -1 }, // Special condition handled in code
  },
];
