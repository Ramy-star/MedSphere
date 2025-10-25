
import { create } from 'zustand';
import { contentService } from '@/lib/contentService';
import { generateQuestions, convertQuestionsToJson } from '@/ai/flows/question-gen-flow';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/firebase';
import { router } from 'next/router'; // Although we can't use it here, it's a reminder of navigation

type GenerationStatus = 'idle' | 'extracting' | 'generating_text' | 'converting_json' | 'generating_exam_text' | 'converting_exam_json' | 'generating_flashcard_text' | 'converting_flashcard_json' | 'completed' | 'error';
type FailedStep = 'extracting' | 'generating_text' | 'converting_json' | 'generating_exam_text' | 'converting_exam_json' | 'generating_flashcard_text' | 'converting_flashcard_json' | null;
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
  jsonQuestions: string | null;
  textExam: string | null;
  jsonExam: string | null;
  textFlashcard: string | null;
  jsonFlashcard: string | null;
  error: string | null;
  progress: number;
  abortController: AbortController;
}

interface PendingSource {
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
  startGeneration: (options: GenerationOptions, prompts: {gen: string, json: string, examGen: string, examJson: string, flashcardGen: string, flashcardJson: string}) => void;
  saveCurrentResults: (userId: string, currentItemCount: number) => Promise<void>;
  clearTask: () => void;
  resetFlow: () => void;
  retryGeneration: (prompts: {gen: string, json: string, examGen: string, examJson: string, flashcardGen: string, flashcardJson: string}) => Promise<void>;
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
    options: GenerationOptions,
    prompts: {gen: string, json: string, examGen: string, examJson: string, flashcardGen: string, flashcardJson: string},
    set: (updater: (state: QuestionGenerationState) => QuestionGenerationState) => void,
    get: () => QuestionGenerationState
) {
    let { documentText, textQuestions, jsonQuestions, textExam, jsonExam, textFlashcard, jsonFlashcard } = initialTask;
    const { failedStep } = initialTask;
    const { signal } = initialTask.abortController;

    const steps: GenerationStatus[] = [];
    if (options.generateQuestions) {
        steps.push('generating_text', 'converting_json');
    }
    if (options.generateExam) {
        steps.push('generating_exam_text', 'converting_exam_json');
    }
    if (options.generateFlashcards) {
        steps.push('generating_flashcard_text', 'converting_flashcard_json');
    }

    if (steps.length === 0) {
        set(state => ({...state, flowStep: 'completed', task: {...initialTask, status: 'completed'}}));
        return;
    }
    
    // Always start with extraction
    const allSteps: GenerationStatus[] = ['extracting', ...steps, 'completed'];

    let currentStepIndex = 0;
     if (failedStep) {
        currentStepIndex = allSteps.indexOf(failedStep as GenerationStatus);
        if(currentStepIndex === -1) currentStepIndex = 0;
    }

    try {
        const runStep = async (step: GenerationStatus) => {
            if (signal.aborted) throw new Error('Aborted');
            set(state => updateTask(state, { status: step, progress: (allSteps.indexOf(step) / (allSteps.length - 1)) * 100, error: null, failedStep: null }));

            switch (step) {
                case 'extracting':
                    if (!documentText) {
                        const pdfjs = await import('pdfjs-dist');
                        pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

                        let fileSource: any = get().pendingSource?.fileUrl;
                        if (get().pendingSource?.file) {
                            fileSource = await get().pendingSource!.file!.arrayBuffer();
                        }
                        const pdf = await pdfjs.getDocument(fileSource).promise as PDFDocumentProxy;
                        documentText = await contentService.extractTextFromPdf(pdf);
                        set(state => updateTask(state, { documentText }));
                    }
                    break;
                
                case 'generating_text':
                    textQuestions = await generateQuestions({ prompt: prompts.gen, documentContent: documentText!, images: [] });
                    set(state => updateTask(state, { textQuestions }));
                    break;

                case 'converting_json':
                    jsonQuestions = await convertQuestionsToJson({ prompt: prompts.json, questionsText: textQuestions! });
                    set(state => updateTask(state, { jsonQuestions }));
                    break;
                
                case 'generating_exam_text':
                    textExam = await generateQuestions({ prompt: prompts.examGen, documentContent: documentText!, images: [] });
                    set(state => updateTask(state, { textExam }));
                    break;
                
                case 'converting_exam_json':
                    jsonExam = await convertQuestionsToJson({ prompt: prompts.examJson, questionsText: textExam! });
                    set(state => updateTask(state, { jsonExam }));
                    break;

                case 'generating_flashcard_text':
                    textFlashcard = await generateQuestions({ prompt: prompts.flashcardGen, documentContent: documentText!, images: [] });
                    set(state => updateTask(state, { textFlashcard }));
                    break;

                case 'converting_flashcard_json':
                    jsonFlashcard = await convertQuestionsToJson({ prompt: prompts.flashcardJson, questionsText: textFlashcard! });
                    set(state => updateTask(state, { jsonFlashcard }));
                    break;

                case 'completed':
                    set(state => ({
                        ...updateTask(state, { status: 'completed', progress: 100 }),
                        isSaved: false,
                        flowStep: 'completed',
                    }));
                    break;
            }
        };

        for (let i = currentStepIndex; i < allSteps.length; i++) {
            await runStep(allSteps[i]);
        }

    } catch (err: any) {
        console.error("Error during question generation process:", err);
        const currentTask = get().task;
        const currentStatus = currentTask ? currentTask.status : 'idle';
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

        // If a completed but unsaved task exists, ask for confirmation
        if (task && task.status === 'completed' && !isSaved) {
            set(state => ({
                ...state,
                flowStep: 'awaiting_confirmation',
                pendingSource: source, // Save the new source to use after confirmation
            }));
        } else {
            // Otherwise, start the new flow directly
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
        };

        set({ task: newTask, flowStep: 'processing', isSaved: false });
        runGenerationProcess(newTask, options, prompts, set, get);
    },

    saveCurrentResults: async (userId: string, currentItemCount: number) => {
        const { task } = get();

        if (!task || task.status !== 'completed') {
            throw new Error("No completed task to save.");
        }

        const collectionRef = collection(db, `users/${userId}/questionSets`);
        await addDoc(collectionRef, {
            fileName: task.fileName,
            textQuestions: task.textQuestions,
            jsonQuestions: task.jsonQuestions,
            textExam: task.textExam,
            jsonExam: task.jsonExam,
            textFlashcard: task.textFlashcard,
            jsonFlashcard: task.jsonFlashcard,
            createdAt: new Date().toISOString(),
            userId: userId,
            sourceFileId: task.sourceFileId,
            order: currentItemCount,
        });
        
        set({ isSaved: true });
    },

    clearTask: () => {
        const { task } = get();
        if (task) {
            task.abortController.abort();
        }
        set({ task: null, isSaved: false });
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
        const { task, task: { options } } = get();
        if(!task || task.status !== 'error') return;
        const newTask = { ...task, abortController: new AbortController() };
        set({ task: newTask, flowStep: 'processing' });
        // Assume options were stored on the task or are available
        const generationOptions = get().task?.generationOptions || { generateQuestions: true, generateExam: true, generateFlashcards: true };
        runGenerationProcess(newTask, generationOptions, prompts, set, get);
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
        // If user closes the dialog, reset the flow
        if (get().flowStep === 'awaiting_options') {
            get().resetFlow();
        }
    }
  })
);

// Add generationOptions to the GenerationTask interface
export interface GenerationTask {
    generationOptions?: GenerationOptions;
}
