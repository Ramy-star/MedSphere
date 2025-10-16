
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { contentService } from '@/lib/contentService';
import { generateQuestions, convertQuestionsToJson } from '@/ai/flows/question-gen-flow';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/firebase';

type GenerationStatus = 'idle' | 'extracting' | 'generating_text' | 'converting_json' | 'completed' | 'error';

interface GenerationTask {
  id: string;
  fileName: string;
  sourceFileId: string;
  fileUrl?: string; // For generating from existing files
  file?: File; // For generating from new uploads
  status: GenerationStatus;
  textQuestions: string | null;
  jsonQuestions: string | null;
  error: string | null;
  progress: number;
}

interface QuestionGenerationState {
  task: GenerationTask | null;
  startGenerationWithFile: (file: File, genPrompt: string, jsonPrompt: string) => Promise<void>;
  startGeneration: (id: string, fileName: string, fileUrl: string) => void;
  saveCurrentResults: (userId: string) => Promise<void>;
  clearTask: () => void;
}

const updateTask = (state: QuestionGenerationState, partialTask: Partial<GenerationTask>): QuestionGenerationState => ({
  ...state,
  task: state.task ? { ...state.task, ...partialTask } : null,
});

async function runGenerationProcess(
    sourceFileId: string,
    fileUrl: string | undefined, 
    file: File | undefined, 
    genPrompt: string, 
    jsonPrompt: string,
    set: (updater: (state: QuestionGenerationState) => QuestionGenerationState) => void
) {
    let pdf: PDFDocumentProxy | undefined;
    let documentText: string = '';
    let imageUris: string[] = [];

    try {
        set(state => updateTask(state, { status: 'extracting', progress: 10 }));
        
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

        let fileSource: any = fileUrl;
        if(file) {
            fileSource = await file.arrayBuffer();
        }

        pdf = await pdfjs.getDocument(fileSource).promise as PDFDocumentProxy;
        documentText = await contentService.extractTextFromPdf(pdf);
        set(state => updateTask(state, { progress: 30 }));


        set(state => updateTask(state, { status: 'generating_text', progress: 50 }));
        const generatedText = await generateQuestions({
            prompt: genPrompt,
            documentContent: documentText,
            images: imageUris
        });
        set(state => updateTask(state, { textQuestions: generatedText, progress: 70 }));

        set(state => updateTask(state, { status: 'converting_json', progress: 80 }));
        const generatedJson = await convertQuestionsToJson({ prompt: jsonPrompt, questionsText: generatedText });
        set(state => updateTask(state, { jsonQuestions: generatedJson, status: 'completed', progress: 100 }));

    } catch (err: any) {
        console.error("Error during question generation process:", err);
        set(state => updateTask(state, { status: 'error', error: err.message || 'An unexpected error occurred.' }));
    }
}


export const useQuestionGenerationStore = create<QuestionGenerationState>()(
  (set, get) => ({
    task: null,
    startGenerationWithFile: async (file, genPrompt, jsonPrompt) => {
        // This function is for new uploads, so we don't have a sourceFileId yet.
        // This might need adjustment if new uploads should be associated with something.
        const taskId = `task_${Date.now()}`;
        set({
          task: {
            id: taskId,
            fileName: file.name,
            sourceFileId: '', // No source ID for new uploads
            file: file,
            status: 'idle',
            textQuestions: null,
            jsonQuestions: null,
            error: null,
            progress: 0,
          },
        });
        runGenerationProcess('', undefined, file, genPrompt, jsonPrompt, set);
    },
    startGeneration: (id, fileName, fileUrl) => {
        const taskId = `task_${Date.now()}`;
        set({
          task: {
            id: taskId,
            fileName: fileName,
            sourceFileId: id, // The ID of the source file
            fileUrl: fileUrl,
            status: 'idle',
            textQuestions: null,
            jsonQuestions: null,
            error: null,
            progress: 0,
          },
        });
        const genPrompt = localStorage.getItem('questionGenPrompt') || '';
        const jsonPrompt = localStorage.getItem('questionJsonPrompt') || '';
        runGenerationProcess(id, fileUrl, undefined, genPrompt, jsonPrompt, set);
    },
    saveCurrentResults: async (userId: string) => {
        const { task } = get();
        if (!task || !task.textQuestions || !task.jsonQuestions || !task.fileName) {
            throw new Error("No completed task to save.");
        }

        const collectionRef = collection(db, `users/${userId}/questionSets`);
        await addDoc(collectionRef, {
            fileName: task.fileName,
            textQuestions: task.textQuestions,
            jsonQuestions: task.jsonQuestions,
            createdAt: new Date().toISOString(),
            userId: userId,
            sourceFileId: task.sourceFileId, // Save the source file ID
        });
    },
    clearTask: () => {
        set({ task: null });
    },
  })
);
