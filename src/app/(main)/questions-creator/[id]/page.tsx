'use client';

import React, { useState, useEffect, useRef, useMemo, use } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, FileJson, Save, Loader2, Copy, Download, Pencil, Check, Eye, X, Wrench, ArrowLeft, FolderPlus, DownloadCloud, Lightbulb, HelpCircle, FileQuestion, FileCheck, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { reformatMarkdown } from '@/ai/flows/reformat-markdown-flow';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { notFound, useRouter } from 'next/navigation';
import { useDoc } from '@/firebase/firestore/use-doc';
import { updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { FolderSelectorDialog } from '@/components/FolderSelectorDialog';
import { UploadProgress, type UploadingFile } from '@/components/UploadProgress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { contentService, type Content } from '@/lib/contentService';
import { cn } from '@/lib/utils';
import type { Lecture } from '@/lib/types';
import { useAuthStore } from '@/stores/auth-store';
import { FlashcardIcon } from '@/components/icons/FlashcardIcon';
import { InteractiveExamIcon } from '@/components/icons/InteractiveExamIcon';
import { useQuestionGenerationStore } from '@/stores/question-gen-store';


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
};

type EditingContentState = {
    text: string;
    examText: string;
    flashcardText: string;
};

function SavedQuestionSetPageContent({ params }: { params: { id: string } }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const router = useRouter();
  const { studentId, can } = useAuthStore();
  const { convertExistingTextToJson } = useQuestionGenerationStore();

  const { data: questionSet, loading } = useDoc<SavedQuestionSet>(studentId ? `users/${studentId}/questionSets` : '', id, {
    disabled: !id || !studentId
  });

  const [isEditing, setIsEditing] = useState({ text: false, examText: false, flashcardText: false });
  const [editingContent, setEditingContent] = useState<EditingContentState>({ text: '', examText: '', flashcardText: '' });
  const [previewContent, setPreviewContent] = useState<{title: string, content: string, type: keyof EditingContentState} | null>(null);
  const [isPreviewEditing, setIsPreviewEditing] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  const [showFolderSelector, setShowFolderSelector] = useState(false);
  const [copiedStatus, setCopiedStatus] = useState({ text: false, examText: false, flashcardText: false });
  const [currentAction, setCurrentAction] = useState<'create_quiz' | 'create_exam' | 'create_flashcard' | null>(null);
  const [isConverting, setIsConverting] = useState< 'questions' | 'exam' | 'flashcards' | null>(null);
  
  const titleRef = useRef<HTMLHeadingElement>(null);
  const canAdminister = can('canAccessQuestionCreator', null);
  const { toast } = useToast();

  useEffect(() => {
    if (loading) return;
    if (!questionSet) {
        notFound();
    } else {
        setEditingContent({ 
            text: questionSet.textQuestions || '', 
            examText: questionSet.textExam || '',
            flashcardText: questionSet.textFlashcard || '',
        });
        setEditingTitle(questionSet.fileName.replace(/\.[^/.]+$/, ""));
    }
  }, [id, questionSet, loading]);

  useEffect(() => {
    if (isEditingTitle && titleRef.current) {
      titleRef.current.focus();
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(titleRef.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [isEditingTitle]);

  const updateQuestionSet = async (updatedData: Partial<SavedQuestionSet>) => {
    if (!studentId || !id) return;
    const docRef = doc(db, `users/${studentId}/questionSets`, id);
    await updateDoc(docRef, updatedData);
  };
  
  const handleToggleEdit = async (type: keyof EditingContentState) => {
    if (isEditing[type]) {
      if (questionSet) {
        const keyMap = {
            text: 'textQuestions',
            examText: 'textExam',
            flashcardText: 'textFlashcard',
        };
        const dataKey = keyMap[type] as keyof SavedQuestionSet;
        const currentContent = editingContent[type];
        
        const updatedData = { [dataKey]: currentContent };

        if (currentContent !== (questionSet as any)[dataKey]) {
            await updateQuestionSet(updatedData);
            toast({ title: 'Saved', description: `${type.includes('Exam') ? 'Exam' : 'Questions'} Text has been updated.` });
        }
      }
    }
    setIsEditing(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const handleCancelEdit = (type: keyof EditingContentState) => {
    if (questionSet) {
        const keyMap: Record<keyof EditingContentState, string> = {
            text: questionSet.textQuestions || '',
            examText: questionSet.textExam || '',
            flashcardText: questionSet.textFlashcard || '',
        };
      setEditingContent(prev => ({ ...prev, [type]: keyMap[type] }));
    }
    setIsEditing(prev => ({ ...prev, [type]: false }));
  };

  const handleCopy = (content: string, type: keyof EditingContentState) => {
    navigator.clipboard.writeText(content);
    toast({ title: 'Copied to Clipboard' });
    setCopiedStatus(prev => ({ ...prev, [type]: true }));
    setTimeout(() => {
        setCopiedStatus(prev => ({ ...prev, [type]: false }));
    }, 2000);
  };
  
  const handleDownload = (content: string) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${questionSet?.fileName.replace(/\.[^/.]+$/, "") || 'content'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handlePreviewSave = async () => {
    if (!previewContent || !questionSet) return;
    const { type, content } = previewContent;
    
    const keyMap = {
        text: 'textQuestions',
        examText: 'textExam',
        flashcardText: 'textFlashcard'
    };
    const dataKey = keyMap[type] as keyof SavedQuestionSet;

    const updatedData = { [dataKey]: content };
    await updateQuestionSet(updatedData);
    
    setEditingContent(prev => ({...prev, [type]: content}));
    
    setIsPreviewEditing(false);
    toast({ title: 'Content Updated' });
  };
  
  const handleTitleSave = async () => {
      const newTitle = titleRef.current?.textContent || editingTitle;
      if (!newTitle.trim()) {
          setIsEditingTitle(false);
          if (titleRef.current) titleRef.current.textContent = editingTitle; // revert
          return;
      }
      if (questionSet && newTitle !== questionSet.fileName) {
          const originalExt = questionSet.fileName.includes('.') ? questionSet.fileName.substring(questionSet.fileName.lastIndexOf('.')) : '';
          const finalTitle = `${newTitle}${originalExt}`;
          await updateQuestionSet({ fileName: finalTitle });
          setEditingTitle(newTitle); // Display name without extension
          toast({ title: 'Title Updated' });
      }
      setIsEditingTitle(false);
  };

  const handleTitleCancel = () => {
    if (titleRef.current && questionSet) {
      titleRef.current.textContent = questionSet.fileName.replace(/\.[^/.]+$/, "");
      setEditingTitle(questionSet.fileName.replace(/\.[^/.]+$/, ""));
    }
    setIsEditingTitle(false);
  };

  const handleCreateInteractive = async (action: 'create_quiz' | 'create_exam' | 'create_flashcard') => {
    if (!questionSet || !studentId) return;

    setCurrentAction(action);
    const conversionType = action === 'create_quiz' ? 'questions' : action === 'create_exam' ? 'exam' : 'flashcards';
    const textToConvert = conversionType === 'questions' ? editingContent.text
                       : conversionType === 'exam' ? editingContent.examText
                       : editingContent.flashcardText;
    
    setIsConverting(conversionType);
    
    try {
        // This function now handles converting and updating the document in Firestore
        await convertExistingTextToJson(id, textToConvert, conversionType);
        setShowFolderSelector(true);
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Conversion Failed', description: e.message || 'Could not convert text to a structured format.'});
    } finally {
        setIsConverting(null);
    }
  };

  const handleSaveToFile = async (destination: Content) => {
    if (!currentAction || !studentId) return;

    setShowFolderSelector(false);
    
    try {
        const updatedQuestionSetDoc = await getDoc(doc(db, `users/${studentId}/questionSets`, id));
        if (!updatedQuestionSetDoc.exists()) {
            throw new Error('Could not find the updated question set.');
        }
        const updatedQuestionSet = updatedQuestionSetDoc.data() as SavedQuestionSet;

        const dataToSave = 
            currentAction === 'create_quiz' ? updatedQuestionSet.jsonQuestions 
          : currentAction === 'create_exam' ? updatedQuestionSet.jsonExam
          : updatedQuestionSet.jsonFlashcard;

        if (!dataToSave || (typeof dataToSave === 'object' && Object.keys(dataToSave).length === 0)) {
            throw new Error("No structured data available to create interactive content.");
        }

        const type = 
            currentAction === 'create_quiz' ? 'INTERACTIVE_QUIZ'
          : currentAction === 'create_exam' ? 'INTERACTIVE_EXAM'
          : 'INTERACTIVE_FLASHCARD';
        
        await contentService.createOrUpdateInteractiveContent(destination, updatedQuestionSet.fileName, dataToSave, updatedQuestionSet.sourceFileId, type);
        const actionText = destination.type === 'FOLDER' ? 'created' : 'updated';
        toast({ title: `Interactive Content ${actionText}`, description: `Content has been successfully ${actionText} in "${destination.name}".` });

    } catch(e: any) {
        toast({
            variant: 'destructive',
            title: 'Action Failed',
            description: e.message || 'Could not complete the save operation.'
        });
    } finally {
        setCurrentAction(null);
    }
};

  if (loading || !questionSet) {
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
    );
  }

  const OutputCard = ({ title, icon, content, type }: { title: string, icon: React.ReactNode, content: any, type: keyof EditingContentState }) => {
    const isEditingThisCard = isEditing[type];
    const isCopied = copiedStatus[type];

    const interactiveButtonConfig = {
        text: { action: 'create_quiz' as const, Icon: Lightbulb, label: 'Create Interactive Quiz', conversionType: 'questions' as const },
        examText: { action: 'create_exam' as const, Icon: InteractiveExamIcon, label: 'Create Interactive Exam', conversionType: 'exam' as const },
        flashcardText: { action: 'create_flashcard' as const, Icon: FlashcardIcon, label: 'Create Interactive Flashcards', conversionType: 'flashcards' as const },
    };
    
    const config = interactiveButtonConfig[type as keyof typeof interactiveButtonConfig];

    return (
        <div className="relative group glass-card p-6 rounded-3xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {icon}
                    <div>
                        <h3 className="text-lg font-semibold text-white break-words">{title}</h3>
                    </div>
                </div>
                <TooltipProvider>
                    <div className="flex items-center gap-1">
                        {canAdminister && config && (
                             <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full active:scale-95" onClick={() => handleCreateInteractive(config.action)} disabled={isConverting === config.conversionType}>
                                        {isConverting === config.conversionType ? <Loader2 className="h-4 w-4 animate-spin"/> : <config.Icon className={cn("h-5 w-5", config.action === 'create_quiz' && "text-yellow-400")} />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>{config.label}</p></TooltipContent>
                            </Tooltip>
                        )}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full active:scale-95" onClick={() => setPreviewContent({title, content, type})}><Eye className="h-4 w-4" /></Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Preview</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full active:scale-95" onClick={() => handleCopy(content, type)}>
                                  {isCopied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Copy</p></TooltipContent>
                        </Tooltip>
                        
                        {canAdminister && (
                          isEditingThisCard ? (
                              <div className="flex items-center">
                                  <Tooltip>
                                      <TooltipTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full active:scale-95" onClick={() => handleToggleEdit(type)}>
                                              <Check className="h-4 w-4 text-green-400" />
                                          </Button>
                                      </TooltipTrigger>
                                      <TooltipContent><p>Save Changes</p></TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                      <TooltipTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full active:scale-95" onClick={() => handleCancelEdit(type)}>
                                              <X className="h-4 w-4 text-red-400" />
                                          </Button>
                                      </TooltipTrigger>
                                      <TooltipContent><p>Cancel</p></TooltipContent>
                                  </Tooltip>
                              </div>
                          ) : (
                              <Tooltip>
                                  <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full active:scale-95" onClick={() => handleToggleEdit(type)}>
                                          <Pencil className="h-4 w-4" />
                                      </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Edit</p></TooltipContent>
                              </Tooltip>
                          )
                        )}

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full active:scale-95" onClick={() => handleDownload(content)}>
                                    <Download className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Download .md</p></TooltipContent>
                        </Tooltip>
                    </div>
                </TooltipProvider>
            </div>
             <textarea
                value={content}
                readOnly={!isEditingThisCard || !canAdminister}
                className="mt-4 bg-slate-800/60 border-slate-700 rounded-xl w-full p-3 text-sm text-slate-200 no-scrollbar resize-none h-96 font-code"
                onChange={(e) => {
                    if (isEditingThisCard) {
                        setEditingContent(prev => ({ ...prev, [type]: e.target.value }));
                    }
                }}
            />
        </div>
    );
  };
  
  return (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-1 flex flex-col p-2 overflow-y-auto no-scrollbar"
    >
        <TooltipProvider>
            <div className="flex items-center mb-6">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full mr-2 active:scale-95" onClick={() => router.push('/questions-creator?tab=saved')}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Back</p></TooltipContent>
                </Tooltip>
                <div className="flex items-center gap-2">
                    <h1
                      ref={titleRef}
                      contentEditable={isEditingTitle && canAdminister}
                      suppressContentEditableWarning={true}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleTitleSave();
                        }
                      }}
                      onBlur={isEditingTitle ? handleTitleSave : undefined}
                      className="text-2xl font-bold text-white outline-none focus:bg-white/10 focus:rounded-md px-1"
                    >
                      {editingTitle}
                    </h1>
                    {canAdminister && (
                      isEditingTitle ? (
                        <div className="flex items-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full active:scale-95" onClick={handleTitleSave}>
                                      <Check className="h-5 w-5 text-green-400" />
                                  </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Save Title</p></TooltipContent>
                            </Tooltip>
                             <Tooltip>
                              <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full active:scale-95" onClick={handleTitleCancel}>
                                      <X className="h-5 w-5 text-red-400" />
                                  </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Cancel</p></TooltipContent>
                            </Tooltip>
                        </div>
                      ) : (
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full active:scale-95" onClick={() => setIsEditingTitle(true)}>
                                      <Pencil className="h-5 w-5" />
                                  </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Edit Title</p></TooltipContent>
                          </Tooltip>
                      )
                    )}
                </div>
            </div>
        </TooltipProvider>
         
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <OutputCard
                title="Text Questions"
                icon={<FileText className="text-blue-400 h-8 w-8 mb-4 shrink-0" />}
                content={editingContent.text}
                type="text"
            />
             <OutputCard
                title="Text Flashcards"
                icon={<FileText className="text-green-400 h-8 w-8 mb-4 shrink-0" />}
                content={editingContent.flashcardText}
                type="flashcardText"
            />
             <OutputCard
                title="Text Exam"
                icon={<FileText className="text-red-400 h-8 w-8 mb-4 shrink-0" />}
                content={editingContent.examText}
                type="examText"
            />
        </div>
        
        <Dialog open={!!previewContent} onOpenChange={(isOpen) => {if (!isOpen) {setPreviewContent(null); setIsPreviewEditing(false);}}}>
            <DialogContent className="max-w-3xl w-[90vw] h-[80vh] flex flex-col glass-card rounded-3xl p-0 no-scrollbar" hideCloseButton={true}>
            <DialogHeader className='p-6 pb-2 flex-row flex-none justify-between items-center'>
                <DialogTitle className="flex items-center gap-3 text-white">
                    {previewContent?.type.includes('Text') && <FileText className="text-blue-400 h-5 w-5" />}
                     {previewContent?.title}
                </DialogTitle>
                <div className="flex items-center gap-1">
                    {canAdminister && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full active:scale-95 text-white" onClick={() => { if(isPreviewEditing) handlePreviewSave(); setIsPreviewEditing(!isPreviewEditing); }}>
                        {isPreviewEditing ? <Check className="h-4 w-4 text-green-500" /> : <Pencil className="h-4 w-4" />}
                    </Button>
                    )}
                    <DialogClose asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full active:scale-95 text-white">
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
        <FolderSelectorDialog 
            open={showFolderSelector}
            onOpenChange={setShowFolderSelector}
            onSelect={handleSaveToFile}
            actionType={currentAction}
        />
    </motion.div>
  );
}

export default function SavedQuestionSetPage({ params }: { params: { id: string } }) {
  const { studentId, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (!studentId) {
    // Or a login prompt
    return <div className="text-center p-8">Please log in to view saved questions.</div>
  }
  
  return <SavedQuestionSetPageContent params={params} />;
}
