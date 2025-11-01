export interface MCQ {
  q: string;
  o: string[];
  a: string;
}

export interface WrittenSubQuestion {
  q: string;
  a: string;
}

export interface WrittenCase {
    case: string;
    subqs: WrittenSubQuestion[];
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  imageUrl?: string;
  color?: string;
}

export interface Lecture {
  id: string;
  name: string;
  mcqs_level_1?: MCQ[];
  mcqs_level_2?: MCQ[];
  written?: WrittenCase[];
  flashcards?: Flashcard[];
}

export interface ExamResult {
    id?: string; // Document ID from Firestore
    lectureId: string;
    score: number;
    totalQuestions: number;
    percentage: number;
    timestamp: Date;
    userId: string;
}

export interface Note {
  id: string;
  content: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  sourceFileId?: string;
  pageNumber?: number;
}
