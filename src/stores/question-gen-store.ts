
import { create } from 'zustand';
import { contentService } from '@/lib/contentService';
import { generateQuestionsText, generateExamText, generateFlashcardsText, convertQuestionsToJson, convertFlashcardsToJson } from '@/ai/flows/question-gen-flow';
import { addDoc, collection, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuthStore } from './auth-store';
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
  convertExistingTextToJson: (questionSetId: string, text: string, type: GenerationType) => Promise<void>;
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
            const statusKey = type;
            
            if (newTask.status[statusKey]) {
                newTask.status[statusKey] = {
                    ...newTask.status[statusKey],
                    status: status,
                    error: error || null,
                };
            }
            
            const keyMap: Record<keyof GenerationOptions, GenerationType> = {
                generateQuestions: 'questions',
                generateExam: 'exam',
                generateFlashcards: 'flashcards'
            };

            const allDone = Object.keys(state.task.generationOptions)
                .filter(key => state.task!.generationOptions[key as keyof GenerationOptions])
                .every(key => {
                    const statusKey = keyMap[key as keyof GenerationOptions];
                    const taskStatus = newTask.status[statusKey];
                    return taskStatus.status === 'completed' || taskStatus.status === 'error';
                });

            return {
                task: newTask,
                flowStep: allDone ? (Object.values(newTask.status).some(s => s.status === 'error') ? 'error' : 'completed') : 'processing',
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
            else if (source.fileUrl) fileBlob = await contentService.getFileContent(source.fileUrl, source.id);
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
            const statusKey = type;
            if (newTask.status[statusKey]) {
                newTask.status[statusKey].text = generatedText;
            }
            return { task: newTask };
        });

        updateStatus('completed');

    } catch (err: any) {
        if (err.name === 'AbortError' || signal.aborted) {
             console.log(`Generation process for ${type} aborted by user.`);
             updateStatus('idle'); // Reset this specific task status
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

        const hasCompletedWork = task && (task.status.questions.status === 'completed' || task.status.exam.status === 'completed' || task.status.flashcards.status === 'completed');

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
    
    convertExistingTextToJson: async (questionSetId: string, text: string, type: GenerationType) => {
        const { studentId } = useAuthStore.getState();
        if (!studentId) throw new Error("User not logged in");
    
        const questionSetDoc = await getDoc(doc(db, `users/${studentId}/questionSets`, questionSetId));
        if (!questionSetDoc.exists()) throw new Error("Question set not found.");

        const questionSet = questionSetDoc.data();
        const lectureName = questionSet?.fileName.replace(/\.[^/.]+$/, "") || 'Unknown Lecture';

        let jsonResult: object;
    
        if (type === 'flashcards') {
            jsonResult = await convertFlashcardsToJson({ lectureName, text });
        } else {
            jsonResult = await convertQuestionsToJson({ lectureName, text });
        }
        
        const dataKey = type === 'questions' ? 'jsonQuestions' 
                      : type === 'exam' ? 'jsonExam' 
                      : 'jsonFlashcard';
                      
        await updateDoc(doc(db, `users/${studentId}/questionSets`, questionSetId), { [dataKey]: jsonResult });
    },

    saveCurrentResults: async (userId: string, currentItemCount: number) => {
        const { task } = get();

        if (!task || !(task.status.questions.status === 'completed' || task.status.exam.status === 'completed' || task.status.flashcards.status === 'completed')) {
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

    retryGeneration: (type, prompts) => {
        const { task } = get();
        if(!task) return; // Only retry if there is a task.
        
        const newAbortController = new AbortController();
        const newTask = { ...task, abortController: newAbortController };
        
        set({ task: newTask, flowStep: 'processing' });
        
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
        // If user closes the dialog, reset the flow
        if (get().flowStep === 'awaiting_options') {
            get().resetFlow();
        }
    }
  })
);

    