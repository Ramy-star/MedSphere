
import { create } from 'zustand';
import { contentService } from '@/lib/contentService';
import { generateQuestions, convertQuestionsToJson } from '@/ai/flows/question-gen-flow';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/firebase';

type GenerationStatus = 'idle' | 'extracting' | 'generating_text' | 'converting_json' | 'generating_exam_text' | 'converting_exam_json' | 'completed' | 'error' | 'awaiting_confirmation';
type FailedStep = 'extracting' | 'generating_text' | 'converting_json' | 'generating_exam_text' | 'converting_exam_json' | null;

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
  textExam: string | null;
  jsonExam: string | null;
  error: string | null;
  progress: number;
  nextFile?: File; // To hold the file for the next generation
  nextGenArgs?: {id: string, fileName: string, fileUrl: string};
  abortController: AbortController;
}

interface QuestionGenerationState {
  task: GenerationTask | null;
  isSaved: boolean;
  startGeneration: (source: {file: File} | {id: string, fileName: string, fileUrl: string}, prompts: {gen: string, json: string, examGen: string, examJson: string}) => void;
  saveCurrentResults: (userId: string, currentItemCount: number) => Promise<void>;
  clearTask: () => void;
  retryGeneration: (prompts: {gen: string, json: string, examGen: string, examJson: string}) => Promise<void>;
  confirmContinue: (prompts: {gen: string, json: string, examGen: string, examJson: string}) => void;
  cancelConfirmation: () => void;
  abortGeneration: () => void;
}

const updateTask = (state: QuestionGenerationState, partialTask: Partial<Omit<GenerationTask, 'abortController'>>): QuestionGenerationState => ({
  ...state,
  task: state.task ? { ...state.task, ...partialTask } : null,
});

async function runGenerationProcess(
    initialTask: GenerationTask,
    prompts: {gen: string, json: string, examGen: string, examJson: string},
    set: (updater: (state: QuestionGenerationState) => QuestionGenerationState) => void,
    get: () => QuestionGenerationState
) {
    let { documentText, textQuestions, jsonQuestions, textExam, jsonExam } = initialTask;
    const { failedStep } = initialTask;
    const { signal } = initialTask.abortController;

    const steps: GenerationStatus[] = ['extracting', 'generating_text', 'converting_json', 'generating_exam_text', 'converting_exam_json', 'completed'];
    let currentStepIndex = 0;

    // Determine starting step
    if (failedStep) {
        currentStepIndex = steps.indexOf(failedStep as GenerationStatus);
    } else if (jsonExam) {
        currentStepIndex = steps.indexOf('completed');
    } else if (textExam) {
        currentStepIndex = steps.indexOf('converting_exam_json');
    } else if (jsonQuestions) {
        currentStepIndex = steps.indexOf('generating_exam_text');
    } else if (textQuestions) {
        currentStepIndex = steps.indexOf('converting_json');
    } else if (documentText) {
        currentStepIndex = steps.indexOf('generating_text');
    }

    try {
        const runStep = async (step: GenerationStatus) => {
            if (signal.aborted) throw new Error('Aborted');
            set(state => updateTask(state, { status: step, progress: (steps.indexOf(step) / (steps.length - 1)) * 100, error: null, failedStep: null }));

            switch (step) {
                case 'extracting':
                    if (!documentText) {
                        const pdfjs = await import('pdfjs-dist');
                        pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

                        let fileSource: any = initialTask.fileUrl;
                        if (initialTask.file) {
                            fileSource = await initialTask.file.arrayBuffer();
                        }
                        const pdf = await pdfjs.getDocument(fileSource).promise as PDFDocumentProxy;
                        documentText = await contentService.extractTextFromPdf(pdf);
                        set(state => updateTask(state, { documentText }));
                    }
                    break;
                
                case 'generating_text':
                    if (!textQuestions) {
                        textQuestions = await generateQuestions({ prompt: prompts.gen, documentContent: documentText!, images: [] });
                        set(state => updateTask(state, { textQuestions }));
                    }
                    break;

                case 'converting_json':
                    if (!jsonQuestions) {
                        jsonQuestions = await convertQuestionsToJson({ prompt: prompts.json, questionsText: textQuestions! });
                        set(state => updateTask(state, { jsonQuestions }));
                    }
                    break;
                
                case 'generating_exam_text':
                    if (!textExam) {
                        textExam = await generateQuestions({ prompt: prompts.examGen, documentContent: documentText!, images: [] });
                        set(state => updateTask(state, { textExam }));
                    }
                    break;
                
                case 'converting_exam_json':
                     if (!jsonExam) {
                        jsonExam = await convertQuestionsToJson({ prompt: prompts.examJson, questionsText: textExam! });
                        set(state => updateTask(state, { jsonExam }));
                    }
                    break;

                case 'completed':
                    set(state => ({
                        ...updateTask(state, { status: 'completed', progress: 100 }),
                        isSaved: false
                    }));
                    break;
            }
        };

        for (let i = currentStepIndex; i < steps.length; i++) {
            await runStep(steps[i]);
        }

    } catch (err: any) {
        console.error("Error during question generation process:", err);
        const currentTask = get().task;
        const currentStatus = currentTask ? currentTask.status : 'idle';
        set(state => updateTask(state, { status: 'error', failedStep: currentStatus as FailedStep, error: err.message || 'An unexpected error occurred.' }));
    }
}

