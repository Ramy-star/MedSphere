import { create } from 'zustand';
import { contentService } from '@/lib/contentService';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/firebase';
//import { Router } from 'next/router'; // Although we can't use it here, it's a reminder of navigation
import type { Lecture } from '@/lib/types';


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
  jsonQuestions: any | null; // Changed to any to hold object before stringifying
  textExam: string | null;
  jsonExam: any | null; // Changed to any
  textFlashcard: string | null;
  jsonFlashcard: any | null; // Changed to any
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

/**
 * Helper function to call the question generation API
 */
async function callQuestionsAPI(action: string, payload: any): Promise<any> {
    console.log(`[QUESTION-GEN] Calling API with action: ${action}`);

    const response = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action,
            ...payload,
        }),
    });

    console.log(`[QUESTION-GEN] API response status: ${response.status}`);

    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            console.error('[QUESTION-GEN] Failed to parse error response as JSON');
            throw new Error(`API request failed with status ${response.status}`);
        }

        console.error('[QUESTION-GEN] ✗ API Error:', errorData);
        console.error('[QUESTION-GEN] Error type:', errorData.errorType);
        console.error('[QUESTION-GEN] Error message:', errorData.error);

        // Provide user-friendly error messages based on error type
        if (errorData.errorType === 'configuration') {
            throw new Error('Server configuration error: AI service is not properly configured. Please contact the administrator to add GEMINI_API_KEY to Vercel environment variables.');
        } else if (errorData.errorType === 'authentication') {
            throw new Error('AI service authentication failed. Please contact the administrator.');
        } else if (errorData.errorType === 'quota') {
            throw new Error('AI service quota exceeded. Please try again later.');
        }

        throw new Error(errorData.error || 'API request failed');
    }

    const data = await response.json();

    if (!data.success) {
        console.error('[QUESTION-GEN] ✗ API returned success=false:', data.error);
        throw new Error(data.error || 'API request failed');
    }

    console.log(`[QUESTION-GEN] ✓ API call successful for action: ${action}`);
    return data.result;
}

async function runGenerationProcess(
    initialTask: GenerationTask,
    prompts: {gen: string, json: string, examGen: string, examJson: string, flashcardGen: string, flashcardJson: string},
    set: (updater: (state: QuestionGenerationState) => QuestionGenerationState) => void,
    get: () => QuestionGenerationState
) {
    let { documentText, textQuestions, jsonQuestions, textExam, jsonExam, textFlashcard, jsonFlashcard } = initialTask;
    const { failedStep, generationOptions: options } = initialTask;
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

                        documentText = await contentService.extractTextFromPdf(fileBlob);
                        set(state => updateTask(state, { documentText }));
                    }
                    break;
                
                case 'generating_text':
                    textQuestions = await callQuestionsAPI('generateText', {
                        prompt: prompts.gen,
                        documentContent: documentText!
                    });
                    set(state => updateTask(state, { textQuestions }));
                    break;

                case 'converting_json':
                    const lectureName = get().pendingSource?.fileName.replace(/\.[^/.]+$/, "") || 'Unknown Lecture';
                    jsonQuestions = await callQuestionsAPI('convertQuestions', {
                        lectureName: lectureName,
                        questionsText: textQuestions!
                    });
                    set(state => updateTask(state, { jsonQuestions }));
                    break;
                
                case 'generating_exam_text':
                    textExam = await callQuestionsAPI('generateText', {
                        prompt: prompts.examGen,
                        documentContent: documentText!
                    });
                    set(state => updateTask(state, { textExam }));
                    break;
                
                case 'converting_exam_json':
                    const examLectureName = get().pendingSource?.fileName.replace(/\.[^/.]+$/, "") || 'Unknown Lecture';
                    jsonExam = await callQuestionsAPI('convertQuestions', {
                        lectureName: examLectureName,
                        questionsText: textExam!
                    });
                    set(state => updateTask(state, { jsonExam }));
                    break;

                case 'generating_flashcard_text':
                    textFlashcard = await callQuestionsAPI('generateText', {
                        prompt: prompts.flashcardGen,
                        documentContent: documentText!
                    });
                    set(state => updateTask(state, { textFlashcard }));
                    break;

                case 'converting_flashcard_json':
                    const flashcardLectureName = get().pendingSource?.fileName.replace(/\.[^/.]+$/, "") || 'Unknown Lecture';
                    jsonFlashcard = await callQuestionsAPI('convertFlashcards', {
                        lectureName: flashcardLectureName,
                        flashcardsText: textFlashcard!
                    });
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
        console.error("[QUESTION-GEN] ✗ Error during question generation process:", err);
        console.error("[QUESTION-GEN] Error name:", err.name);
        console.error("[QUESTION-GEN] Error message:", err.message);
        console.error("[QUESTION-GEN] Error stack:", err.stack);

        const currentTask = get().task;
        const currentStatus = currentTask ? currentTask.status : 'idle';

        // Provide more context in the error message
        let errorMessage = err.message || 'An unexpected error occurred.';

        // Add helpful hints based on error type
        if (errorMessage.includes('Server configuration error') || errorMessage.includes('GEMINI_API_KEY')) {
            errorMessage = 'AI service configuration error: The server administrator needs to add GEMINI_API_KEY to Vercel environment variables. Please contact support.';
        } else if (errorMessage.includes('quota exceeded')) {
            errorMessage = 'AI service quota exceeded. Please try again later or contact the administrator.';
        }

        console.error("[QUESTION-GEN] Setting error state with message:", errorMessage);

        set(state => ({
            ...updateTask(state, {
                status: 'error',
                failedStep: currentStatus as FailedStep,
                error: errorMessage
            }),
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
            generationOptions: options,
        };

        set({ task: newTask, flowStep: 'processing', isSaved: false });
        runGenerationProcess(newTask, prompts, set, get);
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
        // If user closes the dialog, reset the flow
        if (get().flowStep === 'awaiting_options') {
            get().resetFlow();
        }
    }
  })
);
