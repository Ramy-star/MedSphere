'use client';

import { useState, useEffect, useMemo, Suspense, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { UploadCloud, FileText, FileJson, Save, Wand2, Loader2, AlertCircle, Copy, Download, Trash2, Pencil, Check, Eye, X, Wrench, Folder, DownloadCloud, Settings, FileUp, RotateCw, FileQuestion, FileCheck, Layers, ChevronDown, FolderSearch, EyeOff, Lightbulb } from 'lucide-react';
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
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { FolderSelectorDialog } from '@/components/FolderSelectorDialog';
import { CSS } from '@dnd-kit/utilities';
import { contentService, type Content } from '@/lib/contentService';
import type { Lecture } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';
import { SavedQuestionsIcon } from '@/components/icons/SavedQuestionsIcon';
import { InteractiveExamIcon } from '@/components/icons/InteractiveExamIcon';
import { FlashcardIcon } from '@/components/icons/FlashcardIcon';


type SavedQuestionSet = {
  id: string;
  fileName: string;
  textQuestions: string;
  jsonQuestions: any;
  textExam?: string;
  jsonExam?: any;
  textFlashcard?: string;
  jsonFlashcard?: any;
  createdAt: string;
  userId: string;
  sourceFileId: string;
  order: number;
};


const GenerationOptionsDialog = ({ open, onOpenChange, onGenerate }: { open: boolean, onOpenChange: (open: boolean) => void, onGenerate: (options: GenerationOptions) => void }) => {
    const [options, setOptions] = useState<GenerationOptions>({
        generateQuestions: false,
        generateExam: false,
        generateFlashcards: false
    });

    const handleSubmit = () => {
        if (!options.generateQuestions && !options.generateExam && !options.generateFlashcards) {
            // Optionally, show a toast or message to select at least one
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
                        icon={Lightbulb}
                        color="text-yellow-400"
                    />
                     <OptionCheckbox
                        id="generateExam"
                        label="MCQ Exam"
                        description="Create a multiple-choice exam based on the content."
                        checked={options.generateExam}
                        onCheckedChange={(c) => handleCheckedChange('generateExam', !!c)}
                        icon={InteractiveExamIcon}
                        color="text-rose-400"
                    />
                     <OptionCheckbox
                        id="generateFlashcards"
                        label="Flashcards"
                        description="Produce flashcards for key concepts and terms."
                        checked={options.generateFlashcards}
                        onCheckedChange={(c) => handleCheckedChange('generateFlashcards', !!c)}
                        icon={FlashcardIcon}
                        color="text-indigo-400"
                    />
                </div>
                 <div className="flex justify-center gap-2 p-6">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className='rounded-xl'>Cancel</Button>
                    <Button onClick={handleSubmit} className='rounded-xl'>Generate</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};


const SortableQuestionSetCard = ({ set, canAdminister, onDeleteClick }: { set: SavedQuestionSet, canAdminister: boolean, onDeleteClick: (set: SavedQuestionSet) => void }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: set.id });
    const router = useRouter();

    const style: React.CSSProperties = {
        transform: transform ? CSS.Transform.toString(transform) : undefined,
        transition,
        zIndex: isDragging ? 1 : 'auto',
    };

    const handleClick = () => {
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
                <SavedQuestionsIcon className="w-8 h-8 shrink-0" />
                {canAdminister && (
                    <div className="flex gap-1 absolute top-2 right-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity active:scale-95 z-10"
                            onMouseDown={(e) => e.stopPropagation()}
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
            <h3 className="text-lg font-semibold text-white break-words mt-4">{set.fileName.replace(/\.[^/.]+$/, "")}</h3>
        </div>
    );
};


function QuestionsCreatorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'generate';

  const [generationPrompt, setGenerationPrompt] = useState('');
  const [examGenerationPrompt, setExamGenerationPrompt] = useState('');
  const [flashcardGenerationPrompt, setFlashcardGenerationPrompt] = useState('');
  const [originalPrompts, setOriginalPrompts] = useState({ gen: '', examGen: '', flashcardGen: '' });
  const [isEditingPrompts, setIsEditingPrompts] = useState({ gen: false, examGen: false, flashcardGen: false });
  const [itemToDelete, setItemToDelete] = useState<SavedQuestionSet | null>(null);
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
    abortGeneration,
    closeOptionsDialog,
  } = useQuestionGenerationStore();

  const { studentId, can } = useAuthStore();
  const canAdminister = can('canAccessQuestionCreator', null);
  
  const { data: fetchedSavedQuestions, loading: loadingSavedQuestions } = useCollection<SavedQuestionSet>(
    studentId ? `users/${studentId}/questionSets` : '',
    {
      orderBy: ['order', 'asc'],
      disabled: !studentId,
    }
  );

  const [savedQuestions, setSavedQuestions] = useState<SavedQuestionSet[]>([]);

  const handleSourceSelected = (source: Content) => {
    initiateGeneration({
      id: source.id,
      fileName: source.name,
      fileUrl: source.metadata?.storagePath,
    });
    setShowFolderSelector(false);
  };

  useEffect(() => {
    if (fetchedSavedQuestions) {
        setSavedQuestions(fetchedSavedQuestions);
    }
  }, [fetchedSavedQuestions]);

  const { toast } = useToast();

  const handleSavePrompt = (type: 'gen' | 'examGen' | 'flashcardGen') => {
    const keyMap = {
        gen: 'questionGenPrompt',
        examGen: 'examGenPrompt',
        flashcardGen: 'flashcardGenPrompt',
    };
    const promptMap = {
        gen: generationPrompt,
        examGen: examGenerationPrompt,
        flashcardGen: flashcardGenerationPrompt,
    };
    const titleMap = {
        gen: 'Question Generation Prompt',
        examGen: 'Exam Generation Prompt',
        flashcardGen: 'Flashcard Generation Prompt'
    }

    localStorage.setItem(keyMap[type], promptMap[type]);
    setOriginalPrompts(prev => ({ ...prev, [type]: promptMap[type] }));
    toast({ title: 'Prompt Saved', description: `Your ${titleMap[type]} has been saved.` });
    setIsEditingPrompts(prev => ({...prev, [type]: false}));
  }

  const handleCancelPrompt = (type: 'gen' | 'examGen' | 'flashcardGen') => {
    const promptSetterMap = {
        gen: setGenerationPrompt,
        examGen: setExamGenerationPrompt,
        flashcardGen: setFlashcardGenerationPrompt,
    };
    promptSetterMap[type](originalPrompts[type]);
    setIsEditingPrompts(prev => ({...prev, [type]: false}));
  }

  useEffect(() => {
    const gen = localStorage.getItem('questionGenPrompt') || 'Generate 10 multiple-choice questions and a few written cases based on the provided text. The questions should cover the main topics and details of the provided content.';
    const examGen = localStorage.getItem('examGenPrompt') || 'Generate 20 difficult exam-style multiple-choice questions based on the document.';
    const flashcardGen = localStorage.getItem('flashcardGenPrompt') || 'Generate 15 flashcards based on the key concepts in the document. Each flashcard should have a "front" (the question) and a "back" (the answer).';
    
    setGenerationPrompt(gen);
    setExamGenerationPrompt(examGen);
    setFlashcardGenerationPrompt(flashcardGen);
    setOriginalPrompts({ gen, examGen, flashcardGen });
  }, []);

  useEffect(() => {
    if (flowStep === 'error' && task?.error && !task.error?.includes('Aborted')) {
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: task.error || 'An unexpected error occurred.',
      });
    }
  }, [flowStep, task?.error, toast]);


  const handleSaveCurrentQuestions = async () => {
    if (!task || !studentId) {
      toast({
        variant: 'destructive',
        title: 'Cannot Save',
        description: 'You must be logged in and have generated questions before saving.',
      });
      return;
    }
    await saveCurrentResults(studentId, savedQuestions.length);
    toast({ title: 'Questions Saved', description: 'Your generated questions have been saved to your library.' });

    setTimeout(() => {
        resetFlow();
    }, 3000);
  };

  const allPrompts = useMemo(() => ({
    gen: generationPrompt,
    examGen: examGenerationPrompt,
    flashcardGen: flashcardGenerationPrompt,
  }), [generationPrompt, examGenerationPrompt, flashcardGenerationPrompt]);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      initiateGeneration({
        id: '', 
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
    if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget as Node)) {
        return;
    }
    setIsDragging(false);
  };

  const handleDeleteSet = async () => {
    if (!itemToDelete || !studentId) return;
    const docRef = doc(db, `users/${studentId}/questionSets`, itemToDelete.id);
    await deleteDoc(docRef);
    toast({ title: 'Set Deleted', description: 'The question set has been removed.' });
    setItemToDelete(null);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
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

            if (studentId) {
                const batch = writeBatch(db);
                newOrderedItems.forEach((item, index) => {
                    const docRef = doc(db, `users/${studentId}/questionSets`, item.id);
                    batch.update(docRef, { order: index });
                });
                batch.commit().catch(err => {
                    console.error("Failed to update order:", err);
                    toast({ variant: 'destructive', title: 'Error', description: 'Could not save new order.' });
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

  const handleRetry = useCallback(() => {
    retryGeneration(allPrompts);
  }, [retryGeneration, allPrompts]);

  const renderGenerateTabContent = () => {
    if (flowStep !== 'idle' && (pendingSource || task)) {
        return (
            <div className="flex flex-col items-center">
                <AnimatePresence>
                    <div className="w-full max-w-2xl flex items-center justify-between gap-4 my-4">
                        {(task || pendingSource) && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="relative flex items-center gap-2 text-blue-300 bg-blue-900/50 p-3 rounded-lg flex-1"
                            >
                                <FileText className="h-5 w-5" />
                                <p className="text-sm truncate flex-1">{pendingSource?.fileName || task?.fileName}</p>
                                <button
                                    onClick={abortGeneration}
                                    className="p-1 rounded-full hover:bg-white/10 text-slate-300"
                                    aria-label="Cancel generation"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </motion.div>
                        )}
                        <button
                            onClick={handleSaveCurrentQuestions}
                            disabled={flowStep !== 'completed'}
                            className={cn(
                                "expanding-btn primary",
                                isSaved && "border-green-500 text-green-500 hover:bg-green-500 hover:text-white"
                            )}
                        >
                            <span className="flex items-center justify-center gap-2">
                            {isSaved ? <Check size={20} /> : <Save size={20} />}
                            <span className="expanding-text">{isSaved ? "Saved!" : "Save Results"}</span>
                            </span>
                        </button>
                    </div>
                </AnimatePresence>
                
                <div className="w-full">
                     <div className="relative group glass-card p-6 rounded-3xl flex flex-col justify-between transition-all duration-300 ease-in-out">
                         <div className="flex items-start gap-4">
                            <Wand2 className="w-8 h-8 text-yellow-400 shrink-0" />
                            <div>
                                <h3 className="text-lg font-semibold text-white break-words">Generated Content</h3>
                            </div>
                         </div>
                         <div className="mt-4 flex-grow flex flex-col">
                              {task?.status === 'processing' && (
                                <div className="flex items-center justify-center w-full h-full text-center flex-grow bg-slate-800/60 border-slate-700 rounded-xl p-8">
                                    <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
                                    <p className="ml-3 text-slate-300">Generating content... This may take a moment.</p>
                                </div>
                              )}
                              {task?.status === 'error' && (
                                 <div className="flex flex-col items-center justify-center w-full h-full text-center flex-grow p-8">
                                    <p className="text-red-400 mb-4">{task.error}</p>
                                    <Button onClick={handleRetry} className="rounded-xl active:scale-95">
                                        <RotateCw className="mr-2 h-4 w-4" />
                                        Retry
                                    </Button>
                                </div>
                              )}
                              {task?.status === 'completed' && (
                                <div className="text-center p-8">
                                    <FileCheck className="w-12 h-12 text-green-400 mx-auto mb-4"/>
                                    <h3 className="text-xl font-bold text-white">Generation Complete!</h3>
                                    <p className="text-slate-300 mt-2">Your questions, exam, and flashcards are ready. You can now save them to your library.</p>
                                </div>
                              )}
                         </div>
                     </div>
                </div>
            </div>
        );
    }

    return (
      <>
        <div
            className={cn(
                "relative group p-6 rounded-3xl transition-colors flex flex-col justify-center items-center min-h-[300px]",
                isDragging && "border-2 border-dashed border-blue-500 bg-blue-900/20"
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
                    <Button onClick={() => setShowFolderSelector(true)} className="rounded-2xl">
                      <FolderSearch className="mr-2 h-4 w-4"/>
                      Choose from Library
                    </Button>
                    <Button onClick={() => fileInputRef.current?.click()} className="rounded-2xl" variant="secondary">
                       <FileUp className="mr-2 h-4 w-4" />
                       Upload File
                    </Button>
                </div>
            </div>
        </div>
        <FolderSelectorDialog
            open={showFolderSelector}
            onOpenChange={setShowFolderSelector}
            onSelect={handleSourceSelected}
            actionType="select_source"
        />
      </>
    );
  }

  const renderPromptCard = (type: 'gen' | 'examGen' | 'flashcardGen') => {
      const titleMap = {
          gen: "Question Generation Prompt",
          examGen: "Exam Generation Prompt",
          flashcardGen: "Flashcard Generation Prompt"
      }
      const iconMap = {
          gen: <FileText className="w-8 h-8 text-blue-400 shrink-0" />,
          examGen: <FileText className="w-8 h-8 text-red-400 shrink-0" />,
          flashcardGen: <FileText className="w-8 h-8 text-green-400 shrink-0" />,
      }
      const promptMap = {
          gen: generationPrompt,
          examGen: examGenerationPrompt,
          flashcardGen: flashcardGenerationPrompt,
      }
      const setPromptMap = {
          gen: setGenerationPrompt,
          examGen: setExamGenerationPrompt,
          flashcardGen: setFlashcardGenerationPrompt,
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
    router.push(`/questions-creator?tab=${value}`, { scroll: false });
  };


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
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {renderPromptCard('gen')}
                {renderPromptCard('examGen')}
                {renderPromptCard('flashcardGen')}
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
                                        canAdminister={canAdminister}
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