const useQuestionGenerationStore = create<QuestionGenerationState>()(
  (set, get) => ({
    task: null,
    isSaved: false,
    startGeneration: (source, prompts) => {
        const { task, isSaved } = get();

        if (task && task.status !== 'idle' && task.status !== 'error') {
            task.abortController.abort();
        }

        if (task && task.status === 'completed' && !isSaved) {
            const nextGenArgs = 'fileUrl' in source ? source : undefined;
            const nextFile = 'file' in source ? source.file : undefined;
            set(state => updateTask(state, { status: 'awaiting_confirmation', nextFile, nextGenArgs }));
            return;
        }

        const taskId = `task_${Date.now()}`;
        const fileNameWithoutExt = ('file' in source ? source.file.name : source.fileName).replace(/\.[^/.]+$/, "");
        
        const newTask: GenerationTask = {
            id: taskId,
            fileName: fileNameWithoutExt,
            sourceFileId: 'id' in source ? source.id : '',
            file: 'file' in source ? source.file : undefined,
            fileUrl: 'fileUrl' in source ? source.fileUrl : undefined,
            status: 'idle',
            failedStep: null,
            documentText: null,
            textQuestions: null,
            jsonQuestions: null,
            textExam: null,
            jsonExam: null,
            error: null,
            progress: 0,
            abortController: new AbortController(),
        };
        set({ task: newTask, isSaved: false });
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
            textQuestions: task.textQuestions,
            jsonQuestions: task.jsonQuestions,
            textExam: task.textExam,
            jsonExam: task.jsonExam,
            createdAt: new Date().toISOString(),
            userId: userId,
            sourceFileId: task.sourceFileId,
            order: currentItemCount,
        });
        
        set({ isSaved: true });

        setTimeout(() => {
            get().clearTask();
        }, 5000);
    },
    clearTask: () => {
        const { task } = get();
        if (task) {
            task.abortController.abort();
        }
        set({ task: null, isSaved: false });
    },
    retryGeneration: async (prompts) => {
        const { task } = get();
        if(!task || task.status !== 'error') return;
        const newTask = { ...task, abortController: new AbortController() };
        set({ task: newTask });
        runGenerationProcess(newTask, prompts, set, get);
    },
    confirmContinue: (prompts) => {
        const { task } = get();
        if (!task || task.status !== 'awaiting_confirmation') return;

        const source = task.nextFile ? { file: task.nextFile } : task.nextGenArgs;
        if(source) {
            get().startGeneration(source as any, prompts);
        }
    },
    cancelConfirmation: () => {
        const { task } = get();
        if (task && task.status === 'awaiting_confirmation') {
            set(state => updateTask(state, { status: 'completed', nextFile: undefined, nextGenArgs: undefined }));
        }
    },
    abortGeneration: () => {
        const { task } = get();
        if (task && task.status !== 'completed' && task.status !== 'error' && task.status !== 'idle') {
            task.abortController.abort();
        }
        set({ task: null, isSaved: false });
    }
  })
);

// We are renaming the old functions for clarity and to match the new unified approach
const useLegacyQuestionGenerationStore = useQuestionGenerationStore;

export { useLegacyQuestionGenerationStore as useQuestionGenerationStore };

