
import { create } from 'zustand';
import { contentService } from '@/lib/contentService';
import { generateQuestionsText, generateExamText, generateFlashcardsText } from '@/ai/flows/question-gen-flow';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/firebase';
import * as pdfjs from 'pdfjs-dist';

if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

type GenerationType = 'questions' | 'exam' | 'flashcards';

type GenerationStatus = {
  status: 'idle' | 'processing' | 'completed' | 'error';
  error: string | null;
  text: string | null;
};

type TaskStatus = {
  documentText: string | null;
  questions: GenerationStatus;
  exam: GenerationStatus;
  flashcards: GenerationStatus;
};

export interface GenerationOptions {
    generateQuestions: boolean;
    generateExam: boolean;
    generateFlashcards: boolean;
}

interface GenerationTask {
  id: string;
  fileName: string;
  sourceFileId: string;
  status: TaskStatus;
  abortController: AbortController;
  generationOptions: GenerationOptions;
}

export interface PendingSource {
    id: string;
    fileName: string;
    fileUrl?: string;
    file?: File;
}

type GenerationFlowStep = 'idle' | 'awaiting_options' | 'processing' | 'completed' | 'error' | 'awaiting_confirmation';


interface QuestionGenerationState {
  flowStep: GenerationFlowStep;
  pendingSource: PendingSource | null;
  task: GenerationTask | null;
  isSaved: boolean;
  
  initiateGeneration: (source: PendingSource) => void;
  startGeneration: (options: GenerationOptions, prompts: {gen: string, examGen: string, flashcardGen: string}) => void;
  saveCurrentResults: (userId: string, currentItemCount: number) => Promise<void>;
  resetFlow: () => void;
  retryGeneration: (type: GenerationType, prompts: {gen: string, examGen: string, flashcardGen: string}) => void;
  confirmContinue: () => void;
  cancelConfirmation: () => void;
  abortGeneration: () => void;
  closeOptionsDialog: () => void;
}

const initialGenerationStatus: GenerationStatus = { status: 'idle', error: null, text: null };
const initialTaskStatus: TaskStatus = {
  documentText: null,
  questions: { ...initialGenerationStatus },
  exam: { ...initialGenerationStatus },
  flashcards: { ...initialGenerationStatus },
};

