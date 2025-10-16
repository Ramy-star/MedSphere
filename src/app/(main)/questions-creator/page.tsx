
'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud, FileText, FileJson, Save, Wand2, Loader2, AlertCircle, Copy, Download, Trash2, Pencil, Check, Eye, X, Wrench, Folder } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { generateQuestions, convertQuestionsToJson, repairJson } from '@/ai/flows/question-gen-flow';
import { contentService } from '@/lib/contentService';
import { type PDFDocumentProxy, type PDFPageProxy } from 'pdfjs-dist';
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
import { jsPDF } from 'jspdf';
import { Packer, Document as DocxDocument, Paragraph, TextRun } from 'docx';
import Link from 'next/link';
import { useUser } from '@/firebase/auth/use-user';
import { useCollection } from '@/firebase/firestore/use-collection';
import { addDoc, collection, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { Input } from '@/components/ui/input';
import { useSearchParams } from 'next/navigation';


type SavedQuestionSet = {
  id: string;
  fileName: string;
  textQuestions: string;
  jsonQuestions: string;
  createdAt: string;
  userId: string;
};

function QuestionsCreatorContent() {
  const [generationPrompt, setGenerationPrompt] = useState('');
  const [jsonPrompt, setJsonPrompt] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [textQuestions, setTextQuestions] = useState<string | null>(null);
  const [jsonQuestions, setJsonQuestions] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isRepairing, setIsRepairing] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [previewContent, setPreviewContent] = useState<{title: string, content: string, type: 'text' | 'json', setId?: string} | null>(null);
  const [isPreviewEditing, setIsPreviewEditing] = useState(false);

  const [editingContent, setEditingContent] = useState<{ text: string | null, json: string | null }>({
    text: null,
    json: null,
  });

  const [debouncedGenPrompt] = useDebounce(generationPrompt, 500);
  const [debouncedJsonPrompt] = useDebounce(jsonPrompt, 500);

  const { user } = useUser();
  const { data: savedQuestions, loading: loadingSavedQuestions } = useCollection<SavedQuestionSet>(
    user ? `users/${user.uid}/questionSets` : '',
    { orderBy: ['createdAt', 'desc'], disabled: !user }
  );
  
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'generate';

  const { toast } = useToast();

  // Load prompts from localStorage on mount
  useEffect(() => {
    setGenerationPrompt(localStorage.getItem('questionGenPrompt') || 'Generate 10 multiple-choice questions based on the following text. The questions should cover the main topics and details of the provided content.');
    setJsonPrompt(localStorage.getItem('questionJsonPrompt') || 'Convert the following text containing multiple-choice questions into a JSON array. Each object in the array should represent a single question and have the following structure: { "question": "The question text", "options": ["Option A", "Option B", "Option C", "Option D"], "answer": "The correct option text" }. Ensure the output is only the JSON array.');
  }, []);

  // Save prompts to localStorage on change
  useEffect(() => {
    if (debouncedGenPrompt) localStorage.setItem('questionGenPrompt', debouncedGenPrompt);
  }, [debouncedGenPrompt]);

  useEffect(() => {
    if (debouncedJsonPrompt) localStorage.setItem('questionJsonPrompt', debouncedJsonPrompt);
  }, [debouncedJsonPrompt]);


  const handleSaveCurrentQuestions = async () => {
    if (!textQuestions || !jsonQuestions || !fileName || !user) {
      toast({
        variant: 'destructive',
        title: 'Cannot Save',
        description: 'You must be logged in and have generated questions before saving.',
      });
      return;
    }

    try {
      const collectionRef = collection(db, `users/${user.uid}/questionSets`);
      await addDoc(collectionRef, {
          fileName,
          textQuestions,
          jsonQuestions,
          createdAt: new Date().toISOString(),
          userId: user.uid,
      });

      toast({
        title: 'Questions Saved',
        description: `The questions for "${fileName}" have been saved to your account.`,
      });
    } catch(err) {
       console.error("Error saving question set:", err);
       toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'Could not save the question set to the cloud.',
      });
    }
  };

  const processFile = async (file: File) => {
    setFileName(file.name);
    setTextQuestions(null);
    setJsonQuestions(null);
    setError(null);
    setJsonError(null);
    setIsGenerating(true);
    setIsConverting(false);

    try {
        let documentText = '';
        let imageUris: string[] = [];

        if (file.type === 'application/pdf') {
            const pdfjs = await import('pdfjs-dist');
            const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.entry');
            pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

            const fileBuffer = await file.arrayBuffer();
            const pdf = await pdfjs.getDocument(fileBuffer).promise as PDFDocumentProxy;
            
            documentText = await contentService.extractTextFromPdf(pdf);

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const operatorList = await page.getOperatorList();
                
                for (const j in operatorList.fnArray) {
                  if (operatorList.fnArray[j] === pdfjs.OPS.paintImageXObject) {
                    try {
                      const imageName = operatorList.argsArray[j as any][0];
                      const img = page.objs.get(imageName);
    
                      if (!img || !img.data) continue;
    
                      const canvas = document.createElement('canvas');
                      canvas.width = img.width;
                      canvas.height = img.height;
                      const ctx = canvas.getContext('2d');
                      if (!ctx) continue;
    
                      const imageData = ctx.createImageData(img.width, img.height);
                      if (img.kind === pdfjs.ImageKind.GRAYSCALE_1BPP) {
                          let k = 0;
                          for (let i = 0; i < img.data.length; i++) {
                              const b = img.data[i];
                              for (let bit = 0; bit < 8; bit++) {
                                  if (k >= imageData.data.length) break;
                                  const gray = (b & (1 << (7 - bit))) ? 0 : 255;
                                  imageData.data[k++] = gray;
                                  imageData.data[k++] = gray;
                                  imageData.data[k++] = gray;
                                  imageData.data[k++] = 255;
                              }
                          }
                      } else if (img.kind === pdfjs.ImageKind.RGB_24BPP) {
                          let i = 0;
                          for (let j = 0; j < img.data.length; j += 3) {
                              imageData.data[i++] = img.data[j];
                              imageData.data[i++] = img.data[j + 1];
                              imageData.data[i++] = img.data[j + 2];
                              imageData.data[i++] = 255;
                          }
                      } else {
                          imageData.data.set(img.data);
                      }
                      ctx.putImageData(imageData, 0, 0);
                      const uri = canvas.toDataURL('image/png');
                      if (uri) imageUris.push(uri);
                    } catch (err) {
                      console.error("Error processing image object:", err);
                      // Continue to next image instead of failing
                    }
                  }
                }
            }
        } else {
             throw new Error(`Unsupported file type: ${file.type}. Please upload a PDF file.`);
        }

        if (!documentText && imageUris.length === 0) {
            throw new Error('Could not extract any text or images from the file.');
        }

        const generatedText = await generateQuestions({
            prompt: generationPrompt,
            documentContent: documentText,
            images: imageUris
        });
        setTextQuestions(generatedText);
      
        setIsConverting(true);
        setIsGenerating(false);

        try {
            const generatedJson = await convertQuestionsToJson({ prompt: jsonPrompt, questionsText: generatedText });
            setJsonQuestions(generatedJson);
        } catch (jsonErr: any) {
            console.error("Error during JSON conversion:", jsonErr);
            setJsonError(jsonErr.message || "Could not convert text to JSON. The AI returned an invalid format.");
            // Keep text questions, but show JSON failed by setting it to an error message.
            setJsonQuestions(`{ "error": "JSON conversion failed", "message": "${(jsonErr.message || '').replace(/"/g, '\\"')}" }`);
        }

    } catch (err: any) {
        console.error("Error during question generation process:", err);
        setError(err.message || 'An unexpected error occurred.');
    } finally {
        setIsGenerating(false);
        setIsConverting(false);
    }
  };

  const handleRepairJson = async () => {
    if (!jsonQuestions) return;
    setIsRepairing(true);
    try {
        const repaired = await repairJson({
            malformedJson: jsonQuestions,
            desiredSchema: jsonPrompt,
        });
        setJsonQuestions(repaired);
        setJsonError(null);
        toast({
            title: 'JSON Repaired',
            description: 'The JSON structure has been successfully repaired.',
        });
    } catch (err: any) {
        console.error("Error during JSON repair:", err);
        toast({
            variant: 'destructive',
            title: 'Repair Failed',
            description: err.message || 'Could not repair the JSON.',
        });
        setJsonError(err.message || 'Could not repair the JSON.');
    } finally {
        setIsRepairing(false);
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
    } else {
        if (type === 'text') setTextQuestions(content);
        if (type === 'json') setJsonQuestions(content);
    }
    
    setIsPreviewEditing(false);
    toast({ title: 'Content Updated' });
  };
  

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const hasGeneratedContent = textQuestions || jsonQuestions;

  const renderOutputCard = (title: string, icon: React.ReactNode, content: string | null, isLoading: boolean, loadingText: string, type: 'text' | 'json') => {
    const isJsonCardWithError = type === 'json' && jsonError;

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
                    <div className="mt-2">
                        <Button onClick={handleRepairJson} disabled={isRepairing} className='w-full rounded-xl bg-yellow-600/80 hover:bg-yellow-600 text-white'>
                            {isRepairing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wrench className="mr-2 h-4 w-4" />}
                            {isRepairing ? 'Repairing...' : 'Attempt to Repair JSON'}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
  };


  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-2 no-scrollbar">
      <div className="text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-teal-300 text-transparent bg-clip-text">
          Questions Creator
        </h1>
      </div>

      <Tabs defaultValue={initialTab} className="w-full mt-4">
        <TabsList className="grid w-full max-w-lg mx-auto grid-cols-3 bg-slate-800/50 rounded-2xl p-1.5">
          <TabsTrigger value="generate" className="rounded-xl">Generate</TabsTrigger>
          <TabsTrigger value="prompts" className="rounded-xl">Prompts</TabsTrigger>
          <TabsTrigger value="saved" className="rounded-xl">Saved Questions</TabsTrigger>
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
                                    "relative border-2 border-dashed border-slate-600 rounded-2xl p-8 text-center cursor-pointer transition-colors duration-300 h-full flex flex-col justify-center bg-slate-900/40",
                                    isDragging ? "border-blue-500 bg-blue-900/20" : "hover:border-slate-500 hover:bg-slate-800/40",
                                    (isGenerating || isConverting) && "pointer-events-none opacity-60"
                                )}
                                >
                                <input type="file" id="file-upload" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} accept=".pdf" disabled={isGenerating || isConverting} />
                                <div className="flex flex-col items-center justify-center text-slate-400">
                                    <UploadCloud className="h-12 w-12 mb-4" />
                                    <p className="font-semibold">{fileName ? `File: ${fileName}` : 'Drag & drop a file or click to upload'}</p>
                                    <p className="text-xs mt-1">PDF</p>
                                </div>
                                </div>
                                {error && (
                                    <div className="mt-4 flex items-center gap-2 text-red-400 bg-red-900/20 p-3 rounded-lg">
                                        <AlertCircle className="h-5 w-5" />
                                        <p className="text-sm">{error}</p>
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
                             <CardContent className="flex-1 flex flex-col justify-center items-center">
                                <Button onClick={handleSaveCurrentQuestions} className="rounded-full w-auto self-center px-6 active:scale-95 transition-transform">
                                    <Save className="mr-2 h-4 w-4" /> Save Current Questions
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.4 }}>
                        {renderOutputCard("Text Questions", <FileText className="text-blue-400" />, textQuestions, isGenerating, "Generating questions...", 'text')}
                    </motion.div>
                    <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.6 }}>
                        {renderOutputCard("JSON Questions", <FileJson className="text-green-400" />, jsonQuestions, isConverting, "Converting to JSON...", 'json')}
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
                        <Textarea id="gen-prompt" value={generationPrompt} onChange={(e) => setGenerationPrompt(e.target.value)} className="h-32 bg-slate-800/60 border-slate-700 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                        <label htmlFor="json-prompt" className="text-sm font-medium text-slate-300">Text-to-JSON Conversion Prompt</label>
                        <Textarea id="json-prompt" value={jsonPrompt} onChange={(e) => setJsonPrompt(e.target.value)} className="h-32 bg-slate-800/60 border-slate-700 rounded-xl" />
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
                            <Link key={set.id} href={`/questions-creator/${set.id}`} legacyBehavior>
                                <a className="relative group glass-card p-6 rounded-3xl hover:bg-white/10 transition-colors cursor-pointer aspect-w-1 aspect-h-1 flex flex-col justify-between">
                                    <div>
                                        <Folder className="w-10 h-10 text-yellow-400 mb-4" />
                                        {editingId === set.id ? (
                                            <div className="flex items-center gap-2 mt-2">
                                                <Input 
                                                    value={editingName} 
                                                    onChange={e => setEditingName(e.target.value)}
                                                    onClick={e => e.stopPropagation()}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') {
                                                            e.stopPropagation(); e.preventDefault(); handleSaveEditName(set.id);
                                                        }
                                                    }}
                                                    onBlur={() => handleSaveEditName(set.id)}
                                                    className="bg-transparent border-b-2 border-blue-500 h-auto p-0 text-lg font-semibold focus:ring-0"
                                                    autoFocus
                                                />
                                            </div>
                                        ) : (
                                            <h3 className="text-lg font-semibold text-white break-words">{set.fileName}</h3>
                                        )}
                                        <p className="text-xs text-slate-400 mt-1">{new Date(set.createdAt).toLocaleDateString()}</p>
                                    </div>
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
                                </a>
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
        <DialogContent className="max-w-3xl w-[90vw] h-[80vh] flex flex-col glass-card rounded-3xl p-0 no-scrollbar">
          <DialogHeader className='p-6 pb-2 flex-row flex-none justify-between items-center'>
            <DialogTitle>{previewContent?.title}</DialogTitle>
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
                 <Textarea
                    value={previewContent?.content || ''}
                    onChange={(e) => setPreviewContent(prev => prev ? {...prev, content: e.target.value} : null)}
                    className="text-sm text-slate-300 bg-slate-900/50 p-4 rounded-2xl whitespace-pre-wrap font-code w-full h-full overflow-auto border-blue-500 ring-2 ring-blue-500 no-scrollbar"
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

    