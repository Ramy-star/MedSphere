
'use client';

import { useState, useEffect, useMemo, use } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, FileJson, Save, Loader2, Copy, Download, Pencil, Check, Eye, X, Wrench, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { repairJson } from '@/ai/flows/question-gen-flow';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { jsPDF } from 'jspdf';
import { Packer, Document as DocxDocument, Paragraph, TextRun } from 'docx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { notFound, useRouter } from 'next/navigation';
import { useDoc, useCollection } from '@/firebase/firestore/use-doc';
import { useUser } from '@/firebase/auth/use-user';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import { Input } from '@/components/ui/input';


type SavedQuestionSet = {
  id: string;
  fileName: string;
  textQuestions: string;
  jsonQuestions: string;
  createdAt: string;
  userId: string;
};

function SavedQuestionSetPageContent({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useUser();
  const { data: questionSet, loading } = useDoc<SavedQuestionSet>(`users/${user?.uid}/questionSets`, id);

  const [isEditing, setIsEditing] = useState({ text: false, json: false });
  const [editingContent, setEditingContent] = useState({ text: '', json: '' });
  const [isRepairing, setIsRepairing] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<{title: string, content: string, type: 'text' | 'json'} | null>(null);
  const [isPreviewEditing, setIsPreviewEditing] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');


  const { toast } = useToast();

  useEffect(() => {
    if (loading) return;
    if (!questionSet) {
        notFound();
    } else {
        setEditingContent({ text: questionSet.textQuestions, json: questionSet.jsonQuestions });
        setEditingTitle(questionSet.fileName);
    }
  }, [id, questionSet, loading]);

  const updateQuestionSet = async (updatedData: Partial<SavedQuestionSet>) => {
    if (!user?.uid || !id) return;
    const docRef = doc(db, `users/${user.uid}/questionSets`, id);
    await updateDoc(docRef, updatedData);
  };
  
  const handleToggleEdit = async (type: 'text' | 'json') => {
    if (isEditing[type]) {
      // Save
      if (questionSet) {
        const updatedData = {
          [type === 'text' ? 'textQuestions' : 'jsonQuestions']: editingContent[type],
        };
        await updateQuestionSet(updatedData);
        toast({ title: 'Saved', description: `${type === 'text' ? 'Text' : 'JSON'} questions have been updated.` });
      }
    }
    setIsEditing(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const handleRepairJson = async () => {
    if (!questionSet) return;
    setIsRepairing(true);
    try {
        const repaired = await repairJson({
            malformedJson: editingContent.json,
            desiredSchema: localStorage.getItem('questionJsonPrompt') || '',
        });
        
        await updateQuestionSet({ jsonQuestions: repaired });
        setEditingContent(prev => ({...prev, json: repaired}));
        setJsonError(null);
        toast({
            title: 'JSON Repaired',
            description: 'The JSON structure has been successfully repaired.',
        });
    } catch (err: any) {
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
  
  const handleCopy = (content: string, type: string) => {
    navigator.clipboard.writeText(content);
    toast({ title: 'Copied to Clipboard', description: `${type} questions have been copied.` });
  };
  
  const handleDownload = (content: string, format: 'txt' | 'pdf' | 'docx' | 'json') => {
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
  
  const handlePreviewSave = async () => {
    if (!previewContent || !questionSet) return;
    const { type, content } = previewContent;
    
    const updatedData = {
        [type === 'text' ? 'textQuestions' : 'jsonQuestions']: content,
    };
    await updateQuestionSet(updatedData);
    
    if (type === 'text') setEditingContent(prev => ({...prev, text: content}));
    if (type === 'json') setEditingContent(prev => ({...prev, json: content}));
    
    setIsPreviewEditing(false);
    toast({ title: 'Content Updated' });
  };
  
  const handleTitleSave = async () => {
      if (editingTitle && questionSet && editingTitle !== questionSet.fileName) {
          await updateQuestionSet({ fileName: editingTitle });
          toast({ title: 'Title Updated' });
      }
      setIsEditingTitle(false);
  }


  if (loading || !questionSet) {
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
    );
  }

  const renderOutputCard = (title: string, icon: React.ReactNode, content: string, type: 'text' | 'json') => {
    const isThisCardEditing = isEditing[type];
    const contentForDisplay = isThisCardEditing ? editingContent[type] : content;
    const isJsonCardWithError = type === 'json' && jsonError;

    return (
        <Card className="glass-card min-h-[250px] flex flex-col rounded-3xl">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {icon}
                    <span className="ml-0">{title}</span>
                </div>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setPreviewContent({title, content, type})}><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleCopy(content, title)}><Copy className="h-4 w-4" /></Button>
                    
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleToggleEdit(type)}>
                        {isThisCardEditing ? <Check className="h-4 w-4 text-green-400" /> : <Pencil className="h-4 w-4" />}
                    </Button>

                    {type === 'text' ? (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><Download className="h-4 w-4" /></Button>
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
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleDownload(content, 'json')}><Download className="h-4 w-4" /></Button>
                    )}
                </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col">
                {isThisCardEditing ? (
                    <Textarea
                        value={editingContent[type] || ''}
                        onChange={(e) => setEditingContent(prev => ({...prev, [type]: e.target.value}))}
                        className="text-sm text-slate-300 bg-slate-900/50 p-4 rounded-2xl whitespace-pre-wrap font-code w-full h-96 overflow-auto border-blue-500 ring-2 ring-blue-500 no-scrollbar"
                    />
                ) : (
                    <div className="relative flex-1">
                        <pre className="text-sm text-slate-300 bg-slate-900/50 p-4 rounded-2xl whitespace-pre-wrap font-code w-full h-96 overflow-auto no-scrollbar">
                            {content}
                        </pre>
                    </div>
                )}
                {isJsonCardWithError && !isThisCardEditing && (
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
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-1 flex flex-col p-2 overflow-y-auto no-scrollbar"
    >
        <div className="flex items-center mb-6">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full mr-2" onClick={() => router.back()}>
                <ArrowLeft className="h-5 w-5" />
            </Button>
            {isEditingTitle ? (
                <div className="flex items-center gap-2">
                    <Input 
                        value={editingTitle}
                        onChange={e => setEditingTitle(e.target.value)}
                        className="h-9 text-2xl font-bold bg-transparent border-0 ring-0 focus:ring-0 focus:outline-none p-0 text-white"
                        autoFocus
                        onBlur={handleTitleSave}
                        onKeyDown={e => e.key === 'Enter' && handleTitleSave()}
                    />
                     <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={handleTitleSave}>
                        <Check className="h-5 w-5 text-green-400" />
                    </Button>
                </div>
            ) : (
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-white">{questionSet.fileName}</h1>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => setIsEditingTitle(true)}>
                        <Pencil className="h-5 w-5" />
                    </Button>
                </div>
            )}
        </div>
         <p className="text-sm text-slate-400 mb-6 ml-12 -mt-4">{new Date(questionSet.createdAt).toLocaleString()}</p>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {renderOutputCard("Text Questions", <FileText className="text-blue-400" />, questionSet.textQuestions, 'text')}
            {renderOutputCard("JSON Questions", <FileJson className="text-green-400" />, questionSet.jsonQuestions, 'json')}
        </div>
        
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
    </motion.div>
  );
}


export default function SavedQuestionSetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (!user) {
    // Or a login prompt
    return <div className="text-center p-8">Please log in to view saved questions.</div>
  }
  
  return <SavedQuestionSetPageContent id={id} />;
}
