'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadCloud, FileText, FileJson, Save, Wand2, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { generateQuestions, convertQuestionsToJson } from '@/ai/flows/question-gen-flow';
import { contentService } from '@/lib/contentService';
import { type PDFDocumentProxy } from 'pdfjs-dist';

export default function QuestionsCreatorPage() {
  const [generationPrompt, setGenerationPrompt] = useState('Generate 10 multiple-choice questions based on the following text. The questions should cover the main topics and details of the provided content.');
  const [jsonPrompt, setJsonPrompt] = useState('Convert the following text containing multiple-choice questions into a JSON array. Each object in the array should represent a single question and have the following structure: { "question": "The question text", "options": ["Option A", "Option B", "Option C", "Option D"], "answer": "The correct option text" }. Ensure the output is only the JSON array.');
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [textQuestions, setTextQuestions] = useState<string | null>(null);
  const [jsonQuestions, setJsonQuestions] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();

  const handleSavePrompts = () => {
    // In a real app, you'd save this to localStorage or a DB
    localStorage.setItem('questionGenPrompt', generationPrompt);
    localStorage.setItem('questionJsonPrompt', jsonPrompt);
    toast({
      title: 'Prompts Saved',
      description: 'Your question generation prompts have been updated.',
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

      if (!documentText) {
        throw new Error('Could not extract text from the file.');
      }
      
      const generatedText = await generateQuestions({
        prompt: generationPrompt,
        documentContent: documentText,
      });

      setTextQuestions(generatedText);
      setIsGenerating(false);
      
      // Automatically start JSON conversion
      setIsConverting(true);
      const generatedJson = await convertQuestionsToJson({
        prompt: jsonPrompt,
        questionsText: generatedText,
      });

      setJsonQuestions(generatedJson);
      setIsConverting(false);

    } catch (err: any) {
      console.error("Error during question generation process:", err);
      setError(err.message || 'An unexpected error occurred.');
      setIsGenerating(false);
      setIsConverting(false);
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-2 pr-4 -mr-2">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-teal-300 text-transparent bg-clip-text">
          Questions Creator
        </h1>
        <p className="text-lg text-slate-400 mt-2 max-w-2xl mx-auto">
          Automate question generation from your lectures and documents with the power of AI.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Column */}
        <div className="space-y-8">
          <motion.div variants={cardVariants} initial="hidden" animate="visible">
            <Card className="glass-card overflow-hidden">
              <CardHeader>
                <CardTitle>Prompt Management</CardTitle>
                <CardDescription>Set the prompts used for question generation and JSON conversion.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="gen-prompt" className="text-sm font-medium text-slate-300">
                    Question Generation Prompt
                  </label>
                  <Textarea
                    id="gen-prompt"
                    value={generationPrompt}
                    onChange={(e) => setGenerationPrompt(e.target.value)}
                    className="h-32 bg-slate-800/50 border-slate-700 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="json-prompt" className="text-sm font-medium text-slate-300">
                    Text-to-JSON Conversion Prompt
                  </label>
                  <Textarea
                    id="json-prompt"
                    value={jsonPrompt}
                    onChange={(e) => setJsonPrompt(e.target.value)}
                    className="h-32 bg-slate-800/50 border-slate-700 rounded-xl"
                  />
                </div>
                <Button onClick={handleSavePrompts} className="w-full rounded-xl active:scale-95 transition-transform">
                  <Save className="mr-2 h-4 w-4" /> Save Prompts
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.2 }}>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Upload Lecture</CardTitle>
                <CardDescription>Upload a lecture file to start generating questions.</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  className={cn(
                    "relative border-2 border-dashed border-slate-600 rounded-xl p-8 text-center cursor-pointer transition-colors duration-300",
                    isDragging ? "border-blue-500 bg-blue-900/20" : "hover:border-slate-500 hover:bg-slate-800/20",
                    (isGenerating || isConverting) && "pointer-events-none opacity-60"
                  )}
                >
                  <input
                    type="file"
                    id="file-upload"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleFileChange}
                    accept=".pdf,.docx,.txt,.pptx"
                    disabled={isGenerating || isConverting}
                  />
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <UploadCloud className="h-12 w-12 mb-4" />
                    <p className="font-semibold">
                      {fileName ? `File: ${fileName}` : 'Drag & drop a file or click to upload'}
                    </p>
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
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.4 }}>
            <Card className="glass-card min-h-[250px]">
              <CardHeader>
                <CardTitle className="flex items-center"><FileText className="mr-3 text-blue-400" /> Text Questions</CardTitle>
                <CardDescription>Questions generated by the AI in plain text format.</CardDescription>
              </CardHeader>
              <CardContent>
                {isGenerating ? (
                    <div className="flex items-center justify-center h-24">
                        <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
                        <p className="ml-3 text-slate-300">Generating questions...</p>
                    </div>
                ) : (
                    <pre className="text-sm text-slate-300 bg-slate-800/50 p-4 rounded-xl whitespace-pre-wrap font-code max-h-96 overflow-auto">
                        {textQuestions || 'Generated questions will appear here...'}
                    </pre>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={cardVariants} initial="hidden" animate="visible" transition={{ delay: 0.6 }}>
            <Card className="glass-card min-h-[250px]">
              <CardHeader>
                <CardTitle className="flex items-center"><FileJson className="mr-3 text-green-400" /> JSON Questions</CardTitle>
                <CardDescription>Questions automatically converted to structured JSON.</CardDescription>
              </CardHeader>
              <CardContent>
                {isConverting ? (
                    <div className="flex items-center justify-center h-24">
                        <Loader2 className="h-8 w-8 text-green-400 animate-spin" />
                        <p className="ml-3 text-slate-300">Converting to JSON...</p>
                    </div>
                 ) : (
                    <pre className="text-sm text-slate-300 bg-slate-800/50 p-4 rounded-xl whitespace-pre-wrap font-code max-h-96 overflow-auto">
                        {jsonQuestions || 'JSON output will appear here...'}
                    </pre>
                 )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
