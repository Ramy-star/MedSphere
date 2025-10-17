
import { create } from 'zustand';
import { contentService } from '@/lib/contentService';
import { generateQuestions, convertQuestionsToJson } from '@/ai/flows/question-gen-flow';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/firebase';

type GenerationStatus = 'idle' | 'extracting' | 'generating_text' | 'converting_json' | 'completed' | 'error' | 'awaiting_confirmation';
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
  nextFile?: File; // To hold the file for the next generation
  nextGenArgs?: {id: string, fileName: string, fileUrl: string};
}

interface QuestionGenerationState {
  task: GenerationTask | null;
  isSaved: boolean;
  startGenerationWithFile: (file: File, genPrompt: string, jsonPrompt: string) => Promise<void>;
  startGenerationFromUrl: (id: string, fileName: string, fileUrl: string, genPrompt: string, jsonPrompt: string) => void;
  saveCurrentResults: (userId: string, currentItemCount: number) => Promise<void>;
  clearTask: () => void;
  retryGeneration: (genPrompt: string, jsonPrompt: string) => Promise<void>;
  confirmContinue: (genPrompt: string, jsonPrompt: string) => void;
}

const updateTask = (state: QuestionGenerationState, partialTask: Partial<GenerationTask>): QuestionGenerationState => ({
  ...state,
  task: state.task ? { ...state.task, ...partialTask } : null,
});

