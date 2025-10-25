'use client';

import { useState, useEffect, useMemo, Suspense, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud, FileText, FileJson, Save, Wand2, Loader2, AlertCircle, Copy, Download, Trash2, Pencil, Check, Eye, X, Wrench, Folder, DownloadCloud, Settings, FileUp, RotateCw, FileQuestion, FileCheck, Layers, ChevronDown, FolderSearch } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import Link from 'next/link';
import { useUser } from '@/firebase/auth/use-user';
import { useCollection } from '@/firebase/firestore/use-collection';
import { addDoc, collection, deleteDoc, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/firebase';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuestionGenerationStore, type GenerationOptions, type PendingSource } from '@/stores/question-gen-store';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { FolderSelectorDialog } from '@/components/FolderSelectorDialog';
import { CSS } from '@dnd-kit/utilities';

type SavedQuestionSet = {
  id: string;
  fileName: string;
  textQuestions: string;
  jsonQuestions: string;
  textExam?: string;
  jsonExam?: string;
  textFlashcard?: string;
  jsonFlashcard?: string;
  createdAt: string;
  userId: string;
  sourceFileId: string;
  order: number;
};

// Helper to get text content while preserving line breaks
function getPreText(element: HTMLElement) {
    let text = element.innerHTML;
    text = text.replace(/<br\s*\/?>/gi, '\n'); // Convert <br> to newline
    text = text.replace(/<div>/gi, '\n');      // Convert <div> to newline
    text = text.replace(/<\/div>/gi, '');       // Remove </div>
    // Basic un-escaping for display
    text = text.replace(/&lt;/g, '<').replace(/&gt;/, '>').replace(/&amp;/g, '&');
    return text;
}


const GenerationOptionsDialog = ({ open, onOpenChange, onGenerate }: { open: boolean, onOpenChange: (open: boolean) => void, onGenerate: (options: GenerationOptions) => void }) => {
    const [options, setOptions] = useState<GenerationOptions>({
        generateQuestions: true,
        generateExam: false,
        generateFlashcards: false
    });

    const handleSubmit = () => {
        if (!options.generateQuestions && !options.generateExam && !options.generateFlashcards) {
            // Optionally, show a toast or message
            return;
        }
        onGenerate(options);
        onOpenChange(false);
    };

    const handleCheckedChange = (key: keyof GenerationOptions, checked: boolean) => {
        setOptions(prev => ({...prev, [key]: checked}));
    };

    const OptionCheckbox = ({ id, label, description, checked, onCheckedChange, icon: Icon, color }: { id: keyof GenerationOptions, label: string, description: string, checked: boolean, onCheckedChange: (checked: boolean) => void, icon: React.ElementType, color: string }) => (
      <div className="flex items-start space-x-4 rounded-xl p-4 hover:bg-slate-800/60 transition-colors">
          <Checkbox id={id} checked={checked} onCheckedChange={onCheckedChange} className="mt-1" />
          <div className="grid gap-1.5 leading-none">
              <div className="flex items-center gap-2">
                <Icon className={cn("w-5 h-5", color)} />
                <Label htmlFor={id} className="text-base font-medium text-white">
                  {label}
                </Label>
              </div>
              <p className="text-sm text-slate-400 pl-7">
                  {description}
              </p>
          </div>
      </div>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md glass-card p-0">
                <DialogHeader className="p-6 pb-4">
                    <DialogTitle className="text-xl">Generation Options</DialogTitle>
                    <DialogDescription>
                        Select the types of educational content you want to generate from your document.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-2 px-6 py-4 border-t border-b border-slate-800">
                    <OptionCheckbox
                        id="generateQuestions"
                        label="Questions & Answers"
                        description="Generate standard text questions with answers."
                        checked={options.generateQuestions}
                        onCheckedChange={(c) => handleCheckedChange('generateQuestions', !!c)}
                        icon={FileQuestion}
                        color="text-blue-400"
                    />
                     <OptionCheckbox
                        id="generateExam"
                        label="MCQ Exam"
                        description="Create a multiple-choice exam based on the content."
                        checked={options.generateExam}
                        onCheckedChange={(c) => handleCheckedChange('generateExam', !!c)}
                        icon={FileCheck}
                        color="text-rose-400"
                    />
                     <OptionCheckbox
                        id="generateFlashcards"
                        label="Flashcards"
                        description="Produce flashcards for key concepts and terms."
                        checked={options.generateFlashcards}
                        onCheckedChange={(c) => handleCheckedChange('generateFlashcards', !!c)}
                        icon={Layers}
                        color="text-indigo-400"
                    />
                </div>
                 <div className="flex justify-end gap-2 p-6">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className='rounded-xl'>Cancel</Button>
                    <Button onClick={handleSubmit} className='rounded-xl'>Generate</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};


const SortableQuestionSetCard = ({ set, isAdmin, onDeleteClick }: { set: SavedQuestionSet, isAdmin: boolean, onDeleteClick: (set: SavedQuestionSet) => void }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: set.id });
    const router = useRouter();

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 1 : 'auto',
    };

    const handleClick = () => {
        // Only navigate if not dragging. The 'isDragging' state is provided by useSortable.
        if (!isDragging) {
            router.push(`/questions-creator/${set.id}`);
        }
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            {...attributes} 
            {...listeners} 
            onClick={handleClick}
            className={cn(
                "relative group glass-card p-6 rounded-3xl hover:bg-white/10 transition-colors cursor-pointer flex flex-col", 
                isDragging && 'shadow-2xl shadow-blue-500/50'
            )}
        >
            <div className="flex justify-between items-start">
                <FileCheck className="w-8 h-8 text-rose-400 shrink-0" />
                {isAdmin && (
                    <div className="flex gap-1 absolute top-2 right-2">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity active:scale-95 z-10"
                            onMouseDown={(e) => e.stopPropagation()} // Prevent drag from starting on button click
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onDeleteClick(set);
                            }}
                        >
                            <Trash2 className="h-4 w-4 text-red-400"/>
                        </Button>
                    </div>
                )}
            </div>
            <h3 className="text-lg font-semibold text-white break-words mt-4">{set.fileName}</h3>
        </div>
    );
};


function QuestionsCreatorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'generate';

  const [generationPrompt, setGenerationPrompt] = useState('');
  const [jsonPrompt, setJsonPrompt] = useState('');
  const [examGenerationPrompt, setExamGenerationPrompt] = useState('');
  const [examJsonPrompt, setExamJsonPrompt] = useState('');
  const [flashcardGenerationPrompt, setFlashcardGenerationPrompt] = useState('');
  const [flashcardJsonPrompt, setFlashcardJsonPrompt] = useState('');
  const [originalPrompts, setOriginalPrompts] = useState({ gen: '', json: '', examGen: '', examJson: '', flashcardGen: '', flashcardJson: '' });
  const [isEditingPrompts, setIsEditingPrompts] = useState({ gen: false, json: false, examGen: false, examJson: false, flashcardGen: false, flashcardJson: false });
  const [itemToDelete, setItemToDelete] = useState<SavedQuestionSet | null>(null);
  const [sectionsVisibility, setSectionsVisibility] = useState({
    questions: true,
    exam: true,
    flashcards: true,
  });
  const [showFolderSelector, setShowFolderSelector] = useState(false);


  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    flowStep,
    pendingSource,
    task,
    isSaved,
    initiateGeneration,
    startGeneration,
    saveCurrentResults,
    resetFlow,
    retryGeneration,
    confirmContinue,
    cancelConfirmation,
    closeOptionsDialog,
  } = useQuestionGenerationStore();

  const { user } = useUser();
  const isAdmin = user?.uid === process.env.NEXT_PUBLIC_ADMIN_UID;
  const { data: fetchedSavedQuestions, loading: loadingSavedQuestions } = useCollection<SavedQuestionSet>(
    user ? `users/${user.uid}/questionSets` : '',
    { 
      orderBy: ['order', 'asc'],
      disabled: !user,
    }
  );

  const [savedQuestions, setSavedQuestions] = useState<SavedQuestionSet[]>([]);
  
  const handleSourceSelected = (source: PendingSource) => {
    initiateGeneration(source);
    setShowFolderSelector(false);
  };

  useEffect(() => {
    if (fetchedSavedQuestions) {
        setSavedQuestions(fetchedSavedQuestions);
    }
  }, [fetchedSavedQuestions]);

  const { toast } = useToast();

  const handleSavePrompt = (type: 'gen' | 'json' | 'examGen' | 'examJson' | 'flashcardGen' | 'flashcardJson') => {
    const keyMap = {
        gen: 'questionGenPrompt',
        json: 'questionJsonPrompt',
        examGen: 'examGenPrompt',
        examJson: 'examJsonPrompt',
        flashcardGen: 'flashcardGenPrompt',
        flashcardJson: 'flashcardJsonPrompt'
    };
    const promptMap = {
        gen: generationPrompt,
        json: jsonPrompt,
        examGen: examGenerationPrompt,
        examJson: examJsonPrompt,
        flashcardGen: flashcardGenerationPrompt,
        flashcardJson: flashcardJsonPrompt,
    };
    const titleMap = {
        gen: 'Question Generation Prompt',
        json: 'JSON Conversion Prompt',
        examGen: 'Exam Generation Prompt',
        examJson: 'Exam JSON Conversion Prompt',
        flashcardGen: 'Flashcard Generation Prompt',
        flashcardJson: 'Flashcard JSON Conversion Prompt'
    }

    localStorage.setItem(keyMap[type], promptMap[type]);
    setOriginalPrompts(prev => ({ ...prev, [type]: promptMap[type] }));
    toast({ title: 'Prompt Saved', description: `Your ${titleMap[type]} has been saved.` });
    setIsEditingPrompts(prev => ({...prev, [type]: false}));
  }

  const handleCancelPrompt = (type: 'gen' | 'json' | 'examGen' | 'examJson' | 'flashcardGen' | 'flashcardJson') => {
    const promptSetterMap = {
        gen: setGenerationPrompt,
        json: setJsonPrompt,
        examGen: setExamGenerationPrompt,
        examJson: setExamJsonPrompt,
        flashcardGen: setFlashcardGenerationPrompt,
        flashcardJson: setFlashcardJsonPrompt,
    };
    promptSetterMap[type](originalPrompts[type as keyof typeof originalPrompts]);
    setIsEditingPrompts(prev => ({...prev, [type]: false}));
  }

  useEffect(() => {
    const gen = localStorage.getItem('questionGenPrompt') || 'Generate 10 multiple-choice questions based on the following text. The questions should cover the main topics and details of the provided content.';
    const json = localStorage.getItem('questionJsonPrompt') || 'Convert the following text containing multiple-choice questions into a JSON array. Each object in the array should represent a single question and have the following structure: { "question": "The question text", "options": ["Option A", "Option B", "Option C", "Option D"], "answer": "The correct option text" }. Ensure the output is only the JSON array.';
    const examGen = localStorage.getItem('examGenPrompt') || 'Generate 20 difficult exam-style multiple-choice questions based on the document.';
    const examJson = localStorage.getItem('examJsonPrompt') || 'Convert the exam questions into a JSON array with structure: { "question": "...", "options": [...], "answer": "..." }.';
    const flashcardGen = localStorage.getItem('flashcardGenPrompt') || 'Generate 15 flashcards based on the key concepts in the document.';
    const flashcardJson = localStorage.getItem('flashcardJsonPrompt') || 'Convert the flashcards into a JSON array with structure: { "front": "...", "back": "..." }.';

    setGenerationPrompt(gen);
    setJsonPrompt(json);
    setExamGenerationPrompt(examGen);
    setExamJsonPrompt(examJson);
    setFlashcardGenerationPrompt(flashcardGen);
    setFlashcardJsonPrompt(flashcardJson);
    setOriginalPrompts({ gen, json, examGen, examJson, flashcardGen, flashcardJson });
  }, []);

  useEffect(() => {
    if (flowStep === 'error' && task?.error && !task.error?.includes('Aborted')) { // Don't toast for user-aborted actions
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: task.error || 'An unexpected error occurred.',
      });
    }
  }, [flowStep, task?.error, toast]);


  const handleSaveCurrentQuestions = async () => {
    if (!task || !user) {
      toast({
        variant: 'destructive',
        title: 'Cannot Save',
        description: 'You must be logged in and have generated questions before saving.',
      });
      return;
    }
    await saveCurrentResults(user.uid, savedQuestions.length);
    toast({ title: 'Questions Saved', description: 'Your generated questions have been saved to your library.' });
    
    // Reset flow after a short delay
    setTimeout(() => {
        resetFlow();
    }, 3000);
  };
  
  const allPrompts = useMemo(() => ({
    gen: generationPrompt,
    json: jsonPrompt,
    examGen: examGenerationPrompt,
    examJson: examJsonPrompt,
    flashcardGen: flashcardGenerationPrompt,
    flashcardJson: flashcardJsonPrompt,
  }), [generationPrompt, jsonPrompt, examGenerationPrompt, examJsonPrompt, flashcardGenerationPrompt, flashcardJsonPrompt]);
  

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      initiateGeneration({
        id: '', // Will be generated on save
        fileName: e.target.files[0].name,
        file: e.target.files[0],
      });
    }
  };
  
  const [isDragging, setIsDragging] = useState(false);
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      initiateGeneration({
        id: '',
        fileName: e.dataTransfer.files[0].name,
        file: e.dataTransfer.files[0],
      });
    }
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation();};
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Check if the relatedTarget is inside the drop zone before setting isDragging to false
    if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget as Node)) {
        return;
    }
    setIsDragging(false);
  };
  
  const handleDeleteSet = async () => {
    if (!itemToDelete || !user) return;
    const docRef = doc(db, `users/${user.uid}/questionSets`, itemToDelete.id);
    await deleteDoc(docRef);
    toast({ title: 'Set Deleted', description: 'The question set has been removed.' });
    setItemToDelete(null);
  };
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require pointer to move 8px before activating a drag
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
        setSavedQuestions((currentItems) => {
            const oldIndex = currentItems.findIndex((item) => item.id === active.id);
            const newIndex = currentItems.findIndex((item) => item.id === over.id);
            const newOrderedItems = arrayMove(currentItems, oldIndex, newIndex);
            
            // Persist the new order to Firestore
            if (user) {
                const batch = writeBatch(db);
                newOrderedItems.forEach((item, index) => {
                    const docRef = doc(db, `users/${user.uid}/questionSets`, item.id);
                    batch.update(docRef, { order: index });
                });
                batch.commit().catch(err => {
                    console.error("Failed to update order:", err);
                    toast({ variant: 'destructive', title: 'Error', description: 'Could not save new order.' });
                    // Optionally revert state on failure
                    setSavedQuestions(currentItems);
                });
            }
            return newOrderedItems;
        });
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } },
  };

  const isGenerating = flowStep === 'processing';
  
  const showTextRetry = task?.status === 'error' && ['extracting', 'generating_text'].includes(task.failedStep!);
  const showJsonRetry = task?.status === 'error' && task.failedStep === 'converting_json';
  const showExamTextRetry = task?.status === 'error' && task.failedStep === 'generating_exam_text';
  const showExamJsonRetry = task?.status === 'error' && task.failedStep === 'converting_exam_json';
  const showFlashcardTextRetry = task?.status === 'error' && task.failedStep === 'generating_flashcard_text';
  const showFlashcardJsonRetry = task?.status === 'error' && task.failedStep === 'converting_flashcard_json';


  const handleRetry = useCallback(() => {
    retryGeneration(allPrompts);
  }, [retryGeneration, allPrompts]);


  const renderOutputCard = (
    title: string, 
    icon: React.ReactNode, 
    content: string | null, 
    isLoading: boolean, 
    loadingText: string, 
    showRetryButton: boolean
  ) => {
    const hasContent = !!content || isLoading || showRetryButton;
    
    return (
        <div className={cn(
            "relative group glass-card p-6 rounded-3xl flex flex-col justify-between transition-all duration-300 ease-in-out",
             !hasContent && "h-24 justify-center"
          )}>
           <div className="flex items-start gap-4">
               {icon}
               <div>
                   <h3 className="text-lg font-semibold text-white break-words">{title}</h3>
                   {!hasContent && <p className="text-sm text-slate-400 mt-1">Generated content will appear here.</p>}
               </div>
           </div>
           {hasContent && (
             <div className="mt-4 flex-grow flex flex-col">
                <div className="relative flex-grow">
                    {isLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center w-full h-full text-center flex-grow bg-slate-800/60 border-slate-700 rounded-xl">
                            <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
                            <p className="ml-3 text-slate-300">{loadingText}</p>
                        </div>
                    ) : showRetryButton ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center w-full h-full text-center flex-grow bg-slate-800/60 border-slate-700 rounded-xl p-4">
                            <AlertCircle className="w-10 h-10 text-red-400 mb-2" />
                            <p className="text-red-400 text-sm mb-4">{task?.error || 'An error occurred.'}</p>
                            <Button onClick={handleRetry} className="rounded-xl active:scale-95">
                                <RotateCw className="mr-2 h-4 w-4" />
                                Retry
                            </Button>
                        </div>
                    ) : (
                       <textarea
                           value={content ?? ''}
                           readOnly
                           placeholder="Generated content will appear here..."
                           className="bg-slate-800/60 border-slate-700 rounded-xl w-full p-3 text-sm text-slate-200 no-scrollbar resize-none h-96 font-code"
                       />
                    )}
                </div>
            </div>
           )}
        </div>
    );
};

  const renderPromptCard = (type: 'gen' | 'json' | 'examGen' | 'examJson' | 'flashcardGen' | 'flashcardJson') => {
      const titleMap = {
          gen: "Question Generation Prompt",
          json: "Text-to-JSON Conversion Prompt",
          examGen: "Exam Generation Prompt",
          examJson: "Exam-to-JSON Conversion Prompt",
          flashcardGen: "Flashcard Generation Prompt",
          flashcardJson: "Flashcard-to-JSON Conversion Prompt"
      }
      const iconMap = {
          gen: <FileText className="w-8 h-8 text-blue-400 shrink-0" />,
          json: <FileJson className="w-8 h-8 text-blue-400 shrink-0" />,
          examGen: <FileText className="w-8 h-8 text-red-400 shrink-0" />,
          examJson: <FileJson className="w-8 h-8 text-red-400 shrink-0" />,
          flashcardGen: <FileText className="w-8 h-8 text-green-400 shrink-0" />,
          flashcardJson: <FileJson className="w-8 h-8 text-green-400 shrink-0" />,
      }
      const promptMap = {
          gen: generationPrompt,
          json: jsonPrompt,
          examGen: examGenerationPrompt,
          examJson: examJsonPrompt,
          flashcardGen: flashcardGenerationPrompt,
          flashcardJson: flashcardJsonPrompt,
      }
      const setPromptMap = {
          gen: setGenerationPrompt,
          json: setJsonPrompt,
          examGen: setExamGenerationPrompt,
          examJson: setExamJsonPrompt,
          flashcardGen: setFlashcardGenerationPrompt,
          flashcardJson: setFlashcardJsonPrompt,
      }
    
      return (
        <div className="relative group glass-card p-6 rounded-3xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
                <div className="flex items-start gap-4">
                    {iconMap[type]}
                    <div>
                        <h3 className="text-lg font-semibold text-white break-words">{titleMap[type]}</h3>
                    </div>
                </div>
                <TooltipProvider>
                    <div className="flex items-center gap-0">
                        {isEditingPrompts[type] ? (
                            <>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button onClick={() => handleSavePrompt(type)} size="icon" variant="ghost" className="h-9 w-9 rounded-full">
                                            <Check className="h-5 w-5 text-green-400" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Save</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button onClick={() => handleCancelPrompt(type)} size="icon" variant="ghost" className="h-9 w-9 rounded-full">
                                            <X className="h-5 w-5 text-red-400" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Cancel</p></TooltipContent>
                                </Tooltip>
                            </>
                        ) : (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button onClick={() => setIsEditingPrompts(p => ({...p, [type]: true}))} size="icon" variant="ghost" className="h-9 w-9 rounded-full">
                                        <Pencil className="h-5 w-5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Edit</p></TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                </TooltipProvider>
            </div>
            <textarea
                value={promptMap[type]}
                onChange={(e) => setPromptMap[type](e.target.value)}
                readOnly={!isEditingPrompts[type]}
                className="mt-4 bg-slate-800/60 border-slate-700 rounded-xl w-full p-3 text-sm text-slate-200 no-scrollbar resize-none h-96 font-code"
            />
        </div>
      );
  }


  const handleTabChange = (value: string) => {
    // Do not show warning when just switching tabs
    router.push(`/questions-creator?tab=${value}`, { scroll: false });
  };

  const SectionHeader = ({ title, section, isVisible, onToggle }: { title: string, section: keyof typeof sectionsVisibility, isVisible: boolean, onToggle: (section: keyof typeof sectionsVisibility) => void }) => (
    <div className="flex items-center gap-2 my-4">
      <Button variant="ghost" size="icon" onClick={() => onToggle(section)} className="h-6 w-6 rounded-full">
        <ChevronDown className={cn("h-5 w-5 transition-transform", isVisible ? "" : "-rotate-90")} />
      </Button>
      <div className="flex-grow border-t border-white/10"></div>
    </div>
  );


  const renderGenerateTabContent = () => {
    if (flowStep !== 'idle' && (pendingSource || task)) {
        const generationOptions = task?.generationOptions || { generateQuestions: true, generateExam: false, generateFlashcards: false };
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                     <AnimatePresence>
                        {(task || pendingSource) && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="relative mt-4 flex items-center gap-2 text-blue-300 bg-blue-900/50 p-3 rounded-lg"
                            >
                                <FileText className="h-5 w-5" />
                                <p className="text-sm truncate flex-1">{pendingSource?.fileName || task?.fileName}</p>
                                <button
                                    onClick={resetFlow}
                                    className="p-1 rounded-full hover:bg-white/10 text-slate-300"
                                    aria-label="Cancel generation"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                 
                {generationOptions.generateQuestions && (
                    <div className="md:col-span-2">
                        <SectionHeader title="Questions" section="questions" isVisible={sectionsVisibility.questions} onToggle={(s) => setSectionsVisibility(p => ({...p, [s]: !p[s]}))} />
                        <AnimatePresence initial={false}>
                        {sectionsVisibility.questions && (
                            <motion.div
                                key="questions"
                                initial="collapsed" animate="open" exit="collapsed"
                                variants={{ open: { opacity: 1, height: 'auto' }, collapsed: { opacity: 0, height: 0 } }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                    {renderOutputCard(
                                        "Text Questions",
                                        <FileText className="w-8 h-8 text-blue-400 shrink-0" />,
                                        task?.textQuestions ?? null,
                                        isGenerating && ['extracting', 'generating_text'].includes(task.status),
                                        task?.status === 'extracting' ? 'Extracting text...' : 'Generating questions...',
                                        showTextRetry
                                    )}
                                    {renderOutputCard(
                                        "JSON Questions",
                                        <FileJson className="w-8 h-8 text-blue-400 shrink-0" />,
                                        task?.jsonQuestions ?? null,
                                        isGenerating && task.status === 'converting_json',
                                        'Converting to JSON...',
                                        showJsonRetry
                                    )}
                                </div>
                            </motion.div>
                        )}
                        </AnimatePresence>
                    </div>
                )}
                
                {generationOptions.generateExam && (
                    <div className="md:col-span-2">
                        <SectionHeader title="Exam" section="exam" isVisible={sectionsVisibility.exam} onToggle={(s) => setSectionsVisibility(p => ({...p, [s]: !p[s]}))} />
                        <AnimatePresence initial={false}>
                        {sectionsVisibility.exam && (
                            <motion.div
                                key="exam"
                                initial="collapsed" animate="open" exit="collapsed"
                                variants={{ open: { opacity: 1, height: 'auto' }, collapsed: { opacity: 0, height: 0 } }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                    {renderOutputCard(
                                    "Text Exam",
                                    <FileText className="w-8 h-8 text-red-400 shrink-0" />,
                                    task?.textExam ?? null,
                                    isGenerating && task.status === 'generating_exam_text',
                                    'Generating exam...',
                                    showExamTextRetry
                                    )}
                                    {renderOutputCard(
                                    "JSON Exam",
                                    <FileJson className="w-8 h-8 text-red-400 shrink-0" />,
                                    task?.jsonExam ?? null,
                                    isGenerating && task.status === 'converting_exam_json',
                                    'Converting exam to JSON...',
                                    showExamJsonRetry
                                    )}
                                </div>
                            </motion.div>
                        )}
                        </AnimatePresence>
                    </div>
                )}

                {generationOptions.generateFlashcards && (
                    <div className="md:col-span-2">
                        <SectionHeader title="Flashcards" section="flashcards" isVisible={sectionsVisibility.flashcards} onToggle={(s) => setSectionsVisibility(p => ({...p, [s]: !p[s]}))} />
                        <AnimatePresence initial={false}>
                        {sectionsVisibility.flashcards && (
                            <motion.div
                                key="flashcards"
                                initial="collapsed" animate="open" exit="collapsed"
                                variants={{ open: { opacity: 1, height: 'auto' }, collapsed: { opacity: 0, height: 0 } }}
                                transition={{ duration: 0.3 }}
                                className="overflow-hidden"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                    {renderOutputCard(
                                    "Text Flashcard",
                                    <FileText className="w-8 h-8 text-green-400 shrink-0" />,
                                    task?.textFlashcard ?? null,
                                    isGenerating && task.status === 'generating_flashcard_text',
                                    'Generating flashcards...',
                                    showFlashcardTextRetry
                                    )}
                                    {renderOutputCard(
                                    "JSON Flashcard",
                                    <FileJson className="w-8 h-8 text-green-400 shrink-0" />,
                                    task?.jsonFlashcard ?? null,
                                    isGenerating && task.status === 'converting_flashcard_json',
                                    'Converting flashcards to JSON...',
                                    showFlashcardJsonRetry
                                    )}
                                </div>
                            </motion.div>
                        )}
                        </AnimatePresence>
                    </div>
                )}
                 <div className="md:col-span-2 flex justify-center">
                    <Button
                        onClick={handleSaveCurrentQuestions}
                        disabled={flowStep !== 'completed'}
                        className="rounded-xl mt-4"
                    >
                         {isSaved ? <><Check className="mr-2 h-4 w-4" /> Saved!</> : <><Save className="mr-2 h-4 w-4" /> Save Results</>}
                    </Button>
                </div>
            </div>
        );
    }

    return (
      <>
        <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className={cn(
                "relative group glass-card p-6 rounded-3xl transition-colors flex flex-col justify-center items-center min-h-[300px]",
                isDragging && "border-blue-500 bg-blue-900/20"
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
        >
            <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="hidden"
            />
            <div className="text-center">
                <Wand2 className="w-12 h-12 text-yellow-400 shrink-0 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white break-words">Start Generating</h3>
                <p className="text-sm text-slate-400 mt-1 mb-4">Choose a file from your library, or drag & drop a new one.</p>
                <div className="flex gap-4 justify-center">
                    <Button onClick={() => setShowFolderSelector(true)} className="rounded-xl">
                      <FolderSearch className="mr-2 h-4 w-4"/>
                      Choose from Library
                    </Button>
                    <Button onClick={() => fileInputRef.current?.click()} className="rounded-xl" variant="secondary">
                       <FileUp className="mr-2 h-4 w-4" />
                       Upload File
                    </Button>
                </div>
            </div>
        </motion.div>
        <FolderSelectorDialog
            open={showFolderSelector}
            onOpenChange={setShowFolderSelector}
            onSelectFile={handleSourceSelected}
            actionType="select_source"
        />
      </>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar pt-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-teal-300 text-transparent bg-clip-text">
          Questions Creator
        </h1>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full mt-6 flex flex-col items-center">
        <TabsList className="grid w-full max-w-lg mx-auto grid-cols-3 bg-black/20 border-white/10 rounded-full p-1.5 h-12">
            <TabsTrigger value="generate">Generate</TabsTrigger>
            <TabsTrigger value="prompts">Prompts</TabsTrigger>
            <TabsTrigger value="saved">Saved Questions</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="w-full max-w-7xl mx-auto mt-4">
           {renderGenerateTabContent()}
        </TabsContent>
        
        <TabsContent value="prompts" className="w-full max-w-7xl mx-auto mt-4">
             <div className="max-w-7xl mx-auto">
                <SectionHeader title="Questions" section="questions" isVisible={sectionsVisibility.questions} onToggle={(s) => setSectionsVisibility(p => ({...p, [s]: !p[s]}))} />
                 <AnimatePresence initial={false}>
                    {sectionsVisibility.questions && (
                         <motion.div
                            key="questions"
                            initial="collapsed" animate="open" exit="collapsed"
                            variants={{ open: { opacity: 1, height: 'auto' }, collapsed: { opacity: 0, height: 0 } }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                {renderPromptCard('gen')}
                                {renderPromptCard('json')}
                            </div>
                        </motion.div>
                    )}
                 </AnimatePresence>

                 <SectionHeader title="Exam" section="exam" isVisible={sectionsVisibility.exam} onToggle={(s) => setSectionsVisibility(p => ({...p, [s]: !p[s]}))} />
                 <AnimatePresence initial={false}>
                    {sectionsVisibility.exam && (
                         <motion.div
                            key="exam"
                            initial="collapsed" animate="open" exit="collapsed"
                            variants={{ open: { opacity: 1, height: 'auto' }, collapsed: { opacity: 0, height: 0 } }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                {renderPromptCard('examGen')}
                                {renderPromptCard('examJson')}
                            </div>
                        </motion.div>
                    )}
                 </AnimatePresence>

                 <SectionHeader title="Flashcards" section="flashcards" isVisible={sectionsVisibility.flashcards} onToggle={(s) => setSectionsVisibility(p => ({...p, [s]: !p[s]}))} />
                 <AnimatePresence initial={false}>
                    {sectionsVisibility.flashcards && (
                         <motion.div
                            key="flashcards"
                            initial="collapsed" animate="open" exit="collapsed"
                            variants={{ open: { opacity: 1, height: 'auto' }, collapsed: { opacity: 0, height: 0 } }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                {renderPromptCard('flashcardGen')}
                                {renderPromptCard('flashcardJson')}
                            </div>
                        </motion.div>
                    )}
                 </AnimatePresence>
            </div>
        </TabsContent>

        <TabsContent value="saved" className="w-full max-w-6xl mx-auto mt-4">
             <motion.div variants={cardVariants} initial="hidden" animate="visible" className="max-w-6xl mx-auto">
                {loadingSavedQuestions ? (
                    <div className="text-center py-16"><Loader2 className="mx-auto h-12 w-12 text-slate-500 animate-spin" /></div>
                ) : savedQuestions && savedQuestions.length > 0 ? (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={savedQuestions.map(s => s.id)} strategy={rectSortingStrategy}>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {savedQuestions.map(set => (
                                    <SortableQuestionSetCard 
                                        key={set.id}
                                        set={set}
                                        isAdmin={isAdmin}
                                        onDeleteClick={setItemToDelete}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                ) : (
                    <div className="text-center py-16">
                        <Folder className="mx-auto h-12 w-12 text-slate-500" />
                        <h3 className="mt-4 text-lg font-semibold text-white">No Saved Questions</h3>
                        <p className="mt-2 text-sm text-slate-400">Your saved question sets will appear here.</p>
                    </div>
                )}
            </motion.div>
        </TabsContent>
      </Tabs>

      <GenerationOptionsDialog 
        open={flowStep === 'awaiting_options'}
        onOpenChange={(isOpen) => {
            if (!isOpen) closeOptionsDialog();
        }}
        onGenerate={(options) => startGeneration(options, allPrompts)}
      />

      <AlertDialog open={flowStep === 'awaiting_confirmation'} onOpenChange={(open) => {if(!open) cancelConfirmation()}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved generated questions. If you continue, these changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
                <Button variant="outline" className="rounded-xl" onClick={cancelConfirmation}>Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
                <Button onClick={confirmContinue} className="rounded-xl bg-blue-600 hover:bg-blue-700">Continue</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the question set for "{itemToDelete?.fileName}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild><Button variant="outline" className="rounded-xl">Cancel</Button></AlertDialogCancel>
            <AlertDialogAction asChild><Button variant="destructive" className="rounded-xl" onClick={handleDeleteSet}>Delete</Button></AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

export default function QuestionsCreatorPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-blue-400" /></div>}>
            <QuestionsCreatorContent />
        </Suspense>
    )
}
