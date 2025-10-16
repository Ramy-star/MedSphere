
'use client';

import { useState, useEffect, useMemo, Suspense, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud, FileText, FileJson, Save, Wand2, Loader2, AlertCircle, Copy, Download, Trash2, Pencil, Check, Eye, X, Wrench, Folder, DownloadCloud } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { generateQuestions, convertQuestionsToJson, repairJson } from '@/ai/flows/question-gen-flow';
import { contentService } from '@/lib/contentService';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDebounce } from 'use-debounce';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import Link from 'next/link';
import { useUser } from '@/firebase/auth/use-user';
import { useCollection } from '@/firebase/firestore/use-collection';
import { addDoc, collection, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuestionGenerationStore } from '@/stores/question-gen-store';


type SavedQuestionSet = {
  id: string;
  fileName: string;
  textQuestions: string;
  jsonQuestions: string;
  createdAt: string;
  userId: string;
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
  const [isDragging, setIsDragging] = useState(false);
  const [previewContent, setPreviewContent] = useState<{title: string, content: string, type: 'text' | 'json', setId?: string} | null>(null);
  const [isPreviewEditing, setIsPreviewEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const [debouncedGenPrompt] = useDebounce(generationPrompt, 500);
  const [debouncedJsonPrompt] = useDebounce(jsonPrompt, 500);

  const {
    task,
    startGenerationWithFile,
    saveCurrentResults,
    clearTask,
  } = useQuestionGenerationStore();

  const { user } = useUser();
  const isAdmin = user?.uid === process.env.NEXT_PUBLIC_ADMIN_UID;
  const { data: savedQuestions, loading: loadingSavedQuestions } = useCollection<SavedQuestionSet>(
    user ? `users/${user.uid}/questionSets` : '',
    { orderBy: ['createdAt', 'desc'], disabled: !user }
  );

  const initialTab = 'generate';
  const { toast } = useToast();

  useEffect(() => {
    setGenerationPrompt(localStorage.getItem('questionGenPrompt') || 'Generate 10 multiple-choice questions based on the following text. The questions should cover the main topics and details of the provided content.');
    setJsonPrompt(localStorage.getItem('questionJsonPrompt') || 'Convert the following text containing multiple-choice questions into a JSON array. Each object in the array should represent a single question and have the following structure: { "question": "The question text", "options": ["Option A", "Option B", "Option C", "Option D"], "answer": "The correct option text" }. Ensure the output is only the JSON array.');
  }, []);

  useEffect(() => {
    if (debouncedGenPrompt) localStorage.setItem('questionGenPrompt', debouncedGenPrompt);
  }, [debouncedGenPrompt]);

  useEffect(() => {
    if (debouncedJsonPrompt) localStorage.setItem('questionJsonPrompt', debouncedJsonPrompt);
  }, [debouncedJsonPrompt]);

  useEffect(() => {
    if (task?.status === 'completed') {
      toast({
        title: 'Generation Complete',
        description: `Questions for "${task.fileName}" have been generated.`,
      });
    } else if (task?.status === 'error') {
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: task.error || 'An unexpected error occurred.',
      });
    }
  }, [task?.status, task?.fileName, task?.error, toast]);


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
    toast({
        title: 'Questions Saved',
        description: `The questions for "${task.fileName}" have been saved to your account.`,
    });
  };

  const processFile = async (file: File) => {
    startGenerationWithFile(file, generationPrompt, jsonPrompt);
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
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  
  const handleStartEditName = (set: SavedQuestionSet) => {
    setEditingId(set.id);
    setEditingName(set.fileName);
  };

  const handleSaveEditName = async (id: string) => {
    if (!user) return;
    const docRef = doc(db, `users/${user.uid}/questionSets`, id);
    await updateDoc(docRef, { fileName: editingName });
    setEditingId(null);
  };

  const handleDeleteSet = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!user) return;
    const docRef = doc(db, `users/${user.uid}/questionSets`, id);
    await deleteDoc(docRef);
    toast({ title: 'Set Deleted', description: 'The question set has been removed.' });
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
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const hasGeneratedContent = task?.textQuestions || task?.jsonQuestions;
  const isGenerating = task && task.status !== 'completed' && task.status !== 'error';

  const renderOutputCard = (title: string, icon: React.ReactNode, content: string | null, isLoading: boolean, loadingText: string, type: 'text' | 'json') => {
    const isJsonCardWithError = type === 'json' && task?.status === 'error';

    return (
        <Card className="glass-card min-h-[200px] flex flex-col rounded-3xl">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {icon}
                    <span className="ml-0">{title}</span>
                </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col">
                {isLoading ? (
                    <div className="flex items-center justify-center w-full h-full">
                        <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
                        <p className="ml-3 text-slate-300">{loadingText}</p>
                    </div>
                ) : (
                    <div className="relative flex-1">
                        <pre className="text-sm text-slate-300 bg-slate-900/50 p-4 rounded-2xl whitespace-pre-wrap font-code w-full h-48 overflow-auto no-scrollbar">
                            {content || 'Generated content will appear here...'}
                        </pre>
                    </div>
                )}
                {isJsonCardWithError && (
                    <div className="mt-2 text-red-400 bg-red-900/20 p-3 rounded-lg text-xs">
                        <p>{task?.error}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
  };

  const handleTabChange = (value: string) => {
    if (value !== 'generate') {
      if (task?.status === 'generating_text' || task?.status === 'converting_json') {
        toast({ title: "Still working...", description: "Question generation is running in the background." });
      } else {
        clearTask();
      }
    }
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
        <TabsList className="grid w-full max-w-lg mx-auto grid-cols-3 bg-slate-900/50 border border-white/10 rounded-full p-1 h-12">
            <TabsTrigger value="generate" className="rounded-full">Generate</TabsTrigger>
            <TabsTrigger value="prompts" className="rounded-full">Prompts</TabsTrigger>
            <TabsTrigger value="saved" className="rounded-full">Saved Questions</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="mt-8">
            <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <motion.div variants={cardVariants} initial="hidden" animate="visible" className="h-full">
                        <Card className="glass-card rounded-3xl h-full flex flex-col">
                            <CardHeader>
                                <CardTitle className='flex items-center gap-3'><UploadCloud className='text-blue-400'/>1. Upload Lecture</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onDragEnter={handleDragEnter}
                                onDragLeave={handleDragLeave}
                                className={cn(
                                    "relative border-2 border-dashed border-slate-600 rounded-2xl p-8 text-center cursor-pointer transition-colors duration-300 h-full flex flex-col justify-center bg-slate-800/80",
                                    isDragging ? "border-blue-500 bg-blue-900/20" : "hover:border-slate-500 hover:bg-slate-700/40",
                                    isGenerating && "pointer-events-none opacity-60"
                                )}
                                >
                                <input type="file" id="file-upload" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} accept=".pdf" disabled={isGenerating} />
                                <div className="flex flex-col items-center justify-center text-slate-400">
                                    <UploadCloud className="h-12 w-12 mb-4" />
                                    <p className="font-semibold">{task?.fileName ? `File: ${task.fileName}` : 'Drag & drop a file or click to upload'}</p>
                                    <p className="text-xs mt-1">PDF</p>
                                </div>
                                </div>
                                {task?.status === 'error' && (
                                    <div className="mt-4 flex items-center gap-2 text-red-400 bg-red-900/20 p-3 rounded-lg">
                                        <AlertCircle className="h-5 w-5" />
                                        <p className="text-sm">{task.error}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                    <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.2 }} className="h-full">
                         <Card className={cn("glass-card rounded-3xl flex flex-col h-full", !hasGeneratedContent && "opacity-50 pointer-events-none")}>
                            <CardHeader>
                                <CardTitle className='flex items-center gap-3'><Save className='text-green-400'/>2. Save Results</CardTitle>
                            </CardHeader>
                             <CardContent className="flex-1 flex flex-col justify-end items-center">
                                <Button onClick={handleSaveCurrentQuestions} className="rounded-full w-auto self-center px-6 active:scale-95 transition-transform">
                                    <Save className="mr-2 h-4 w-4" /> Save Current Questions
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.4 }}>
                        {renderOutputCard("Text Questions", <FileText className="text-blue-400" />, task?.textQuestions ?? null, task?.status === 'generating_text', "Generating questions...", 'text')}
                    </motion.div>
                    <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.6 }}>
                        {renderOutputCard("JSON Questions", <FileJson className="text-green-400" />, task?.jsonQuestions ?? null, task?.status === 'converting_json', "Converting to JSON...", 'json')}
                    </motion.div>
                </div>
            </div>
        </TabsContent>
        
        <TabsContent value="prompts" className="mt-8">
            <motion.div variants={cardVariants} initial="hidden" animate="visible" className="max-w-4xl mx-auto">
                 <Card className="glass-card overflow-hidden rounded-3xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3"><Pencil className="text-blue-400" />Prompt Management</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                        <label htmlFor="gen-prompt" className="text-sm font-medium text-slate-300">Question Generation Prompt</label>
                        <textarea id="gen-prompt" value={generationPrompt} onChange={(e) => setGenerationPrompt(e.target.value)} className="h-32 bg-slate-800/60 border-slate-700 rounded-xl w-full p-2 text-sm text-slate-200" />
                        </div>
                        <div className="space-y-2">
                        <label htmlFor="json-prompt" className="text-sm font-medium text-slate-300">Text-to-JSON Conversion Prompt</label>
                        <textarea id="json-prompt" value={jsonPrompt} onChange={(e) => setJsonPrompt(e.target.value)} className="h-32 bg-slate-800/60 border-slate-700 rounded-xl w-full p-2 text-sm text-slate-200" />
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </TabsContent>

        <TabsContent value="saved" className="mt-8">
             <motion.div variants={cardVariants} initial="hidden" animate="visible" className="max-w-6xl mx-auto">
                {loadingSavedQuestions ? (
                    <div className="text-center py-16"><Loader2 className="mx-auto h-12 w-12 text-slate-500 animate-spin" /></div>
                ) : savedQuestions && savedQuestions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {savedQuestions.map(set => (
                            <Link key={set.id} href={`/questions-creator/${set.id}`} className="relative group glass-card p-6 rounded-3xl hover:bg-white/10 transition-colors cursor-pointer aspect-w-1 aspect-h-1 flex flex-col justify-between">
                                <div>
                                    <Folder className="w-10 h-10 text-yellow-400 mb-4" />
                                    <div className="flex items-start gap-2 mt-2">
                                        <h3 className="text-lg font-semibold text-white break-words">{set.fileName}</h3>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">{new Date(set.createdAt).toLocaleDateString()}</p>
                                </div>
                                {isAdmin && (
                                <div className="absolute top-4 right-4 flex gap-1">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => handleDeleteSet(set.id, e)}
                                    >
                                        <Trash2 className="h-4 w-4 text-red-400"/>
                                    </Button>
                                </div>
                                )}
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
      <Dialog open={!!previewContent} onOpenChange={(isOpen) => {if (!isOpen) {setPreviewContent(null); setIsPreviewEditing(false);}}}>
        <DialogContent className="max-w-3xl w-[90vw] h-[80vh] flex flex-col glass-card rounded-3xl p-0 no-scrollbar" hideCloseButton={true}>
          <DialogHeader className='p-6 pb-2 flex-row flex-none justify-between items-center'>
            <DialogTitle className="flex items-center gap-3">
            </DialogTitle>
             <div className="flex items-center gap-1">
                 <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => { if(isPreviewEditing) handlePreviewSave(); setIsPreviewEditing(!isPreviewEditing); }}>
                    {isPreviewEditing ? <Check className="h-4 w-4 text-green-500" /> : <Pencil className="h-4 w-4" />}
                </Button>
                <DialogClose asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
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

    