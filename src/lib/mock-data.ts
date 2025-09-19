import { PlaceHolderImages } from './placeholder-images';

export interface StudyYear {
  year: string;
}

export interface Semester {
  id: string;
  name: string;
}

export interface Subject {
  id: string;
  name: string;
  year: string;
  fileCount: number;
}

export interface MedicalFile {
  id: string;
  title: string;
  subject: string;
  year: string;
  semester: string;
  thumbnailUrl: string;
  imageHint: string;
  fileUrl: string;
  content: string;
  metadata: {
    type: string;
    size: string;
  };
}

export const mockYears: StudyYear[] = [
  { year: '2024-2025' },
  { year: '2023-2024' },
  { year: '2022-2023' },
];

export const mockSemesters: Semester[] = [
  { id: 'fall', name: 'Fall' },
  { id: 'spring', name: 'Spring' },
];

export const mockSubjects: Subject[] = [
  { id: 'anat', name: 'Anatomy', year: '2024-2025', fileCount: 1 },
  { id: 'pharm', name: 'Pharmacology', year: '2024-2025', fileCount: 1 },
  { id: 'path', name: 'Pathology', year: '2023-2024', fileCount: 1 },
  { id: 'cardio', name: 'Cardiology', year: '2023-2024', fileCount: 1 },
  { id: 'neuro', name: 'Neurology', year: '2022-2023', fileCount: 1 },
  { id: 'gen', name: 'Genetics', year: '2022-2023', fileCount: 1 },
  { id: 'biochem', name: 'Biochemistry', year: '2024-2025', fileCount: 1},
  { id: 'immuno', name: 'Immunology', year: '2023-2024', fileCount: 1},
];

const getImage = (id: string) => {
    return PlaceHolderImages.find(img => img.id === id) || PlaceHolderImages[0];
}

export const mockFiles: MedicalFile[] = [
  {
    id: 'file-1',
    title: 'Skeletal System Overview',
    subject: 'Anatomy',
    year: '2024-2025',
    semester: 'Fall',
    thumbnailUrl: getImage('anatomy-1').imageUrl,
    imageHint: getImage('anatomy-1').imageHint,
    fileUrl: '#',
    content: 'This document provides a comprehensive overview of the human skeletal system, including bone classification, structure, and function. It covers the axial and appendicular skeletons in detail.',
    metadata: { type: 'PDF', size: '2.5 MB' },
  },
  {
    id: 'file-2',
    title: 'Beta-Blockers Mechanism',
    subject: 'Pharmacology',
    year: '2024-2025',
    semester: 'Fall',
    thumbnailUrl: getImage('pharma-1').imageUrl,
    imageHint: getImage('pharma-1').imageHint,
    fileUrl: '#',
    content: 'A presentation on the mechanism of action, therapeutic uses, and adverse effects of beta-blockers in cardiovascular diseases. Focuses on receptor selectivity.',
    metadata: { type: 'PPTX', size: '5.1 MB' },
  },
  {
    id: 'file-3',
    title: 'Cellular Injury and Adaptation',
    subject: 'Pathology',
    year: '2023-2024',
    semester: 'Spring',
    thumbnailUrl: getImage('pathology-1').imageUrl,
    imageHint: getImage('pathology-1').imageHint,
    fileUrl: '#',
    content: 'Lecture notes covering the fundamental concepts of pathology, including causes of cellular injury, mechanisms of cell death (necrosis and apoptosis), and cellular adaptations like hypertrophy and atrophy.',
    metadata: { type: 'PDF', size: '3.8 MB' },
  },
  {
    id: 'file-4',
    title: 'Interpreting ECGs',
    subject: 'Cardiology',
    year: '2023-2024',
    semester: 'Fall',
    thumbnailUrl: getImage('cardiology-1').imageUrl,
    imageHint: getImage('cardiology-1').imageHint,
    fileUrl: '#',
    content: 'A practical guide to electrocardiogram (ECG) interpretation. This document reviews normal ECG waveforms, intervals, and axes, and introduces common abnormalities such as arrhythmias and ischemia.',
    metadata: { type: 'PDF', size: '4.2 MB' },
  },
   {
    id: 'file-5',
    title: 'Circle of Willis',
    subject: 'Neurology',
    year: '2022-2023',
    semester: 'Fall',
    thumbnailUrl: getImage('neurology-1').imageUrl,
    imageHint: getImage('neurology-1').imageHint,
    fileUrl: '#',
    content: 'Detailed anatomical diagrams and clinical correlations of the Circle of Willis. Discusses common sites of aneurysms and the consequences of strokes affecting this vascular network.',
    metadata: { type: 'PNG', size: '1.2 MB' },
  },
  {
    id: 'file-6',
    title: 'CRISPR-Cas9 Technology',
    subject: 'Genetics',
    year: '2022-2023',
    semester: 'Spring',
    thumbnailUrl: getImage('genetics-1').imageUrl,
    imageHint: getImage('genetics-1').imageHint,
    fileUrl: '#',
    content: 'An in-depth review of CRISPR-Cas9 gene-editing technology. Explores its mechanism, applications in genetic research and therapy, and ethical considerations.',
    metadata: { type: 'DOCX', size: '0.8 MB' },
  },
  {
    id: 'file-7',
    title: 'Glycolysis Pathway',
    subject: 'Biochemistry',
    year: '2024-2025',
    semester: 'Fall',
    thumbnailUrl: getImage('biochem-1').imageUrl,
    imageHint: getImage('biochem-1').imageHint,
    fileUrl: '#',
    content: 'A summary sheet of the glycolysis pathway, detailing each of the ten enzymatic reactions, key regulatory steps, and the net production of ATP and NADH. Includes mnemonic aids for memorization.',
    metadata: { type: 'PDF', size: '1.5 MB' },
  },
  {
    id: 'file-8',
    title: 'Antibody Structure and Function',
    subject: 'Immunology',
    year: '2023-2024',
    semester: 'Spring',
    thumbnailUrl: getImage('immunology-1').imageUrl,
    imageHint: getImage('immunology-1').imageHint,
    fileUrl: '#',
    content: 'This presentation covers the structure of immunoglobulins (antibodies), the different isotypes (IgG, IgM, IgA, IgD, IgE), and their respective functions in the adaptive immune response.',
    metadata: { type: 'PPTX', size: '6.3 MB' },
  },
];