async function runGenerationProcess(
    initialTask: GenerationTask,
    genPrompt: string, 
    jsonPrompt: string,
    set: (updater: (state: QuestionGenerationState) => QuestionGenerationState) => void,
    get: () => QuestionGenerationState
) {
    let documentText = initialTask.documentText;
    let textQuestions = initialTask.textQuestions;
    const failedStep = initialTask.failedStep;
    
    // Determine starting status based on what's already completed or what failed
    let startStatus: 'extracting' | 'generating_text' | 'converting_json' = 'extracting';
    if (failedStep === 'generating_text' || documentText) {
        startStatus = 'generating_text';
    } else if (failedStep === 'converting_json' || textQuestions) {
        startStatus = 'converting_json';
    }

    try {
        // Step 1: Text Extraction (if not already done)
        if (startStatus === 'extracting' && !documentText) {
            set(state => updateTask(state, { status: 'extracting', progress: 10, error: null, failedStep: null }));
            const pdfjs = await import('pdfjs-dist');
            pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

            let fileSource: any = initialTask.fileUrl;
            if (initialTask.file) {
                fileSource = await initialTask.file.arrayBuffer();
            }

            const pdf = await pdfjs.getDocument(fileSource).promise as PDFDocumentProxy;
            documentText = await contentService.extractTextFromPdf(pdf);
            set(state => updateTask(state, { documentText, progress: 30 }));
        }

        // Step 2: Generate Text Questions (if not already done)
        if (['extracting', 'generating_text'].includes(startStatus) && !textQuestions) {
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
        if (['extracting', 'generating_text', 'converting_json'].includes(startStatus)) {
            set(state => updateTask(state, { status: 'converting_json', progress: 80, error: null, failedStep: null }));
            const generatedJson = await convertQuestionsToJson({ prompt: jsonPrompt, questionsText: textQuestions! });
            set(state => ({
                ...updateTask(state, { jsonQuestions: generatedJson, status: 'completed', progress: 100, failedStep: null }),
                isSaved: false // Mark as unsaved upon completion
            }));
        }

    } catch (err: any) {
        console.error("Error during question generation process:", err);
        const currentTask = get().task;
        const currentStatus = currentTask ? currentTask.status : 'idle';

        let finalFailedStep: FailedStep = null;
        if(currentStatus === 'extracting') finalFailedStep = 'extracting';
        else if(currentStatus === 'generating_text') finalFailedStep = 'generating_text';
        else if(currentStatus === 'converting_json') finalFailedStep = 'converting_json';
        
        set(state => updateTask(state, { status: 'error', failedStep: finalFailedStep, error: err.message || 'An unexpected error occurred.' }));
    }
}

const startNewGenerationFromFile = (file: File, genPrompt: string, jsonPrompt: string, set: any, get: any) => {
    const { task, isSaved } = get();

    // Check for unsaved work first. If found, show confirmation and stop.
    if (task && task.status === 'completed' && !isSaved) {
        set((state: QuestionGenerationState) => updateTask(state, { status: 'awaiting_confirmation', nextFile: file }));
        return;
    }
    
    // If no unsaved work, proceed with the new generation.
    const taskId = `task_${Date.now()}`;
    const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
    const newTask: GenerationTask = {
        id: taskId,
        fileName: fileNameWithoutExt,
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
    set({ task: newTask, isSaved: false });
    runGenerationProcess(newTask, genPrompt, jsonPrompt, set, get);
};

const startNewGenerationFromUrl = (id: string, fileName: string, fileUrl: string, genPrompt: string, jsonPrompt: string, set: any, get: any) => {
    const { task, isSaved } = get();

    // Check for unsaved work first. If found, show confirmation and stop.
    if (task && task.status === 'completed' && !isSaved) {
        set((state: QuestionGenerationState) => updateTask(state, { status: 'awaiting_confirmation', nextGenArgs: { id, fileName, fileUrl } }));
        return;
    }

    // If no unsaved work, proceed with the new generation.
    const taskId = `task_${Date.now()}`;
    const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
    const newTask: GenerationTask = {
        id: taskId,
        fileName: fileNameWithoutExt,
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
    set({ task: newTask, isSaved: false });
    runGenerationProcess(newTask, genPrompt, jsonPrompt, set, get);
};


export const useQuestionGenerationStore = create<QuestionGenerationState>()(
  (set, get) => ({
    task: null,
    isSaved: false,
    startGenerationWithFile: async (file, genPrompt, jsonPrompt) => {
        // This function now directly calls the new "checked" start function.
        startNewGenerationFromFile(file, genPrompt, jsonPrompt, set, get);
    },
    startGenerationFromUrl: (id, fileName, fileUrl, genPrompt, jsonPrompt) => {
        // This function now directly calls the new "checked" start function.
        startNewGenerationFromUrl(id, fileName, fileUrl, genPrompt, jsonPrompt, set, get);
    },
    confirmContinue: (genPrompt, jsonPrompt) => {
        const { task } = get();
        if (!task) return;

        // The user has confirmed. Now we can safely start the new generation
        // using the data we stored in `nextFile` or `nextGenArgs`.
        if (task.nextFile) {
            const file = task.nextFile;
            const taskId = `task_${Date.now()}`;
            const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
            const newTask: GenerationTask = {
                id: taskId,
                fileName: fileNameWithoutExt,
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
            set({ task: newTask, isSaved: false });
            runGenerationProcess(newTask, genPrompt, jsonPrompt, set, get);

        } else if (task.nextGenArgs) {
            const { id, fileName, fileUrl } = task.nextGenArgs;
            const taskId = `task_${Date.now()}`;
            const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
            const newTask: GenerationTask = {
                id: taskId,
                fileName: fileNameWithoutExt,
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
            set({ task: newTask, isSaved: false });
            runGenerationProcess(newTask, genPrompt, jsonPrompt, set, get);
        }
    },
    retryGeneration: async (genPrompt, jsonPrompt) => {
        const { task } = get();
        if(!task || task.status !== 'error') return;
        runGenerationProcess(task, genPrompt, jsonPrompt, set, get);
    },
    saveCurrentResults: async (userId: string, currentItemCount: number) => {
        const { task } = get();

        if (!task || task.status !== 'completed' || !task.textQuestions || !task.jsonQuestions || !task.fileName) {
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
            order: currentItemCount,
        });
        
        set({ isSaved: true });

        // Auto-clear after 5 seconds
        setTimeout(() => {
            get().clearTask();
        }, 5000);
    },
    clearTask: () => {
        const { task } = get();
        // If the task is awaiting confirmation, just revert the status.
        if(task && task.status === 'awaiting_confirmation') {
            set(state => updateTask(state, { status: 'completed', nextFile: undefined, nextGenArgs: undefined }));
        } else {
            // Otherwise, clear everything.
            set({ task: null, isSaved: false });
        }
    },
  })
);