async function runGenerationProcess(
    type: GenerationType,
    task: GenerationTask,
    prompts: {gen: string, examGen: string, flashcardGen: string},
    set: (updater: (state: QuestionGenerationState) => Partial<QuestionGenerationState>) => void,
    get: () => QuestionGenerationState
) {
    const { signal } = task.abortController;

    const updateStatus = (status: GenerationStatus['status'], error?: string | null) => {
        set(state => {
            if (!state.task) return {};
            const newTask = { ...state.task };
            newTask.status[type] = {
                ...newTask.status[type],
                status: status,
                error: error || null,
            };

            const keyMap: Record<keyof GenerationOptions, GenerationType> = {
                generateQuestions: 'questions',
                generateExam: 'exam',
                generateFlashcards: 'flashcards'
            };

            // Check if all active processes are finished
            const allDone = Object.keys(state.task.generationOptions)
                .filter(key => state.task!.generationOptions[key as keyof GenerationOptions])
                .every(key => {
                    const statusKey = keyMap[key as keyof GenerationOptions];
                    const taskStatus = newTask.status[statusKey];
                    return taskStatus.status === 'completed' || taskStatus.status === 'error';
                });

            return {
                task: newTask,
                flowStep: allDone ? 'completed' : 'processing',
            };
        });
    };

    try {
        updateStatus('processing');

        let documentText = get().task?.status.documentText;
        if (!documentText) {
            const source = get().pendingSource;
            if (!source) throw new Error("Source file is missing.");
            
            let fileBlob: Blob;
            if (source.file) fileBlob = source.file;
            else if (source.fileUrl) fileBlob = await contentService.getFileContent(source.fileUrl);
            else throw new Error("No file content or URL provided.");

            const loadingTask = pdfjs.getDocument(await fileBlob.arrayBuffer());
            const pdf = await loadingTask.promise;
            documentText = await contentService.extractTextFromPdf(pdf);
            
            set(state => ({
                task: state.task ? { ...state.task, status: { ...state.task.status, documentText } } : null
            }));
        }

        if (signal.aborted) throw new Error('Aborted');

        let generatedText: string | null = null;
        let prompt = '';
        let generator: (input: { prompt: string; documentContent: string; }) => Promise<string>;

        if (type === 'questions') {
            prompt = prompts.gen;
            generator = generateQuestionsText;
        } else if (type === 'exam') {
            prompt = prompts.examGen;
            generator = generateExamText;
        } else {
            prompt = prompts.flashcardGen;
            generator = generateFlashcardsText;
        }
        
        generatedText = await generator({ prompt, documentContent: documentText! });
        
        if (signal.aborted) throw new Error('Aborted');

        set(state => {
            if (!state.task) return {};
            const newTask = { ...state.task };
            newTask.status[type].text = generatedText;
            return { task: newTask };
        });

        updateStatus('completed');

    } catch (err: any) {
        if (err.name === 'AbortError' || signal.aborted) {
             console.log(`Generation process for ${type} aborted by user.`);
             updateStatus('idle'); // Reset this specific task status
             const anyStillProcessing = Object.values(get().task!.status).some(s => s.status === 'processing');
             if(!anyStillProcessing) {
                set(() => ({ flowStep: get().task!.status.documentText ? 'completed' : 'idle' }));
             }
             return;
        }
        console.error(`Error during ${type} generation:`, err);
        updateStatus('error', err.message || 'An unexpected error occurred.');
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

        const hasCompletedWork = task && Object.values(task.status).some(s => s.status === 'completed');

        if (hasCompletedWork && !isSaved) {
            set(state => ({
                ...state,
                flowStep: 'awaiting_confirmation',
                pendingSource: source,
            }));
        } else {
            if (task) task.abortController.abort();
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
            status: { ...initialTaskStatus },
            abortController: new AbortController(),
            generationOptions: options,
        };

        set({ task: newTask, flowStep: 'processing', isSaved: false });

        if (options.generateQuestions) {
            runGenerationProcess('questions', newTask, prompts, set, get);
        }
        if (options.generateExam) {
            runGenerationProcess('exam', newTask, prompts, set, get);
        }
        if (options.generateFlashcards) {
            runGenerationProcess('flashcards', newTask, prompts, set, get);
        }
    },
    
    saveCurrentResults: async (userId: string, currentItemCount: number) => {
        const { task } = get();

        if (!task || get().flowStep !== 'completed') {
            throw new Error("No completed task to save.");
        }

        const { fileName, sourceFileId, status } = task;
        
        await addDoc(collection(db, `users/${userId}/questionSets`), {
            fileName: fileName,
            textQuestions: status.questions.text || '',
            jsonQuestions: {},
            textExam: status.exam.text || '',
            jsonExam: {},
            textFlashcard: status.flashcards.text || '',
            jsonFlashcard: {},
            createdAt: new Date().toISOString(),
            userId: userId,
            sourceFileId: sourceFileId,
            order: currentItemCount,
        });
        
        set({ isSaved: true });
    },

    resetFlow: () => {
        const { task } = get();
        if (task) task.abortController.abort();
        set({
            flowStep: 'idle',
            pendingSource: null,
            task: null,
            isSaved: false,
        });
    },

    retryGeneration: (type, prompts) => {
        const { task } = get();
        if(!task || task.status[type].status !== 'error') return;
        
        const newAbortController = new AbortController();
        const newTask = { ...task, abortController: newAbortController };
        
        set({ task: newTask });
        
        runGenerationProcess(type, newTask, prompts, set, get);
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
