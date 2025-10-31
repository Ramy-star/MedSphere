import { create } from 'zustand';
import { contentService } from '@/lib/contentService';
import { generateQuestionsText, convertQuestionsToJson, convertFlashcardsToJson } from '@/ai/flows/question-gen-flow';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Lecture } from '@/lib/types';
import * as pdfjs from 'pdfjs-dist';

if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

type GenerationStatus = 'idle' | 'extracting' | 'generating_text' | 'generating_exam_text' | 'generating_flashcard_text' | 'completed' | 'error';
type FailedStep = 'extracting' | 'generating_text' | 'generating_exam_text' | 'generating_flashcard_text' | null;
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
  failedStep: FailedStep;
  documentText: string | null;
  textQuestions: string | null;
  jsonQuestions: any | null; // This will be populated by convertTextToJson
  textExam: string | null;
  jsonExam: any | null;
  textFlashcard: string | null;
  jsonFlashcard: any | null;
  error: string | null;
  progress: number;
  abortController: AbortController;
  generationOptions: GenerationOptions;
}

export interface PendingSource {
    id: string;
    fileName: string;
    fileUrl?: string; // For existing files
    file?: File;      // For new uploads
}

interface QuestionGenerationState {
  flowStep: GenerationFlowStep;
  pendingSource: PendingSource | null;
  task: GenerationTask | null;
  isSaved: boolean;
  
  // Actions
  initiateGeneration: (source: PendingSource) => void;
  startGeneration: (options: GenerationOptions, prompts: {gen: string, examGen: string, flashcardGen: string}) => void;
  saveCurrentResults: (userId: string, currentItemCount: number) => Promise<void>;
  resetFlow: () => void;
  retryGeneration: (prompts: {gen: string, examGen: string, flashcardGen: string}) => Promise<void>;
  confirmContinue: () => void;
  cancelConfirmation: () => void;
  abortGeneration: () => void;
  closeOptionsDialog: () => void;
  convertTextToJson: (type: 'questions' | 'exam' | 'flashcards') => Promise<void>;
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
        set(state => updateTask(state, { status: 'extracting', progress: 10, error: null, failedStep: null }));
        
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
        
        const documentText = await contentService.extractTextFromPdf(fileBlob);
        
        set(state => updateTask(state, { documentText, progress: 50 }));
        
        const { generationOptions } = initialTask;
        let results: Partial<GenerationTask> = {};

        if (generationOptions.generateQuestions) {
            set(state => updateTask(state, { status: 'generating_text', progress: 60 }));
            results.textQuestions = await generateQuestionsText({ prompt: prompts.gen, documentContent: documentText });
        }
        if (generationOptions.generateExam) {
            set(state => updateTask(state, { status: 'generating_exam_text', progress: 75 }));
            results.textExam = await generateQuestionsText({ prompt: prompts.examGen, documentContent: documentText });
        }
        if (generationOptions.generateFlashcards) {
            set(state => updateTask(state, { status: 'generating_flashcard_text', progress: 90 }));
            results.textFlashcard = await generateQuestionsText({ prompt: prompts.flashcardGen, documentContent: documentText });
        }

        if (signal.aborted) throw new Error('Aborted');

        set(state => ({
            ...updateTask(state, { ...results, status: 'completed', progress: 100 }),
            isSaved: false,
            flowStep: 'completed',
        }));

    } catch (err: any) {
        if (err.name === 'AbortError') {
             console.log("Generation process aborted by user.");
             return;
        }
        console.error("Error during question generation process:", err);
        const currentStatus = get().task?.status || 'idle';
        set(state => ({
            ...updateTask(state, { status: 'error', failedStep: currentStatus as FailedStep, error: err.message || 'An unexpected error occurred.' }),
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
            failedStep: null,
            documentText: null,
            textQuestions: null,
            jsonQuestions: null,
            textExam: null,
            jsonExam: null,
            textFlashcard: null,
            jsonFlashcard: null,
            error: null,
            progress: 0,
            abortController: new AbortController(),
            generationOptions: options,
        };

        set({ task: newTask, flowStep: 'processing', isSaved: false });
        runGenerationProcess(newTask, prompts, set, get);
    },
    
    convertTextToJson: async (type) => {
        const { task } = get();
        const lectureName = get().pendingSource?.fileName.replace(/\.[^/.]+$/, "") || 'Unknown Lecture';
        
        if (!task) throw new Error("No active task.");

        if (type === 'questions' && task.textQuestions) {
            const json = await convertQuestionsToJson({ lectureName, questionsText: task.textQuestions });
            set(state => updateTask(state, { jsonQuestions: json }));
            // Also update the document in firestore
            const { studentId } = useAuthStore.getState();
            if (studentId && task.id.startsWith('saved_')) {
              await updateDoc(doc(db, `users/${studentId}/questionSets`, task.id.replace('saved_', '')), { jsonQuestions: json });
            }
        } else if (type === 'exam' && task.textExam) {
            const json = await convertQuestionsToJson({ lectureName, questionsText: task.textExam });
            set(state => updateTask(state, { jsonExam: json }));
             const { studentId } = useAuthStore.getState();
            if (studentId && task.id.startsWith('saved_')) {
              await updateDoc(doc(db, `users/${studentId}/questionSets`, task.id.replace('saved_', '')), { jsonExam: json });
            }
        } else if (type === 'flashcards' && task.textFlashcard) {
            const json = await convertFlashcardsToJson({ lectureName, flashcardsText: task.textFlashcard });
            set(state => updateTask(state, { jsonFlashcard: json }));
             const { studentId } = useAuthStore.getState();
            if (studentId && task.id.startsWith('saved_')) {
              await updateDoc(doc(db, `users/${studentId}/questionSets`, task.id.replace('saved_', '')), { jsonFlashcard: json });
            }
        } else {
            throw new Error(`Cannot convert ${type}, source text is missing.`);
        }
    },

    saveCurrentResults: async (userId: string, currentItemCount: number) => {
        const { task } = get();

        if (!task || task.status !== 'completed') {
            throw new Error("No completed task to save.");
        }

        const collectionRef = collection(db, `users/${userId}/questionSets`);
        await addDoc(collectionRef, {
            fileName: task.fileName,
            textQuestions: task.textQuestions || '',
            jsonQuestions: task.jsonQuestions || {},
            textExam: task.textExam || '',
            jsonExam: task.jsonExam || {},
            textFlashcard: task.textFlashcard || '',
            jsonFlashcard: task.jsonFlashcard || {},
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
