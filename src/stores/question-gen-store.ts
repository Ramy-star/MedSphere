
import { create } from 'zustand';
import { contentService } from '@/lib/contentService';
import { generateQuestions, convertQuestionsToJson } from '@/ai/flows/question-gen-flow';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/firebase';

type GenerationStatus = 'idle' | 'extracting' | 'generating_text' | 'converting_json' | 'completed' | 'error';
type FailedStep = 'extracting' | 'generating_text' | 'converting_json' | null;

interface GenerationTask {
  id: string;
  fileName: string;
  sourceFileId: string;
  fileUrl?: string; // For generating from existing files
  file?: File; // For generating from new uploads
  status: GenerationStatus;
  failedStep: FailedStep;
  documentText: string | null;
  textQuestions: string | null;
  jsonQuestions: string | null;
  error: string | null;
  progress: number;
}

interface QuestionGenerationState {
  task: GenerationTask | null;
  isSaved: boolean;
  startGenerationWithFile: (file: File, genPrompt: string, jsonPrompt: string) => Promise<void>;
  startGeneration: (id: string, fileName: string, fileUrl: string) => void;
  saveCurrentResults: (userId: string) => Promise<void>;
  clearTask: () => void;
  markAsSaved: () => void;
  retryGeneration: (genPrompt: string, jsonPrompt: string) => Promise<void>;
}

const updateTask = (state: QuestionGenerationState, partialTask: Partial<GenerationTask>): QuestionGenerationState => ({
  ...state,
  task: state.task ? { ...state.task, ...partialTask } : null,
});

async function runGenerationProcess(
    task: GenerationTask,
    genPrompt: string, 
    jsonPrompt: string,
    set: (updater: (state: QuestionGenerationState) => QuestionGenerationState) => void
) {
    let { documentText, textQuestions } = task;

    try {
        // Step 1: Text Extraction (if not already done)
        if (!documentText) {
            set(state => updateTask(state, { status: 'extracting', progress: 10, error: null, failedStep: null }));
            const pdfjs = await import('pdfjs-dist');
            pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

            let fileSource: any = task.fileUrl;
            if (task.file) {
                fileSource = await task.file.arrayBuffer();
            }

            const pdf = await pdfjs.getDocument(fileSource).promise as PDFDocumentProxy;
            documentText = await contentService.extractTextFromPdf(pdf);
            set(state => updateTask(state, { documentText, progress: 30 }));
        }

        // Step 2: Generate Text Questions (if not already done)
        if (!textQuestions) {
            set(state => updateTask(state, { status: 'generating_text', progress: 50, error: null, failedStep: null }));
            const generatedText = await generateQuestions({
                prompt: genPrompt,
                documentContent: documentText!,
                images: [] // images not currently supported in this flow
            });
            textQuestions = generatedText;
            set(state => updateTask(state, { textQuestions, progress: 70 }));
        }

        // Step 3: Convert to JSON
        set(state => updateTask(state, { status: 'converting_json', progress: 80, error: null, failedStep: null }));
        const generatedJson = await convertQuestionsToJson({ prompt: jsonPrompt, questionsText: textQuestions! });
        set(state => ({
            ...updateTask(state, { jsonQuestions: generatedJson, status: 'completed', progress: 100, failedStep: null }),
            isSaved: false // Mark as unsaved upon completion
        }));

    } catch (err: any) {
        console.error("Error during question generation process:", err);
        const currentStatus = task.status;
        let failedStep: FailedStep = null;
        if(currentStatus === 'extracting') failedStep = 'extracting';
        if(currentStatus === 'generating_text') failedStep = 'generating_text';
        if(currentStatus === 'converting_json') failedStep = 'converting_json';
        
        set(state => updateTask(state, { status: 'error', failedStep, error: err.message || 'An unexpected error occurred.' }));
    }
}


export const useQuestionGenerationStore = create<QuestionGenerationState>()(
  (set, get) => ({
    task: null,
    isSaved: true,
    startGenerationWithFile: async (file, genPrompt, jsonPrompt) => {
        const taskId = `task_${Date.now()}`;
        const newTask: GenerationTask = {
            id: taskId,
            fileName: file.name,
            sourceFileId: '', 
            file: file,
            status: 'idle',
            failedStep: null,
            documentText: null,
            textQuestions: null,
            jsonQuestions: null,
            error: null,
            progress: 0,
        };
        set({ task: newTask, isSaved: true });
        runGenerationProcess(newTask, genPrompt, jsonPrompt, set);
    },
    startGeneration: (id, fileName, fileUrl) => {
        const taskId = `task_${Date.now()}`;
        const newTask: GenerationTask = {
            id: taskId,
            fileName: fileName,
            sourceFileId: id,
            fileUrl: fileUrl,
            status: 'idle',
            failedStep: null,
            documentText: null,
            textQuestions: null,
            jsonQuestions: null,
            error: null,
            progress: 0,
        };
        set({ task: newTask, isSaved: true });
        const genPrompt = localStorage.getItem('questionGenPrompt') || '';
        const jsonPrompt = localStorage.getItem('questionJsonPrompt') || '';
        runGenerationProcess(newTask, genPrompt, jsonPrompt, set);
    },
    retryGeneration: async (genPrompt, jsonPrompt) => {
        const { task } = get();
        if(!task || task.status !== 'error') return;

        // Reset error state and re-run
        runGenerationProcess(task, genPrompt, jsonPrompt, set);
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
            sourceFileId: task.sourceFileId,
        });
        
        set({ isSaved: true });
    },
    clearTask: () => {
        set({ task: null, isSaved: true });
    },
    markAsSaved: () => {
      set({ isSaved: true });
    }
  })
);
