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

export interface Lecture {
  id: string;
  name: string;
  mcqs_level_1: MCQ[];
  mcqs_level_2: MCQ[];
  written: WrittenCase[];
}
