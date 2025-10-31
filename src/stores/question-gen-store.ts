import { create } from 'zustand';
import { contentService } from '@/lib/contentService';
import { generateQuestions, type GeneratedQuestionData } from '@/ai/flows/question-gen-flow';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Lecture } from '@/lib/types';
import * as pdfjs from 'pdfjs-dist';

if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

type GenerationStatus = 'idle' | 'processing' | 'completed' | 'error';
type GenerationFlowStep = 'idle' | 'awaiting_options' | 'processing' | 'completed' | 'error' | 'awaiting_confirmation';

export interface GenerationOptions {
    generateQuestions: boolean;
    generateExam: boolean;
    generateFlashcards: boolean;
}

interface GenerationTask {
  id: string;
  fileName: string;
  sourceFileId: string;
  status: GenerationStatus;
  documentText: string | null;
  images: string[];
  results: GeneratedQuestionData | null;
  error: string | null;
  progress: number;
  abortController: AbortController;
  generationOptions: GenerationOptions;
}

export interface PendingSource {
    id: string;
    fileName: string;
    fileUrl?: string;
    file?: File;
}

interface QuestionGenerationState {
  flowStep: GenerationFlowStep;
  pendingSource: PendingSource | null;
  task: GenerationTask | null;
  isSaved: boolean;
  
  initiateGeneration: (source: PendingSource) => void;
  startGeneration: (options: GenerationOptions, prompts: {gen: string, examGen: string, flashcardGen: string}) => void;
  saveCurrentResults: (userId: string, currentItemCount: number) => Promise<void>;
  resetFlow: () => void;
  retryGeneration: (prompts: {gen: string, examGen: string, flashcardGen: string}) => Promise<void>;
  confirmContinue: () => void;
  cancelConfirmation: () => void;
  abortGeneration: () => void;
  closeOptionsDialog: () => void;
}

const updateTask = (state: QuestionGenerationState, partialTask: Partial<Omit<GenerationTask, 'abortController'>>): QuestionGenerationState => ({
  ...state,
  task: state.task ? { ...state.task, ...partialTask } : null,
});

async function runGenerationProcess(
    initialTask: GenerationTask,
    prompts: {gen: string, examGen: string, flashcardGen: string},
    set: (updater: (state: QuestionGenerationState) => QuestionGenerationState) => void,
    get: () => QuestionGenerationState
) {
    const { signal } = initialTask.abortController;

    try {
        if (signal.aborted) throw new Error('Aborted');
        set(state => updateTask(state, { status: 'processing', progress: 10, error: null }));
        
        const source = get().pendingSource;
        if (!source) throw new Error("Source file is missing.");

        let fileBlob: Blob;
        if (source.file) {
            fileBlob = source.file;
        } else if (source.fileUrl) {
            fileBlob = await contentService.getFileContent(source.fileUrl);
        } else {
            throw new Error("No file content or URL provided.");
        }
        
        set(state => updateTask(state, { progress: 30 }));
        
        const pdf = await pdfjs.getDocument(await fileBlob.arrayBuffer()).promise;
        const documentText = await contentService.extractTextFromPdf(pdf);
        const images: string[] = []; // Image extraction can be added here if needed
        
        set(state => updateTask(state, { documentText, images, progress: 50 }));
        
        const lectureName = source.fileName.replace(/\.[^/.]+$/, "") || 'Unknown Lecture';

        const results = await generateQuestions({
            documentContent: documentText,
            images,
            lectureName,
            generationOptions: initialTask.generationOptions,
            prompts,
        });

        if (signal.aborted) throw new Error('Aborted');

        set(state => ({
            ...updateTask(state, { status: 'completed', progress: 100, results }),
            isSaved: false,
            flowStep: 'completed',
        }));

    } catch (err: any) {
        if (err.name === 'AbortError') {
             console.log("Generation process aborted by user.");
             // State is reset by the abortGeneration action
             return;
        }
        console.error("Error during question generation process:", err);
        set(state => ({
            ...updateTask(state, { status: 'error', error: err.message || 'An unexpected error occurred.' }),
            flowStep: 'error',
        }));
    }
}

export const useQuestionGenerationStore = create<QuestionGenerationState>()(
  (set, get) => ({
    flowStep: 'idle',
    pendingSource: null,
    task: null,
    isSaved: false,

    initiateGeneration: (source) => {
        const { task, isSaved } = get();

        if (task && task.status === 'completed' && !isSaved) {
            set(state => ({
                ...state,
                flowStep: 'awaiting_confirmation',
                pendingSource: source,
            }));
        } else {
            if (task) {
                task.abortController.abort();
            }
            set({ pendingSource: source, flowStep: 'awaiting_options', task: null, isSaved: false });
        }
    },
    
    startGeneration: (options, prompts) => {
        const { pendingSource } = get();
        if (!pendingSource) return;

        const taskId = `task_${Date.now()}`;
        const newTask: GenerationTask = {
            id: taskId,
            fileName: pendingSource.fileName,
            sourceFileId: pendingSource.id,
            status: 'idle',
            documentText: null,
            images: [],
            results: null,
            error: null,
            progress: 0,
            abortController: new AbortController(),
            generationOptions: options,
        };

        set({ task: newTask, flowStep: 'processing', isSaved: false });
        runGenerationProcess(newTask, prompts, set, get);
    },

    saveCurrentResults: async (userId: string, currentItemCount: number) => {
        const { task } = get();

        if (!task || task.status !== 'completed' || !task.results) {
            throw new Error("No completed task results to save.");
        }

        const collectionRef = collection(db, `users/${userId}/questionSets`);
        await addDoc(collectionRef, {
            fileName: task.fileName,
            textQuestions: task.results.textQuestions,
            jsonQuestions: task.results.jsonQuestions,
            textExam: task.results.textExam,
            jsonExam: task.results.jsonExam,
            textFlashcard: task.results.textFlashcard,
            jsonFlashcard: task.results.jsonFlashcard,
            createdAt: new Date().toISOString(),
            userId: userId,
            sourceFileId: task.sourceFileId,
            order: currentItemCount,
        });
        
        set({ isSaved: true });
    },
    
    resetFlow: () => {
        const { task } = get();
        if (task) {
            task.abortController.abort();
        }
        set({
            flowStep: 'idle',
            pendingSource: null,
            task: null,
            isSaved: false,
        });
    },

    retryGeneration: async (prompts) => {
        const { task } = get();
        if(!task || task.status !== 'error') return;
        const newTask = { ...task, abortController: new AbortController() };
        set({ task: newTask, flowStep: 'processing' });
        runGenerationProcess(newTask, prompts, set, get);
    },

    confirmContinue: () => {
        const { pendingSource } = get();
        if (pendingSource) {
            set({ pendingSource, flowStep: 'awaiting_options', task: null, isSaved: false });
        }
    },

    cancelConfirmation: () => {
        set({ flowStep: 'completed', pendingSource: null });
    },

    abortGeneration: () => {
        get().resetFlow();
    },

    closeOptionsDialog: () => {
        if (get().flowStep === 'awaiting_options') {
            get().resetFlow();
        }
    }
  })
);
