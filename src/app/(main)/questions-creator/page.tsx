
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud, FileText, FileJson, Save, Wand2, Loader2, AlertCircle, Copy, Download, Trash2, Pencil, Check, Eye, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { generateQuestions, convertQuestionsToJson } from '@/ai/flows/question-gen-flow';
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


type SavedQuestionSet = {
  id: string;
  fileName: string;
  textQuestions: string;
  jsonQuestions: string;
  createdAt: string;
};

type EditingState = {
  text: boolean;
  json: boolean;
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
  const [previewContent, setPreviewContent] = useState<{title: string, content: string, type: 'text' | 'json', setId?: string} | null>(null);
  const [isPreviewEditing, setIsPreviewEditing] = useState(false);

  const [editingContent, setEditingContent] = useState<{ text: string | null, json: string | null }>({
    text: null,
    json: null,
  });
  
  const [isEditing, setIsEditing] = useState<EditingState>({
    text: false,
    json: false,
  });

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
    setIsConverting(false);

    try {
        if (file.type !== 'application/pdf') {
            throw new Error(`Unsupported file type: ${file.type}. Please upload a PDF file.`);
        }

        const pdfjs = await import('pdfjs-dist');
        const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.entry');
        pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

        const fileBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument(fileBuffer).promise as PDFDocumentProxy;
        
        const documentText = await contentService.extractTextFromPdf(pdf);

        const imageUris: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const operatorList = await page.getOperatorList();
            
            const imagePromises = operatorList.fnArray.reduce((acc: Promise<string | null>[], fn, j) => {
                if (fn === pdfjs.OPS.paintImageXObject) {
                    const imageName = operatorList.argsArray[j][0];
                    const promise = new Promise<string | null>((resolve) => {
                        page.objs.get(imageName, (img: any) => {
                            if (!img || !img.data) {
                                resolve(null);
                                return;
                            }
                            
                            const canvas = document.createElement('canvas');
                            canvas.width = img.width;
                            canvas.height = img.height;
                            const ctx = canvas.getContext('2d');
                            if (!ctx) {
                                resolve(null);
                                return;
                            }

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
                            resolve(canvas.toDataURL('image/png'));
                        });
                    });
                    acc.push(promise);
                }
                return acc;
            }, []);

            const pageImages = await Promise.all(imagePromises);
            pageImages.forEach(uri => {
                if (uri) imageUris.push(uri);
            });
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
            toast({
                variant: 'destructive',
                title: 'JSON Conversion Failed',
                description: jsonErr.message || "Could not convert text to JSON. The AI returned an invalid format."
            });
            // Keep text questions, but show JSON failed by setting it to an error message.
            setJsonQuestions(`{ "error": "JSON conversion failed", "message": "${jsonErr.message.replace(/"/g, '\\"')}" }`);
        }

    } catch (err: any) {
        console.error("Error during question generation process:", err);
        setError(err.message || 'An unexpected error occurred.');
    } finally {
        setIsGenerating(false);
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
        const doc = new DocxDocument({
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
  
  const handleStartEditName = (set: SavedQuestionSet) => {
    setEditingId(set.id);
    setEditingName(set.fileName);
  };

  const handleSaveEditName = (id: string) => {
    setSavedQuestions(prev => prev.map(s => s.id === id ? { ...s, fileName: editingName } : s));
    setEditingId(null);
  };

  const handleDeleteSet = (id: string) => {
    setSavedQuestions(prev => prev.filter(s => s.id !== id));
    toast({ title: 'Set Deleted', description: 'The question set has been removed.' });
  };
  
  const handleContentChange = (type: 'text' | 'json', value: string) => {
    setEditingContent(prev => ({ ...prev, [type]: value }));
  };

  const handleSaveEdit = (type: 'text' | 'json', setId?: string) => {
    const isSavedSet = !!setId;
    const contentToSave = editingContent[type];

    if (contentToSave === null) return;

    if (isSavedSet) {
      setSavedQuestions(prev =>
        prev.map(s => {
          if (s.id === setId) {
            return {
              ...s,
              textQuestions: type === 'text' ? contentToSave : s.textQuestions,
              jsonQuestions: type === 'json' ? contentToSave : s.jsonQuestions,
            };
          }
          return s;
        })
      );
    } else {
      if (type === 'text') {
        setTextQuestions(contentToSave);
      } else {
        setJsonQuestions(contentToSave);
      }
    }
    
    setIsEditing(prev => ({ ...prev, [type]: false }));
    setEditingId(null);
  };

  const handleToggleEdit = (type: 'text' | 'json', isSavedSet = false, setId?: string) => {
    const isThisCardEditing = isEditing[type] && (isSavedSet ? editingId === setId : !editingId);
  
    if (isThisCardEditing) {
      // Save changes
      handleSaveEdit(type, setId);
    } else {
      // Enter edit mode
      const currentText = isSavedSet ? savedQuestions.find(s => s.id === setId)?.textQuestions : textQuestions;
      const currentJson = isSavedSet ? savedQuestions.find(s => s.id === setId)?.jsonQuestions : jsonQuestions;
      setEditingContent({
        text: currentText ?? null,
        json: currentJson ?? null,
      });
      setEditingId(isSavedSet ? setId : null);
      setIsEditing({ text: false, json: false, [type]: true }); // Only one type can be edited at a time
    }
  };

  const handlePreviewSave = () => {
    if (!previewContent) return;
    const { type, content, setId } = previewContent;
    
    if (setId) {
        setSavedQuestions(prev => prev.map(s => s.id === setId ? {...s, [type === 'text' ? 'textQuestions' : 'jsonQuestions']: content} : s));
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

  const renderOutputCard = (title: string, icon: React.ReactNode, content: string | null, isLoading: boolean, loadingText: string, type: 'text' | 'json', isSavedSet = false, setId?: string) => {
    const isThisCardEditing = isEditing[type] && (isSavedSet ? editingId === setId : !editingId);
    const contentForDisplay = isThisCardEditing ? editingContent[type] : content;

    return (
        <Card className="glass-card min-h-[250px] flex flex-col rounded-3xl">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {icon}
                    <span className="ml-0">{title}</span>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setPreviewContent({title, content: content || "", type, setId})} disabled={!content}><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleCopy(content, title)} disabled={!content}><Copy className="h-4 w-4" /></Button>
                    
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleToggleEdit(type, isSavedSet, setId)} disabled={isLoading || !content}>
                        {isThisCardEditing ? <Check className="h-4 w-4 text-green-400" /> : <Pencil className="h-4 w-4" />}
                    </Button>

                    {type === 'text' ? (
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
                ) : isThisCardEditing ? (
                    <Textarea
                        value={contentForDisplay || ''}
                        onChange={(e) => handleContentChange(type, e.target.value)}
                        className="text-sm text-slate-300 bg-slate-900/50 p-4 rounded-2xl whitespace-pre-wrap font-code w-full h-96 overflow-auto border-blue-500 ring-2 ring-blue-500 no-scrollbar"
                    />
                ) : (
                    <pre className="text-sm text-slate-300 bg-slate-900/50 p-4 rounded-2xl whitespace-pre-wrap font-code w-full h-96 overflow-auto no-scrollbar">
                        {content || 'Generated content will appear here...'}
                    </pre>
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

      <Tabs defaultValue="generate" className="w-full mt-4">
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
                                    "relative border-2 border-dashed border-slate-600 rounded-2xl p-8 text-center cursor-pointer transition-colors duration-300 h-full flex flex-col justify-center",
                                    isDragging ? "border-blue-500 bg-blue-900/20" : "hover:border-slate-500 hover:bg-slate-800/20",
                                    (isGenerating || isConverting) && "pointer-events-none opacity-60"
                                )}
                                >
                                <input type="file" id="file-upload" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} accept=".pdf" disabled={isGenerating || isConverting} />
                                <div className="flex flex-col items-center justify-center text-slate-400">
                                    <UploadCloud className="h-12 w-12 mb-4" />
                                    <p className="font-semibold">{fileName ? `File: ${fileName}` : 'Drag & drop a file or click to upload'}</p>
                                    <p className="text-xs mt-1">PDF only</p>
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
                             <CardContent className="flex-1 flex flex-col justify-end">
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
                                            {editingId === set.id && !isEditing.text && !isEditing.json ? (
                                                <input
                                                    type="text"
                                                    value={editingName}
                                                    onChange={(e) => setEditingName(e.target.value)}
                                                    onBlur={() => handleSaveEditName(set.id)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEditName(set.id)}
                                                    className="bg-slate-900/70 text-white text-lg font-semibold border-none focus:ring-1 focus:ring-blue-500 rounded-md w-full outline-none px-2 py-1"
                                                    autoFocus
                                                />
                                            ) : (
                                                <h3 className="text-lg font-semibold text-white px-2 py-1">{set.fileName}</h3>
                                            )}
                                            <div className="flex items-center gap-1">
                                                {editingId === set.id && !isEditing.text && !isEditing.json ? (
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleSaveEditName(set.id)}><Check className="h-4 w-4 text-green-400"/></Button>
                                                ) : (
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleStartEditName(set)}><Pencil className="h-4 w-4"/></Button>
                                                )}
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleDeleteSet(set.id)}><Trash2 className="h-4 w-4 text-red-400"/></Button>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1 px-2">{new Date(set.createdAt).toLocaleString()}</p>
                                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {renderOutputCard("Text", <FileText className="text-blue-400" />, set.textQuestions, false, "", 'text', true, set.id)}
                                            {renderOutputCard("JSON", <FileJson className="text-green-400" />, set.jsonQuestions, false, "", 'json', true, set.id)}
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
      <Dialog open={!!previewContent} onOpenChange={(isOpen) => {if (!isOpen) {setPreviewContent(null); setIsPreviewEditing(false);}}}>
        <DialogContent className="max-w-3xl w-[90vw] h-[80vh] flex flex-col glass-card rounded-3xl p-0">
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
                    className="text-sm text-slate-300 bg-slate-900/50 p-4 rounded-2xl whitespace-pre-wrap font-code w-full h-full overflow-auto border-blue-500 ring-2 ring-blue-500"
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
