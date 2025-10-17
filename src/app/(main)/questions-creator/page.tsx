
'use client';

import { useState, useEffect, useMemo, Suspense, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud, FileText, FileJson, Save, Wand2, Loader2, AlertCircle, Copy, Download, Trash2, Pencil, Check, Eye, X, Wrench, Folder, DownloadCloud, Settings, FileUp, RotateCw } from 'lucide-react';
import { motion } from 'framer-motion';
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
import { addDoc, collection, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuestionGenerationStore } from '@/stores/question-gen-store';
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


type SavedQuestionSet = {
  id: string;
  fileName: string;
  textQuestions: string;
  jsonQuestions: string;
  createdAt: string;
  userId: string;
  sourceFileId: string;
};

// Helper to get text content while preserving line breaks
function getPreText(element: HTMLElement) {
    let text = element.innerHTML;
    text = text.replace(/<br\s*\/?>/gi, '\n'); // Convert <br> to newline
    text = text.replace(/<div>/gi, '\n');      // Convert <div> to newline
    text = text.replace(/<\/div>/gi, '');       // Remove </div>
    // Basic un-escaping for display
    text = text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    return text;
}


function QuestionsCreatorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [generationPrompt, setGenerationPrompt] = useState('');
  const [jsonPrompt, setJsonPrompt] = useState('');
  const [isEditingPrompts, setIsEditingPrompts] = useState({ gen: false, json: false });
  const [isDragging, setIsDragging] = useState(false);
  const [previewContent, setPreviewContent] = useState<{title: string, content: string, type: 'text' | 'json', setId?: string} | null>(null);
  const [isPreviewEditing, setIsPreviewEditing] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<SavedQuestionSet | null>(null);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);


  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    task,
    isSaved,
    startGenerationWithFile,
    saveCurrentResults,
    retryGeneration,
    clearTask,
  } = useQuestionGenerationStore();

  const { user } = useUser();
  const isAdmin = user?.uid === process.env.NEXT_PUBLIC_ADMIN_UID;
  const { data: savedQuestions, loading: loadingSavedQuestions } = useCollection<SavedQuestionSet>(
    user ? `users/${user.uid}/questionSets` : '',
    { 
      orderBy: ['createdAt', 'desc'],
      disabled: !user,
    }
  );

  const initialTab = 'generate';
  const { toast } = useToast();

  const handleSaveGenPrompt = () => {
    localStorage.setItem('questionGenPrompt', generationPrompt);
    toast({ title: 'Prompt Saved', description: 'Your question generation prompt has been saved.' });
    setIsEditingPrompts(prev => ({...prev, gen: false}));
  }

  const handleSaveJsonPrompt = () => {
    localStorage.setItem('questionJsonPrompt', jsonPrompt);
    toast({ title: 'Prompt Saved', description: 'Your JSON conversion prompt has been saved.' });
    setIsEditingPrompts(prev => ({...prev, json: false}));
  }

  useEffect(() => {
    setGenerationPrompt(localStorage.getItem('questionGenPrompt') || 'Generate 10 multiple-choice questions based on the following text. The questions should cover the main topics and details of the provided content.');
    setJsonPrompt(localStorage.getItem('questionJsonPrompt') || 'Convert the following text containing multiple-choice questions into a JSON array. Each object in the array should represent a single question and have the following structure: { "question": "The question text", "options": ["Option A", "Option B", "Option C", "Option D"], "answer": "The correct option text" }. Ensure the output is only the JSON array.');
  }, []);

  useEffect(() => {
    if (task?.status === 'error' && !task.error?.includes('Aborted')) { // Don't toast for user-aborted actions
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: task.error || 'An unexpected error occurred.',
      });
    }
  }, [task?.status, task?.error, toast]);


  const handleSaveCurrentQuestions = async () => {
    if (!task?.textQuestions || !task?.jsonQuestions || !task?.fileName || !user) {
      toast({
        variant: 'destructive',
        title: 'Cannot Save',
        description: 'You must be logged in and have generated questions before saving.',
      });
      return;
    }
    await saveCurrentResults(user.uid);
    toast({ title: 'Questions Saved', description: 'Your generated questions have been saved to your library.' });
  };
  
  const handleConfirmContinue = () => {
    if (pendingFile) {
      proceedWithGeneration(pendingFile);
    }
    setShowUnsavedWarning(false);
    setPendingFile(null);
  };
  
  const proceedWithGeneration = (file: File) => {
    clearTask(); // Clear previous task before starting a new one
    startGenerationWithFile(file, generationPrompt, jsonPrompt);
  };

  const processFile = async (file: File) => {
    if (task?.status === 'completed' && !isSaved) {
      setPendingFile(file);
      setShowUnsavedWarning(true);
    } else {
      proceedWithGeneration(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) processFile(e.target.files[0]);
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
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
  
  const handlePreviewSave = async () => {
    if (!previewContent) return;
    const { type, content, setId } = previewContent;
    
    if (setId && user) {
        const docRef = doc(db, `users/${user.uid}/questionSets`, setId);
        await updateDoc(docRef, { [type === 'text' ? 'textQuestions' : 'jsonQuestions']: content });
    }
    
    setIsPreviewEditing(false);
    toast({ title: 'Content Updated' });
  };
  

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } },
  };

  const isGenerating = !!(task && ['extracting', 'generating_text', 'converting_json'].includes(task.status));
  const showTextRetry = task?.status === 'error' && (task.failedStep === 'extracting' || task.failedStep === 'generating_text');
  const showJsonRetry = task?.status === 'error' && task.failedStep === 'converting_json';


  const handleRetry = useCallback(() => {
    if(!task) return;
    retryGeneration(generationPrompt, jsonPrompt);
  }, [task, retryGeneration, generationPrompt, jsonPrompt]);


  const renderOutputCard = (title: string, icon: React.ReactNode, content: string | null, isLoading: boolean, loadingText: string, showRetryButton: boolean) => {
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


  const handleTabChange = (value: string) => {
    // Do not show warning when just switching tabs
    router.push(`/questions-creator?tab=${value}`, { scroll: false });
  };


  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-2 no-scrollbar">
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-teal-300 text-transparent bg-clip-text">
          Questions Creator
        </h1>
      </div>

      <Tabs defaultValue={initialTab} value={searchParams.get('tab') || initialTab} onValueChange={handleTabChange} className="w-full mt-4">
        <TabsList className="grid w-full max-w-lg mx-auto grid-cols-3 bg-black/20 border-white/10 rounded-full p-1 h-12">
            <TabsTrigger value="generate" className="rounded-full">Generate</TabsTrigger>
            <TabsTrigger value="prompts" className="rounded-full">Prompts</TabsTrigger>
            <TabsTrigger value="saved" className="rounded-full">Saved Questions</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    className={cn(
                        "relative group glass-card p-6 rounded-3xl hover:bg-white/10 transition-colors cursor-pointer flex flex-col justify-between",
                        isDragging && "border-blue-500 bg-blue-900/20",
                        isGenerating && "pointer-events-none opacity-60"
                    )}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                >
                     <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf, text/markdown, .md"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    <div className="flex items-start gap-4">
                        <FileUp className="w-10 h-10 text-blue-400 shrink-0" />
                        <div>
                            <h3 className="text-lg font-semibold text-white break-words">1. Upload Lecture</h3>
                            <p className="text-sm text-slate-400 mt-1">Drag & drop or click to upload a PDF or MD file.</p>
                        </div>
                    </div>
                     {task?.fileName && (
                        <div className="mt-4 flex items-center gap-2 text-blue-300 bg-blue-900/20 p-3 rounded-lg">
                            <FileText className="h-5 w-5" />
                            <p className="text-sm truncate">{task.fileName}</p>
                        </div>
                    )}
                </motion.div>

                <motion.div
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: 0.1 }}
                    className={cn(
                        "relative group glass-card p-6 rounded-3xl hover:bg-white/10 transition-colors cursor-pointer flex flex-col justify-between",
                        (task?.status !== 'completed') && "opacity-50 pointer-events-none"
                    )}
                     onClick={handleSaveCurrentQuestions}
                >
                    <div className="flex items-start gap-4">
                        <Save className="w-10 h-10 text-green-400 shrink-0" />
                        <div>
                            <h3 className="text-lg font-semibold text-white break-words">2. Save Results</h3>
                            <p className="text-sm text-slate-400 mt-1">Click here to save the generated questions to your library.</p>
                        </div>
                    </div>
                     {isSaved && (
                        <div className="mt-4 flex items-center gap-2 text-green-400 bg-green-900/20 p-3 rounded-lg">
                            <Check className="h-5 w-5" />
                            <p className="text-sm">Questions have been saved!</p>
                        </div>
                    )}
                </motion.div>
                
                <motion.div 
                  variants={cardVariants} 
                  initial="hidden" 
                  animate="visible" 
                  transition={{ delay: 0.2 }} 
                  className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                   {renderOutputCard(
                       "Text Questions",
                       <FileText className="w-8 h-8 text-blue-400 shrink-0" />,
                       task?.textQuestions,
                       isGenerating && task.status !== 'converting_json' && task.status !== 'completed',
                       task?.status === 'extracting' ? 'Extracting text...' : 'Generating questions...',
                       showTextRetry
                   )}

                   {renderOutputCard(
                       "JSON Questions",
                       <FileJson className="w-8 h-8 text-green-400 shrink-0" />,
                       task?.jsonQuestions,
                       isGenerating && task.status === 'converting_json',
                       'Converting to JSON...',
                       showJsonRetry
                   )}
                </motion.div>
            </div>
        </TabsContent>
        
        <TabsContent value="prompts" className="mt-8">
             <motion.div variants={cardVariants} initial="hidden" animate="visible" className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="relative group glass-card p-6 rounded-3xl flex flex-col justify-between">
                       <div className="flex items-center justify-between">
                           <div className="flex items-start gap-4">
                               <FileText className="w-8 h-8 text-blue-400 shrink-0" />
                               <div>
                                   <h3 className="text-lg font-semibold text-white break-words">Question Generation Prompt</h3>
                               </div>
                           </div>
                           <TooltipProvider>
                               <div className="flex items-center gap-2">
                                   {isEditingPrompts.gen ? (
                                       <Tooltip>
                                           <TooltipTrigger asChild>
                                               <Button onClick={handleSaveGenPrompt} size="icon" variant="ghost" className="h-9 w-9 rounded-full">
                                                   <Check className="h-5 w-5 text-green-400" />
                                               </Button>
                                           </TooltipTrigger>
                                           <TooltipContent><p>Save</p></TooltipContent>
                                       </Tooltip>
                                   ) : (
                                        <Tooltip>
                                           <TooltipTrigger asChild>
                                               <Button onClick={() => setIsEditingPrompts(p => ({...p, gen: true}))} size="icon" variant="ghost" className="h-9 w-9 rounded-full">
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
                           value={generationPrompt}
                           onChange={(e) => setGenerationPrompt(e.target.value)}
                           readOnly={!isEditingPrompts.gen}
                           className="mt-4 bg-slate-800/60 border-slate-700 rounded-xl w-full p-3 text-sm text-slate-200 no-scrollbar resize-none h-96 font-code"
                       />
                   </div>
                    <div className="relative group glass-card p-6 rounded-3xl flex flex-col justify-between">
                       <div className="flex items-center justify-between">
                           <div className="flex items-start gap-4">
                               <FileJson className="w-8 h-8 text-green-400 shrink-0" />
                               <div>
                                   <h3 className="text-lg font-semibold text-white break-words">Text-to-JSON Conversion Prompt</h3>
                               </div>
                           </div>
                           <TooltipProvider>
                                <div className="flex items-center gap-2">
                                   {isEditingPrompts.json ? (
                                       <Tooltip>
                                           <TooltipTrigger asChild>
                                                <Button onClick={handleSaveJsonPrompt} size="icon" variant="ghost" className="h-9 w-9 rounded-full">
                                                   <Check className="h-5 w-5 text-green-400" />
                                                </Button>
                                           </TooltipTrigger>
                                           <TooltipContent><p>Save</p></TooltipContent>
                                       </Tooltip>
                                   ) : (
                                        <Tooltip>
                                           <TooltipTrigger asChild>
                                                <Button onClick={() => setIsEditingPrompts(p => ({...p, json: true}))} size="icon" variant="ghost" className="h-9 w-9 rounded-full">
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
                           value={jsonPrompt}
                           onChange={(e) => setJsonPrompt(e.target.value)}
                           readOnly={!isEditingPrompts.json}
                           className="mt-4 bg-slate-800/60 border-slate-700 rounded-xl w-full p-3 text-sm text-slate-200 no-scrollbar resize-none h-96 font-code"
                       />
                   </div>
                </div>
            </motion.div>
        </TabsContent>

        <TabsContent value="saved" className="mt-8">
             <motion.div variants={cardVariants} initial="hidden" animate="visible" className="max-w-6xl mx-auto">
                {loadingSavedQuestions ? (
                    <div className="text-center py-16"><Loader2 className="mx-auto h-12 w-12 text-slate-500 animate-spin" /></div>
                ) : savedQuestions && savedQuestions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {savedQuestions.map(set => (
                            <Link key={set.id} href={`/questions-creator/${set.id}`} className="relative group glass-card p-6 rounded-3xl hover:bg-white/10 transition-colors cursor-pointer flex flex-col">
                                <div className="flex justify-between items-start">
                                    <Folder className="w-8 h-8 text-yellow-400 shrink-0" />
                                    {isAdmin && (
                                    <div className="flex gap-1">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity active:scale-95"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setItemToDelete(set);
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4 text-red-400"/>
                                        </Button>
                                    </div>
                                    )}
                                </div>
                                <h3 className="text-lg font-semibold text-white break-words mt-4">{set.fileName}</h3>
                            </Link>
                        ))}
                    </div>
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

      <AlertDialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved generated questions. If you continue, these changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
                <Button variant="outline" className="rounded-xl">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
                <Button onClick={handleConfirmContinue} className="rounded-xl bg-blue-600 hover:bg-blue-700">Continue</Button>
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

      <Dialog open={!!previewContent} onOpenChange={(isOpen) => {if (!isOpen) {setPreviewContent(null); setIsPreviewEditing(false);}}}>
        <DialogContent className="max-w-3xl w-[90vw] h-[80vh] flex flex-col glass-card rounded-3xl p-0 no-scrollbar" hideCloseButton={true}>
          <DialogHeader className='p-6 pb-2 flex-row flex-none justify-between items-center'>
            <DialogTitle className="flex items-center gap-3">
            </DialogTitle>
             <div className="flex items-center gap-1">
                 <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full active:scale-95" onClick={() => { if(isPreviewEditing) handlePreviewSave(); setIsPreviewEditing(!isPreviewEditing); }}>
                    {isPreviewEditing ? <Check className="h-4 w-4 text-green-500" /> : <Pencil className="h-4 w-4" />}
                </Button>
                <DialogClose asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full active:scale-95">
                        <X className="h-4 w-4" />
                    </Button>
                </DialogClose>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-6 pt-0 no-scrollbar">
            {isPreviewEditing ? (
                <textarea
                    value={previewContent?.content || ''}
                    onChange={(e) => setPreviewContent(prev => prev ? {...prev, content: e.target.value} : null)}
                    className="text-sm text-slate-300 bg-transparent p-0 whitespace-pre-wrap font-code w-full h-full overflow-auto no-scrollbar outline-none resize-none"
                />
            ) : (
                <pre className="text-sm text-slate-300 whitespace-pre-wrap font-code w-full min-h-full break-words">
                    {previewContent?.content}
                </pre>
            )}
          </div>
        </DialogContent>
      </Dialog>
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
