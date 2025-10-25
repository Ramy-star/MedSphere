
import type { Lecture } from './types';

// Replace this with your actual data fetching logic
export const lecturesData: Lecture[] = [
  {
    "id": "1",
    "name": "Introduction to Anatomy",
    "mcqs_level_1": [
      { "q": "1. What is the largest organ in the human body?", "o": ["a) Liver", "b) Brain", "c) Skin", "d) Heart"], "a": "c) Skin" },
      { "q": "2. How many bones are in the adult human body?", "o": ["a) 206", "b) 300", "c) 150", "d) 256"], "a": "a) 206" }
    ],
    "mcqs_level_2": [
      { "q": "1. Which part of the brain is responsible for balance?", "o": ["a) Cerebrum", "b) Cerebellum", "c) Brainstem", "d) Medulla"], "a": "b) Cerebellum" },
      { "q": "2. What is the function of the alveoli?", "o": ["a) Pumping blood", "b) Filtering waste", "c) Gas exchange", "d) Hormone production"], "a": "c) Gas exchange" }
    ],
    "written": [
      { 
        "case": "A 45-year-old male presents with sharp pain in the upper right quadrant of his abdomen.",
        "subqs": [
          { "q": "What are the possible differential diagnoses?", "a": "Possible diagnoses include cholecystitis, pancreatitis, or a peptic ulcer." },
          { "q": "Which anatomical structures are located in this quadrant?", "a": "The liver, gallbladder, duodenum, head of the pancreas, and right kidney." }
        ]
      }
    ],
    "flashcards": [
        { "id": "f1", "front": "What is the capital of France?", "back": "Paris" },
        { "id": "f2", "front": "What is 2 + 2?", "back": "4" }
    ]
  },
  {
    "id": "2",
    "name": "Pharmacology Basics",
    "mcqs_level_1": [
      { "q": "1. What does pharmacokinetics involve?", "o": ["a) What the drug does to the body", "b) What the body does to the drug", "c) Drug-drug interactions", "d) Drug formulation"], "a": "b) What the body does to the drug" },
      { "q": "2. What is an agonist?", "o": ["a) A drug that blocks a receptor", "b) A drug that activates a receptor", "c) A drug that has no effect", "d) A type of antibiotic"], "a": "b) A drug that activates a receptor" }
    ],
    "mcqs_level_2": [],
    "written": [],
    "flashcards": [
        { "id": "f3", "front": "What is the chemical symbol for water?", "back": "H2O" },
        { "id": "f4", "front": "Who wrote 'Hamlet'?", "back": "William Shakespeare", "color": "#BBDEFB" }
    ]
  }
];

// Placeholder for data not included in the prompt
const data = lecturesData;

export { data };
