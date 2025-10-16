
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud, FileText, FileJson, Save, Wand2, Loader2, AlertCircle, Copy, Download, Trash2, Pencil, Check, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { generateQuestions, convertQuestionsToJson } from '@/ai/flows/question-gen-flow';
import { contentService } from '@/lib/contentService';
import { type PDFDocumentProxy } from 'pdfjs-dist';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDebounce } from 'use-debounce';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { jsPDF } from 'jspdf';
import { Packer } from 'docx';
import { Document, Paragraph, TextRun } from 'docx';


type SavedQuestionSet = {
  id: string;
  fileName: string;
  textQuestions: string;
  jsonQuestions: string;
  createdAt: string;
};

export default function QuestionsCreatorPage() {
  const [generationPrompt, setGenerationPrompt] = useState('');
  const [jsonPrompt, setJsonPrompt] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [textQuestions, setTextQuestions] = useState<string | null>(null);
  const [jsonQuestions, setJsonQuestions] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedQuestions, setSavedQuestions] = useState<SavedQuestionSet[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [previewContent, setPreviewContent] = useState<{title: string, content: string} | null>(null);


  const [debouncedGenPrompt] = useDebounce(generationPrompt, 500);
  const [debouncedJsonPrompt] = useDebounce(jsonPrompt, 500);

  const { toast } = useToast();

  // Load prompts and saved questions from localStorage on mount
  useEffect(() => {
    setGenerationPrompt(localStorage.getItem('questionGenPrompt') || 'Generate 10 multiple-choice questions based on the following text. The questions should cover the main topics and details of the provided content.');
    setJsonPrompt(localStorage.getItem('questionJsonPrompt') || 'Convert the following text containing multiple-choice questions into a JSON array. Each object in the array should represent a single question and have the following structure: { "question": "The question text", "options": ["Option A", "Option B", "Option C", "Option D"], "answer": "The correct option text" }. Ensure the output is only the JSON array.');
    const storedQuestions = localStorage.getItem('savedQuestionSets');
    if (storedQuestions) {
      setSavedQuestions(JSON.parse(storedQuestions));
    }
  }, []);

  // Save prompts to localStorage on change
  useEffect(() => {
    if (debouncedGenPrompt) localStorage.setItem('questionGenPrompt', debouncedGenPrompt);
  }, [debouncedGenPrompt]);

  useEffect(() => {
    if (debouncedJsonPrompt) localStorage.setItem('questionJsonPrompt', debouncedJsonPrompt);
  }, [debouncedJsonPrompt]);

  // Save question sets to localStorage
  useEffect(() => {
    localStorage.setItem('savedQuestionSets', JSON.stringify(savedQuestions));
  }, [savedQuestions]);

  const handleSaveCurrentQuestions = () => {
    if (!textQuestions || !jsonQuestions || !fileName) {
      toast({
        variant: 'destructive',
        title: 'Cannot Save',
        description: 'You must generate questions before saving.',
      });
      return;
    }
    const newSet: SavedQuestionSet = {
      id: `qs-${Date.now()}`,
      fileName,
      textQuestions,
      jsonQuestions,
      createdAt: new Date().toISOString(),
    };
    setSavedQuestions(prev => [newSet, ...prev]);
    toast({
      title: 'Questions Saved',
      description: `The questions for "${fileName}" have been saved.`,
    });
  };

  const processFile = async (file: File) => {
    setFileName(file.name);
    setTextQuestions(null);
    setJsonQuestions(null);
    setError(null);
    setIsGenerating(true);

    try {
      let documentText = '';
      if (file.type === 'application/pdf') {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
        const fileBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument(fileBuffer).promise as PDFDocumentProxy;
        documentText = await contentService.extractTextFromPdf(pdf);
      } else {
        documentText = await file.text();
      }

      if (!documentText) throw new Error('Could not extract text from the file.');
      
      const generatedText = await generateQuestions({ prompt: generationPrompt, documentContent: documentText });
      setTextQuestions(generatedText);
      setIsGenerating(false);
      
      setIsConverting(true);
      const generatedJson = await convertQuestionsToJson({ prompt: jsonPrompt, questionsText: generatedText });
      setJsonQuestions(generatedJson);

    } catch (err: any) {
      console.error("Error during question generation process:", err);
      setError(err.message || 'An unexpected error occurred.');
      setIsGenerating(false);
    } finally {
      setIsConverting(false);
    }
  };

  const handleCopy = (content: string | null, type: string) => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    toast({ title: 'Copied to Clipboard', description: `${type} questions have been copied.` });
  };
  
  const handleDownload = (content: string | null, format: 'txt' | 'pdf' | 'docx' | 'json') => {
    if (!content) return;

    let blob: Blob;
    let fileExtension = format;

    if (format === 'pdf') {
        const doc = new jsPDF();
        doc.text(content, 10, 10);
        doc.save('questions.pdf');
        return;
    }

    if (format === 'docx') {
        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({
                        children: [new TextRun(content)],
                    }),
                ],
            }],
        });

        Packer.toBlob(doc).then(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'questions.docx';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
        return;
    }
    
    // Default to txt or json
    blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/plain' });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `questions.${fileExtension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(false); };
  
  const handleStartEdit = (set: SavedQuestionSet) => {
    setEditingId(set.id);
    setEditingName(set.fileName);
  };

  const handleSaveEdit = (id: string) => {
    setSavedQuestions(prev => prev.map(s => s.id === id ? { ...s, fileName: editingName } : s));
    setEditingId(null);
  };

  const handleDeleteSet = (id: string) => {
    setSavedQuestions(prev => prev.filter(s => s.id !== id));
    toast({ title: 'Set Deleted', description: 'The question set has been removed.' });
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const hasGeneratedContent = textQuestions || jsonQuestions;

  const renderOutputCard = (title: string, icon: React.ReactNode, content: string | null, isLoading: boolean, loadingText: string, isTextCard: boolean = false) => (
    <Card className="glass-card min-h-[250px] flex flex-col rounded-3xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon}
            <span className="ml-0">{title}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setPreviewContent({title, content: content || ""})} disabled={!content}><Eye className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleCopy(content, title)} disabled={!content}><Copy className="h-4 w-4" /></Button>
            {isTextCard ? (
                 <Popover>
                    <PopoverTrigger asChild>
                         <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" disabled={!content}><Download className="h-4 w-4" /></Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-40 p-2">
                        <div className="space-y-1">
                             <Button variant="ghost" className="w-full justify-start rounded-lg" onClick={() => handleDownload(content, 'txt')}>TXT</Button>
                             <Button variant="ghost" className="w-full justify-start rounded-lg" onClick={() => handleDownload(content, 'pdf')}>PDF</Button>
                             <Button variant="ghost" className="w-full justify-start rounded-lg" onClick={() => handleDownload(content, 'docx')}>DOCX</Button>
                        </div>
                    </PopoverContent>
                </Popover>
            ) : (
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleDownload(content, 'json')} disabled={!content}><Download className="h-4 w-4" /></Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex">
        {isLoading ? (
            <div className="flex items-center justify-center w-full">
                <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
                <p className="ml-3 text-slate-300">{loadingText}</p>
            </div>
        ) : (
            <pre className="text-sm text-slate-300 bg-slate-900/50 p-4 rounded-2xl whitespace-pre-wrap font-code w-full h-96 overflow-auto">
                {content || 'Generated content will appear here...'}
            </pre>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-2">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-teal-300 text-transparent bg-clip-text">
          Questions Creator
        </h1>
      </div>

      <Tabs defaultValue="generate" className="w-full mt-8">
        <TabsList className="grid w-full max-w-lg mx-auto grid-cols-3 bg-slate-800/50 rounded-2xl p-1.5">
          <TabsTrigger value="generate" className="rounded-xl">Generate</TabsTrigger>
          <TabsTrigger value="prompts" className="rounded-xl">Prompts</TabsTrigger>
          <TabsTrigger value="saved" className="rounded-xl">Saved Questions</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="mt-8">
            <div className="space-y-8">
                {/* Top Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <motion.div variants={cardVariants} initial="hidden" animate="visible">
                        <Card className="glass-card rounded-3xl h-full">
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
                                    "relative border-2 border-dashed border-slate-600 rounded-2xl p-8 text-center cursor-pointer transition-colors duration-300 h-full flex flex-col justify-center",
                                    isDragging ? "border-blue-500 bg-blue-900/20" : "hover:border-slate-500 hover:bg-slate-800/20",
                                    (isGenerating || isConverting) && "pointer-events-none opacity-60"
                                )}
                                >
                                <input type="file" id="file-upload" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} accept=".pdf,.docx,.txt,.pptx" disabled={isGenerating || isConverting} />
                                <div className="flex flex-col items-center justify-center text-slate-400">
                                    <UploadCloud className="h-12 w-12 mb-4" />
                                    <p className="font-semibold">{fileName ? `File: ${fileName}` : 'Drag & drop a file or click to upload'}</p>
                                    <p className="text-xs mt-1">PDF, DOCX, TXT, PPTX</p>
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
                    <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.2 }}>
                         <Card className={cn("glass-card rounded-3xl h-full flex flex-col", !hasGeneratedContent && "opacity-50 pointer-events-none")}>
                            <CardHeader>
                                <CardTitle className='flex items-center gap-3'><Save className='text-green-400'/>2. Save Results</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col justify-end">
                                <Button onClick={handleSaveCurrentQuestions} className="w-full rounded-2xl active:scale-95 transition-transform" disabled={!hasGeneratedContent}>
                                    <Save className="mr-2 h-4 w-4" /> Save Current Questions
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
                {/* Bottom Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.4 }}>
                        {renderOutputCard("Text Questions", <FileText className="text-blue-400" />, textQuestions, isGenerating, "Generating questions...", true)}
                    </motion.div>
                    <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.6 }}>
                        {renderOutputCard("JSON Questions", <FileJson className="text-green-400" />, jsonQuestions, isConverting, "Converting to JSON...", false)}
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
            <motion.div variants={cardVariants} initial="hidden" animate="visible" className="max-w-4xl mx-auto">
                 <Card className="glass-card rounded-3xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3"><Save className="text-green-400" />Saved Question Sets</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {savedQuestions.length > 0 ? (
                            <div className="space-y-4">
                                {savedQuestions.map(set => (
                                    <div key={set.id} className="bg-slate-800/50 p-4 rounded-2xl">
                                        <div className="flex items-center justify-between">
                                            {editingId === set.id ? (
                                                <input
                                                    type="text"
                                                    value={editingName}
                                                    onChange={(e) => setEditingName(e.target.value)}
                                                    className="bg-slate-700 text-white rounded-md px-2 py-1 text-lg font-semibold"
                                                    autoFocus
                                                />
                                            ) : (
                                                <h3 className="text-lg font-semibold text-white">{set.fileName}</h3>
                                            )}
                                            <div className="flex items-center gap-1">
                                                {editingId === set.id ? (
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleSaveEdit(set.id)}><Check className="h-4 w-4 text-green-400"/></Button>
                                                ) : (
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleStartEdit(set)}><Pencil className="h-4 w-4"/></Button>
                                                )}
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleDeleteSet(set.id)}><Trash2 className="h-4 w-4 text-red-400"/></Button>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">{new Date(set.createdAt).toLocaleString()}</p>
                                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {renderOutputCard("Text", <FileText className="text-blue-400" />, set.textQuestions, false, "", true)}
                                            {renderOutputCard("JSON", <FileJson className="text-green-400" />, set.jsonQuestions, false, "", false)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-slate-400 py-8">No question sets saved yet.</p>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </TabsContent>
      </Tabs>
      <Dialog open={!!previewContent} onOpenChange={(isOpen) => !isOpen && setPreviewContent(null)}>
        <DialogContent className="max-w-3xl w-[90vw] h-[80vh] flex flex-col glass-card rounded-3xl">
          <DialogHeader>
            <DialogTitle>{previewContent?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto -mx-6 -mb-6 px-6 pb-6">
            <pre className="text-sm text-slate-300 bg-slate-900/50 p-4 rounded-2xl whitespace-pre-wrap font-code w-full h-full">
                {previewContent?.content}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
