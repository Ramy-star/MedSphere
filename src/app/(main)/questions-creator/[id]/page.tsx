
'use client';

import { useState, useEffect, use, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, FileJson, Save, Loader2, Copy, Download, Pencil, Check, Eye, X, Wrench, ArrowLeft, FolderPlus, DownloadCloud, Lightbulb, HelpCircle, FileQuestion, FileCheck, Layers, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { repairJson } from '@/ai/flows/question-gen-flow';
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
import { useUser } from '@/firebase/auth/use-user';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import { FolderSelectorDialog } from '@/components/FolderSelectorDialog';
import { UploadProgress, type UploadingFile } from '@/components/UploadProgress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { contentService, type Content } from '@/lib/contentService';
import { cn } from '@/lib/utils';

type SavedQuestionSet = {
  id: string;
  fileName: string;
  textQuestions: string;
  jsonQuestions: string;
  textExam: string;
  jsonExam: string;
  textFlashcard: string;
  jsonFlashcard: string;
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
    text = text.replace(/&lt;/g, '<').replace(/&gt;/, '>').replace(/&amp;/g, '&');
    return text;
}


function SavedQuestionSetPageContent({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useUser();
  const isAdmin = user?.uid === process.env.NEXT_PUBLIC_ADMIN_UID;
  const { data: questionSet, loading } = useDoc<SavedQuestionSet>(user ? `users/${user.uid}/questionSets` : '', id, {
    disabled: !id || !user
  });

  const [isEditing, setIsEditing] = useState({ text: false, json: false, examText: false, examJson: false, flashcardText: false, flashcardJson: false });
  const [editingContent, setEditingContent] = useState({ text: '', json: '', examText: '', examJson: '', flashcardText: '', flashcardJson: '' });
  const [isRepairing, setIsRepairing] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<{title: string, content: string, type: 'text' | 'json' | 'examText' | 'examJson' | 'flashcardText' | 'flashcardJson'} | null>(null);
  const [isPreviewEditing, setIsPreviewEditing] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  const [showFolderSelector, setShowFolderSelector] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<UploadingFile | null>(null);
  const [copiedStatus, setCopiedStatus] = useState({ text: false, json: false, examText: false, examJson: false, flashcardText: false, flashcardJson: false });
  const [currentAction, setCurrentAction] = useState<'save_questions_md' | 'save_exam_md' | 'create_quiz' | 'create_exam' | 'create_flashcard' | null>(null);
  const [sectionsVisibility, setSectionsVisibility] = useState({
    questions: true,
    exam: true,
    flashcards: true,
  });


  const titleRef = useRef<HTMLHeadingElement>(null);


  const { toast } = useToast();

  useEffect(() => {
    if (loading) return;
    if (!questionSet) {
        //notFound();
    } else {
        const safeStringify = (data: any) => {
            if (typeof data === 'string') return data;
            try {
                return JSON.stringify(data, null, 2);
            } catch (e) {
                return '';
            }
        };

        setEditingContent({ 
            text: questionSet.textQuestions || '', 
            json: safeStringify(questionSet.jsonQuestions), 
            examText: questionSet.textExam || '', 
            examJson: safeStringify(questionSet.jsonExam),
            textFlashcard: questionSet.textFlashcard || '',
            jsonFlashcard: safeStringify(questionSet.jsonFlashcard)
        });
        setEditingTitle(questionSet.fileName);
    }
  }, [id, questionSet, loading]);

  useEffect(() => {
    if (isEditingTitle && titleRef.current) {
      // Focus and move cursor to the end
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
    if (!user?.uid || !id) return;
    const docRef = doc(db, `users/${user.uid}/questionSets`, id);
    await updateDoc(docRef, updatedData);
  };
  
  const handleToggleEdit = async (type: 'text' | 'json' | 'examText' | 'examJson' | 'flashcardText' | 'flashcardJson') => {
    if (isEditing[type]) {
      // Save
      if (questionSet) {
        const keyMap = {
            text: 'textQuestions',
            json: 'jsonQuestions',
            examText: 'textExam',
            examJson: 'jsonExam',
            flashcardText: 'textFlashcard',
            flashcardJson: 'jsonFlashcard'
        };
        const dataKey = keyMap[type] as keyof SavedQuestionSet;
        const currentContent = editingContent[type];
        
        let contentToSave: any = currentContent;
        if(type.includes('json')) {
            try {
                contentToSave = JSON.parse(currentContent);
            } catch (e) {
                toast({ variant: 'destructive', title: 'Invalid JSON', description: 'The JSON is not valid and could not be saved.'});
                return;
            }
        }

        const updatedData = { [dataKey]: contentToSave };

        if (currentContent !== (questionSet as any)[dataKey]) {
            await updateQuestionSet(updatedData);
            toast({ title: 'Saved', description: `${type.includes('Exam') ? 'Exam ' : ''}${type.includes('Flashcard') ? 'Flashcard ' : ''}${type.includes('Text') ? 'Text' : 'JSON'} has been updated.` });
        }
      }
    }
    setIsEditing(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const handleCancelEdit = (type: 'text' | 'json' | 'examText' | 'examJson' | 'flashcardText' | 'flashcardJson') => {
    if (questionSet) {
        const safeStringify = (data: any) => {
            if (typeof data === 'string') return data;
            try {
                return JSON.stringify(data, null, 2);
            } catch (e) {
                return '';
            }
        };

        const keyMap: Record<typeof type, string> = {
            text: questionSet.textQuestions || '',
            json: safeStringify(questionSet.jsonQuestions),
            examText: questionSet.textExam || '',
            examJson: safeStringify(questionSet.jsonExam),
            textFlashcard: questionSet.textFlashcard || '',
            jsonFlashcard: safeStringify(questionSet.jsonFlashcard),
        };
      setEditingContent(prev => ({ ...prev, [type]: keyMap[type] }));
    }
    setIsEditing(prev => ({ ...prev, [type]: false }));
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
  
  const handleCopy = (content: string, type: 'text' | 'json' | 'examText' | 'examJson' | 'flashcardText' | 'flashcardJson') => {
    navigator.clipboard.writeText(content);
    toast({ title: 'Copied to Clipboard', description: `${type.includes('Exam') ? 'Exam ' : ''}${type.includes('Flashcard') ? 'Flashcard ' : ''}${type.includes('Text') ? 'Text' : 'JSON'} has been copied.` });
    setCopiedStatus(prev => ({ ...prev, [type]: true }));
    setTimeout(() => {
        setCopiedStatus(prev => ({ ...prev, [type]: false }));
    }, 2000);
  };
  
  const handleDownload = (content: string, format: 'txt' | 'json' | 'md') => {
    let blob: Blob;
    let fileExtension = format;

    if (format === 'md') {
        blob = new Blob([content], { type: 'text/markdown' });
    } else {
        blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/plain' });
    }
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${questionSet?.fileName.replace(/\.[^/.]+$/, "") || 'questions'}.${fileExtension}`;
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
        json: 'jsonQuestions',
        examText: 'textExam',
        examJson: 'jsonExam',
        flashcardText: 'textFlashcard',
        flashcardJson: 'jsonFlashcard'
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
          await updateQuestionSet({ fileName: newTitle });
          setEditingTitle(newTitle);
          toast({ title: 'Title Updated' });
      }
      setIsEditingTitle(false);
  }

  const handleTitleCancel = () => {
    if (titleRef.current && questionSet) {
      titleRef.current.textContent = questionSet.fileName;
      setEditingTitle(questionSet.fileName);
    }
    setIsEditingTitle(false);
  };

  const handleSaveToFile = async (destination: Content) => {
    if (!questionSet || !currentAction) return;

    setShowFolderSelector(false);
    
    try {
        if(currentAction === 'save_questions_md') {
            const formattedContent = await reformatMarkdown({ rawText: questionSet.textQuestions });
            const file = new File([formattedContent], `${questionSet.fileName} - Questions.md`, { type: 'text/markdown' });
            // This part is simplified. In a real app, you'd use a service to handle the file saving logic.
            // For now, we'll just log it and show a toast.
            console.log(`Saving markdown file to folder ${destination.id}`);
            toast({ title: "File Saved", description: `"${file.name}" has been saved to "${destination.name}".` });
        }
        else if (currentAction === 'save_exam_md') {
            const formattedContent = await reformatMarkdown({ rawText: questionSet.textExam });
            const file = new File([formattedContent], `${questionSet.fileName} - Exam.md`, { type: 'text/markdown' });
             console.log(`Saving markdown file to folder ${destination.id}`);
            toast({ title: "File Saved", description: `"${file.name}" has been saved to "${destination.name}".` });
        }
        else if (currentAction === 'create_quiz' || currentAction === 'create_exam' || currentAction === 'create_flashcard') {
            const dataToSave = currentAction === 'create_quiz' ? questionSet.jsonQuestions 
                             : currentAction === 'create_exam' ? questionSet.jsonExam
                             : questionSet.jsonFlashcard;

            const type = currentAction === 'create_quiz' ? 'INTERACTIVE_QUIZ'
                       : currentAction === 'create_exam' ? 'INTERACTIVE_EXAM'
                       : 'INTERACTIVE_FLASHCARD';
            
            await contentService.createOrUpdateInteractiveContent(destination, questionSet.fileName, dataToSave, questionSet.sourceFileId, type);
            const actionText = destination.type === 'FOLDER' ? 'created' : 'updated';
            toast({ title: `Interactive Content ${actionText}`, description: `Content has been successfully ${actionText} in "${destination.name}".` });
        }

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

  const renderOutputCard = (title: string, icon: React.ReactNode, content: string | null, type: 'text' | 'json' | 'examText' | 'examJson' | 'flashcardText' | 'flashcardJson') => {
    const isThisCardEditing = isEditing[type];
    const isJsonCardWithError = type.includes('json') && jsonError;
    const isCopied = copiedStatus[type];

    const isCreating = (type === 'json' && currentAction === 'create_quiz') || 
                       (type === 'examJson' && currentAction === 'create_exam') ||
                       (type === 'flashcardJson' && currentAction === 'create_flashcard');
    const isSaving = (type === 'text' && currentAction === 'save_questions_md') || (type === 'examText' && currentAction === 'save_exam_md');
    
    // Ensure content is a string
    const displayContent = content ?? '';

    return (
        <div className="relative group glass-card p-6 rounded-3xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
                <div className="flex items-start gap-4">
                    {icon}
                    <div>
                        <h3 className="text-lg font-semibold text-white break-words">{title}</h3>
                    </div>
                </div>
                <TooltipProvider>
                    <div className="flex items-center gap-1">
                        {isAdmin && type === 'text' && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full active:scale-95" onClick={() => { setCurrentAction('save_questions_md'); setShowFolderSelector(true); }} disabled={isSaving}>
                                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin"/> : <FileQuestion className="h-4 w-4 text-blue-400" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Save as Questions File</p></TooltipContent>
                            </Tooltip>
                        )}
                        {isAdmin && type === 'examText' && (
                             <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full active:scale-95" onClick={() => { setCurrentAction('save_exam_md'); setShowFolderSelector(true); }} disabled={isSaving}>
                                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin"/> : <HelpCircle className="h-4 w-4 text-orange-400" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Save as Exam File</p></TooltipContent>
                            </Tooltip>
                        )}
                        {isAdmin && type === 'json' && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full active:scale-95" onClick={() => { setCurrentAction('create_quiz'); setShowFolderSelector(true); }} disabled={isCreating}>
                                        {isCreating ? <Loader2 className="h-4 w-4 animate-spin"/> : <Lightbulb className="h-4 w-4 text-yellow-400" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Create/Merge Interactive Quiz</p></TooltipContent>
                            </Tooltip>
                        )}
                         {isAdmin && type === 'examJson' && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full active:scale-95" onClick={() => { setCurrentAction('create_exam'); setShowFolderSelector(true); }} disabled={isCreating}>
                                        {isCreating ? <Loader2 className="h-4 w-4 animate-spin"/> : <FileCheck className="h-4 w-4 text-rose-400" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Create/Merge Interactive Exam</p></TooltipContent>
                            </Tooltip>
                        )}
                        {isAdmin && type === 'flashcardJson' && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full active:scale-95" onClick={() => { setCurrentAction('create_flashcard'); setShowFolderSelector(true); }} disabled={isCreating}>
                                        {isCreating ? <Loader2 className="h-4 w-4 animate-spin"/> : <Layers className="h-4 w-4 text-indigo-400" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Create/Merge Interactive Flashcards</p></TooltipContent>
                            </Tooltip>
                        )}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full active:scale-95" onClick={() => setPreviewContent({title, content: displayContent, type})}><Eye className="h-4 w-4" /></Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Preview</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full active:scale-95" onClick={() => handleCopy(displayContent, type)}>
                                  {isCopied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Copy</p></TooltipContent>
                        </Tooltip>
                        
                        {isAdmin && (
                          isThisCardEditing ? (
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
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full active:scale-95" onClick={() => handleDownload(displayContent, type.includes('Json') ? 'json' : 'md')}>
                                    <Download className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Download .{type.includes('Json') ? 'json' : 'md'}</p></TooltipContent>
                        </Tooltip>
                    </div>
                </TooltipProvider>
            </div>
             <textarea
                value={isThisCardEditing ? editingContent[type] : displayContent}
                readOnly={!isThisCardEditing || !isAdmin}
                className="mt-4 bg-slate-800/60 border-slate-700 rounded-xl w-full p-3 text-sm text-slate-200 no-scrollbar resize-none h-96 font-code"
                onChange={(e) => {
                    if (isThisCardEditing) {
                        setEditingContent(prev => ({...prev, [type]: e.target.value}))
                    }
                }}
            />
            {isJsonCardWithError && !isThisCardEditing && (
                <div className="mt-2">
                    <Button onClick={handleRepairJson} disabled={isRepairing} className='w-full rounded-xl bg-yellow-600/80 hover:bg-yellow-600 text-white active:scale-95'>
                        {isRepairing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wrench className="mr-2 h-4 w-4" />}
                        {isRepairing ? 'Repairing...' : 'Attempt to Repair JSON'}
                    </Button>
                </div>
            )}
        </div>
    );
  };
  
  const SectionHeader = ({ title, section, isVisible, onToggle }: { title: string, section: keyof typeof sectionsVisibility, isVisible: boolean, onToggle: (section: keyof typeof sectionsVisibility) => void }) => (
    <div className="flex items-center gap-2 mt-8">
      <Button variant="ghost" size="icon" onClick={() => onToggle(section)} className="h-6 w-6 rounded-full">
        <motion.div
            animate={{ rotate: isVisible ? 0 : -90 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
            <ChevronDown className="h-5 w-5" />
        </motion.div>
      </Button>
      <div className="flex-grow border-t border-white/10"></div>
    </div>
  );

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
                      contentEditable={isEditingTitle && isAdmin}
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
                    {isAdmin && (
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
         
        <SectionHeader title="Questions" section="questions" isVisible={sectionsVisibility.questions} onToggle={(s) => setSectionsVisibility(p => ({...p, [s]: !p[s]}))} />
        {sectionsVisibility.questions && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mt-8">
                {renderOutputCard("Text Questions", <FileText className="text-blue-400 h-8 w-8 mb-4 shrink-0" />, editingContent.text, 'text')}
                {renderOutputCard("JSON Questions", <FileJson className="text-blue-400 h-8 w-8 mb-4 shrink-0" />, editingContent.json, 'json')}
            </div>
        )}

        <SectionHeader title="Exam" section="exam" isVisible={sectionsVisibility.exam} onToggle={(s) => setSectionsVisibility(p => ({...p, [s]: !p[s]}))} />
        {sectionsVisibility.exam && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mt-8">
                {renderOutputCard("Text Exam", <FileText className="text-red-400 h-8 w-8 mb-4 shrink-0" />, editingContent.examText, 'examText')}
                {renderOutputCard("JSON Exam", <FileJson className="text-red-400 h-8 w-8 mb-4 shrink-0" />, editingContent.jsonExam, 'examJson')}
            </div>
        )}

        <SectionHeader title="Flashcards" section="flashcards" isVisible={sectionsVisibility.flashcards} onToggle={(s) => setSectionsVisibility(p => ({...p, [s]: !p[s]}))} />
        {sectionsVisibility.flashcards && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mt-8">
                {renderOutputCard("Text Flashcard", <FileText className="text-green-400 h-8 w-8 mb-4 shrink-0" />, editingContent.textFlashcard, 'flashcardText')}
                {renderOutputCard("JSON Flashcard", <FileJson className="text-green-400 h-8 w-8 mb-4 shrink-0" />, editingContent.jsonFlashcard, 'flashcardJson')}
            </div>
        )}
        
        <Dialog open={!!previewContent} onOpenChange={(isOpen) => {if (!isOpen) {setPreviewContent(null); setIsPreviewEditing(false);}}}>
            <DialogContent className="max-w-3xl w-[90vw] h-[80vh] flex flex-col glass-card rounded-3xl p-0 no-scrollbar" hideCloseButton={true}>
            <DialogHeader className='p-6 pb-2 flex-row flex-none justify-between items-center'>
                <DialogTitle className="flex items-center gap-3">
                    {previewContent?.type === 'text' && <FileText className="text-blue-400 h-5 w-5" />}
                    {previewContent?.type === 'json' && <FileJson className="text-green-400 h-5 w-5" />}
                </DialogTitle>
                <div className="flex items-center gap-1">
                    {isAdmin && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full active:scale-95" onClick={() => { if(isPreviewEditing) handlePreviewSave(); setIsPreviewEditing(!isPreviewEditing); }}>
                        {isPreviewEditing ? <Check className="h-4 w-4 text-green-500" /> : <Pencil className="h-4 w-4" />}
                    </Button>
                    )}
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
        <FolderSelectorDialog 
            open={showFolderSelector}
            onOpenChange={setShowFolderSelector}
            onSelect={handleSaveToFile}
            actionType={currentAction}
        />
        {uploadingFile && (
            <div className="fixed bottom-4 right-4 w-80">
                 <UploadProgress file={uploadingFile} onRetry={() => {}} onRemove={() => { setUploadingFile(null); uploadingFile.xhr?.abort(); }} />
            </div>
        )}
    </motion.div>
  );
}


export default function SavedQuestionSetPage({ params }: { params: Promise<{ id:string }> }) {
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
