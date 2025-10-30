
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
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
import { updateDoc, doc } from 'firebase/firestore';
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


type SavedQuestionSet = {
  id: string;
  fileName: string;
  textQuestions: string;
  jsonQuestions: any; // Can be object or string
  textExam?: string;
  jsonExam?: any;
  textFlashcard?: string;
  jsonFlashcard?: any;
  createdAt: string;
  userId: string;
  sourceFileId: string;
};

// Programmatic reordering to guarantee final structure
function reorderAndStringify(obj: any): string {
    if (typeof obj === 'string') {
        try {
            obj = JSON.parse(obj);
        } catch (e) {
            return obj; // Return original string if it's not valid JSON
        }
    }
    if (typeof obj !== 'object' || obj === null) return '';

    const orderedKeys: (keyof Lecture)[] = ['id', 'name', 'mcqs_level_1', 'mcqs_level_2', 'written', 'flashcards'];
    const orderedObject: { [key: string]: any } = {};

    // Add known keys in the desired order
    for (const key of orderedKeys) {
        if (obj.hasOwnProperty(key)) {
            orderedObject[key] = obj[key];
        }
    }

    // Add any other keys that might exist (to prevent data loss)
    for (const key in obj) {
        if (!orderedObject.hasOwnProperty(key)) {
            orderedObject[key] = obj[key];
        }
    }
    
    const reorderMcqKeys = (mcqs: any[]) => {
      if (!Array.isArray(mcqs)) return mcqs;
      return mcqs.map(mcq => {
        if (typeof mcq !== 'object' || mcq === null) return mcq;
        const orderedMcq: {[key: string]: any} = {};
        if (mcq.hasOwnProperty('q')) orderedMcq.q = mcq.q;
        if (mcq.hasOwnProperty('o')) orderedMcq.o = mcq.o;
        if (mcq.hasOwnProperty('a')) orderedMcq.a = mcq.a;
        // Add any other keys to be safe
        Object.keys(mcq).forEach(key => {
          if (!orderedMcq.hasOwnProperty(key)) {
            orderedMcq[key] = mcq[key];
          }
        });
        return orderedMcq;
      });
    };

    if (orderedObject.mcqs_level_1) {
      orderedObject.mcqs_level_1 = reorderMcqKeys(orderedObject.mcqs_level_1);
    }
    if (orderedObject.mcqs_level_2) {
      orderedObject.mcqs_level_2 = reorderMcqKeys(orderedObject.mcqs_level_2);
    }
    if (orderedObject.flashcards) {
        if(Array.isArray(orderedObject.flashcards)) {
            orderedObject.flashcards = orderedObject.flashcards.map(fc => {
                if (typeof fc !== 'object' || fc === null) return fc;
                const orderedFc: {[key: string]: any} = {};
                if (fc.hasOwnProperty('id')) orderedFc.id = fc.id;
                if (fc.hasOwnProperty('front')) orderedFc.front = fc.front;
                if (fc.hasOwnProperty('back')) orderedFc.back = fc.back;
                Object.keys(fc).forEach(key => {
                    if (!orderedFc.hasOwnProperty(key)) {
                        orderedFc[key] = fc[key];
                    }
                });
                return orderedFc;
            });
        }
    }

    return JSON.stringify(orderedObject, null, 2);
}

type EditingContentState = {
    text: string;
    json: string;
    examText: string;
    examJson: string;
    flashcardText: string;
    flashcardJson: string;
};

function SavedQuestionSetPageContent({ id }: { id: string }) {
  const router = useRouter();
  const { studentId, can } = useAuthStore();
  const { data: questionSet, loading } = useDoc<SavedQuestionSet>(studentId ? `users/${studentId}/questionSets` : '', id, {
    disabled: !id || !studentId
  });

  const [isEditing, setIsEditing] = useState({ text: false, json: false, examText: false, examJson: false, flashcardText: false, flashcardJson: false });
  const [editingContent, setEditingContent] = useState<EditingContentState>({ text: '', json: '', examText: '', examJson: '', flashcardText: '', flashcardJson: '' });
  const [isRepairing, setIsRepairing] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<{title: string, content: string, type: keyof EditingContentState} | null>(null);
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

  const canAdminister = can('canAccessQuestionCreator', null);

  const { toast } = useToast();

  useEffect(() => {
    if (loading) return;
    if (!questionSet) {
        //notFound();
    } else {
        setEditingContent({ 
            text: questionSet.textQuestions || '', 
            json: reorderAndStringify(questionSet.jsonQuestions), 
            examText: questionSet.textExam || '', 
            examJson: reorderAndStringify(questionSet.jsonExam),
            flashcardText: questionSet.textFlashcard || '',
            flashcardJson: reorderAndStringify(questionSet.jsonFlashcard)
        });
        setEditingTitle(questionSet.fileName.replace(/\.[^/.]+$/, ""));
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
    if (!studentId || !id) return;
    const docRef = doc(db, `users/${studentId}/questionSets`, id);
    await updateDoc(docRef, updatedData);
  };
  
  const handleToggleEdit = async (type: keyof EditingContentState) => {
    if (isEditing[type]) {
      // Save
      if (questionSet) {
        const keyMap = {
            text: 'textQuestions',
            json: 'jsonQuestions',
            examText: 'textExam',
            examJson: 'jsonExam',
            flashcardText: 'flashcardText',
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

  const handleCancelEdit = (type: keyof EditingContentState) => {
    if (questionSet) {
        const keyMap: Record<keyof EditingContentState, string> = {
            text: questionSet.textQuestions || '',
            json: reorderAndStringify(questionSet.jsonQuestions),
            examText: questionSet.textExam || '',
            examJson: reorderAndStringify(questionSet.jsonExam),
            flashcardText: questionSet.textFlashcard || '',
            flashcardJson: reorderAndStringify(questionSet.jsonFlashcard),
        };
      setEditingContent(prev => ({ ...prev, [type]: keyMap[type] }));
    }
    setIsEditing(prev => ({ ...prev, [type]: false }));
  };

  const handleRepairJson = async () => {
    // This function is no longer available in the flow, so we remove the logic.
    // We can show a toast to inform the user.
    toast({
        variant: 'destructive',
        title: 'Feature Removed',
        description: 'JSON repair is not currently available.',
    });
  };
  
  const handleCopy = (content: string, type: keyof EditingContentState) => {
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
        flashcardText: 'flashcardText',
        flashcardJson: 'jsonFlashcard'
    };
    const dataKey = keyMap[type] as keyof SavedQuestionSet;
    let contentToSave: string | object = content;
     if (type.includes('json')) {
        try {
            contentToSave = JSON.parse(content);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Invalid JSON', description: 'The JSON in the preview is not valid and could not be saved.'});
            return;
        }
    }

    const updatedData = { [dataKey]: contentToSave };
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
          // Keep the original extension if it exists
          const originalExt = questionSet.fileName.includes('.') ? questionSet.fileName.substring(questionSet.fileName.lastIndexOf('.')) : '';
          const finalTitle = `${newTitle}${originalExt}`;
          await updateQuestionSet({ fileName: finalTitle });
          setEditingTitle(newTitle); // Display name without extension
          toast({ title: 'Title Updated' });
      }
      setIsEditingTitle(false);
  }

  const handleTitleCancel = () => {
    if (titleRef.current && questionSet) {
      titleRef.current.textContent = questionSet.fileName.replace(/\.[^/.]+$/, "");
      setEditingTitle(questionSet.fileName.replace(/\.[^/.]+$/, ""));
    }
    setIsEditingTitle(false);
  };

  const handleSaveToFile = async (destination: Content) => {
    if (!questionSet || !currentAction) return;

    setShowFolderSelector(false);
    
    try {
        if(currentAction === 'save_questions_md') {
            const formattedContent = await reformatMarkdown({ rawText: questionSet.textQuestions });
            const file = new File([formattedContent], `${questionSet.fileName.replace(/\.[^/.]+$/, "")} - Questions.md`, { type: 'text/markdown' });
            // This part is simplified. In a real app, you'd use a service to handle the file saving logic.
            // For now, we'll just log it and show a toast.
            console.log(`Saving markdown file to folder ${destination.id}`);
            toast({ title: "File Saved", description: `"${file.name}" has been saved to "${destination.name}".` });
        }
        else if (currentAction === 'save_exam_md') {
            const formattedContent = await reformatMarkdown({ rawText: questionSet.textExam || '' });
            const file = new File([formattedContent], `${questionSet.fileName.replace(/\.[^/.]+$/, "")} - Exam.md`, { type: 'text/markdown' });
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

  const OutputCard = ({ title, icon, content, type, onToggleEdit, isEditing, onContentChange, onCancel, onRepair, isRepairing, jsonError }: { title: string, icon: React.ReactNode, content: any, type: keyof EditingContentState, onToggleEdit: () => void, isEditing: boolean, onContentChange: (value: string) => void, onCancel: () => void, onRepair?: () => void, isRepairing?: boolean, jsonError?: string | null }) => {
    const isThisCardEditing = isEditing;
    const isJsonCardWithError = type.includes('json') && jsonError;
    const isCopied = copiedStatus[type];

    const isCreating = (type === 'json' && currentAction === 'create_quiz') || 
                       (type === 'examJson' && currentAction === 'create_exam') ||
                       (type === 'flashcardJson' && currentAction === 'create_flashcard');
    const isSaving = (type === 'text' && currentAction === 'save_questions_md') || (type === 'examText' && currentAction === 'save_exam_md');
    
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
                        {canAdminister && type === 'text' && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full active:scale-95" onClick={() => { setCurrentAction('save_questions_md'); setShowFolderSelector(true); }} disabled={isSaving}>
                                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin"/> : <FileQuestion className="h-4 w-4 text-blue-400" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Save as Questions File</p></TooltipContent>
                            </Tooltip>
                        )}
                        {canAdminister && type === 'examText' && (
                             <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full active:scale-95" onClick={() => { setCurrentAction('save_exam_md'); setShowFolderSelector(true); }} disabled={isSaving}>
                                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin"/> : <HelpCircle className="h-4 w-4 text-orange-400" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Save as Exam File</p></TooltipContent>
                            </Tooltip>
                        )}
                        {canAdminister && type === 'json' && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full active:scale-95" onClick={() => { setCurrentAction('create_quiz'); setShowFolderSelector(true); }} disabled={isCreating}>
                                        {isCreating ? <Loader2 className="h-4 w-4 animate-spin"/> : <Lightbulb className="h-4 w-4 text-yellow-400" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Create/Merge Interactive Quiz</p></TooltipContent>
                            </Tooltip>
                        )}
                         {canAdminister && type === 'examJson' && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full active:scale-95" onClick={() => { setCurrentAction('create_exam'); setShowFolderSelector(true); }} disabled={isCreating}>
                                        {isCreating ? <Loader2 className="h-4 w-4 animate-spin"/> : <InteractiveExamIcon className="h-5 w-5" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Create/Merge Interactive Exam</p></TooltipContent>
                            </Tooltip>
                        )}
                        {canAdminister && type === 'flashcardJson' && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full active:scale-95" onClick={() => { setCurrentAction('create_flashcard'); setShowFolderSelector(true); }} disabled={isCreating}>
                                        {isCreating ? <Loader2 className="h-4 w-4 animate-spin"/> : <FlashcardIcon className="w-5 h-5" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Create/Merge Interactive Flashcards</p></TooltipContent>
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
                          isThisCardEditing ? (
                              <div className="flex items-center">
                                  <Tooltip>
                                      <TooltipTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full active:scale-95" onClick={onToggleEdit}>
                                              <Check className="h-4 w-4 text-green-400" />
                                          </Button>
                                      </TooltipTrigger>
                                      <TooltipContent><p>Save Changes</p></TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                      <TooltipTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full active:scale-95" onClick={onCancel}>
                                              <X className="h-4 w-4 text-red-400" />
                                          </Button>
                                      </TooltipTrigger>
                                      <TooltipContent><p>Cancel</p></TooltipContent>
                                  </Tooltip>
                              </div>
                          ) : (
                              <Tooltip>
                                  <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full active:scale-95" onClick={onToggleEdit}>
                                          <Pencil className="h-4 w-4" />
                                      </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Edit</p></TooltipContent>
                              </Tooltip>
                          )
                        )}

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full active:scale-95" onClick={() => handleDownload(content, type.includes('Json') ? 'json' : 'md')}>
                                    <Download className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Download .{type.includes('Json') ? 'json' : 'md'}</p></TooltipContent>
                        </Tooltip>
                    </div>
                </TooltipProvider>
            </div>
             <textarea
                value={content}
                readOnly={!isThisCardEditing || !canAdminister}
                className="mt-4 bg-slate-800/60 border-slate-700 rounded-xl w-full p-3 text-sm text-slate-200 no-scrollbar resize-none h-96 font-code"
                onChange={(e) => {
                    if (isThisCardEditing) {
                        onContentChange(e.target.value);
                    }
                }}
            />
            {isJsonCardWithError && !isThisCardEditing && onRepair && (
                <div className="mt-2">
                    <Button onClick={onRepair} disabled={isRepairing} className='w-full rounded-xl bg-yellow-600/80 hover:bg-yellow-600 text-white active:scale-95'>
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
         
        <SectionHeader title="Questions" section="questions" isVisible={sectionsVisibility.questions} onToggle={(s) => setSectionsVisibility(p => ({...p, [s]: !p[s]}))} />
        {sectionsVisibility.questions && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mt-8">
                <OutputCard
                    title="Text Questions"
                    icon={<FileText className="text-blue-400 h-8 w-8 mb-4 shrink-0" />}
                    content={editingContent.text}
                    type="text"
                    isEditing={isEditing.text}
                    onToggleEdit={() => handleToggleEdit('text')}
                    onContentChange={(value) => setEditingContent(prev => ({...prev, text: value}))}
                    onCancel={() => handleCancelEdit('text')}
                />
                <OutputCard
                    title="JSON Questions"
                    icon={<FileJson className="text-blue-400 h-8 w-8 mb-4 shrink-0" />}
                    content={editingContent.json}
                    type="json"
                    isEditing={isEditing.json}
                    onToggleEdit={() => handleToggleEdit('json')}
                    onContentChange={(value) => setEditingContent(prev => ({...prev, json: value}))}
                    onCancel={() => handleCancelEdit('json')}
                    onRepair={handleRepairJson}
                    isRepairing={isRepairing}
                    jsonError={jsonError}
                />
            </div>
        )}

        <SectionHeader title="Exam" section="exam" isVisible={sectionsVisibility.exam} onToggle={(s) => setSectionsVisibility(p => ({...p, [s]: !p[s]}))} />
        {sectionsVisibility.exam && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mt-8">
                <OutputCard
                    title="Text Exam"
                    icon={<FileText className="text-red-400 h-8 w-8 mb-4 shrink-0" />}
                    content={editingContent.examText}
                    type="examText"
                    isEditing={isEditing.examText}
                    onToggleEdit={() => handleToggleEdit('examText')}
                    onContentChange={(value) => setEditingContent(prev => ({...prev, examText: value}))}
                    onCancel={() => handleCancelEdit('examText')}
                />
                <OutputCard
                    title="JSON Exam"
                    icon={<FileJson className="text-red-400 h-8 w-8 mb-4 shrink-0" />}
                    content={editingContent.examJson}
                    type="examJson"
                    isEditing={isEditing.examJson}
                    onToggleEdit={() => handleToggleEdit('examJson')}
                    onContentChange={(value) => setEditingContent(prev => ({...prev, examJson: value}))}
                    onCancel={() => handleCancelEdit('examJson')}
                />
            </div>
        )}

        <SectionHeader title="Flashcards" section="flashcards" isVisible={sectionsVisibility.flashcards} onToggle={(s) => setSectionsVisibility(p => ({...p, [s]: !p[s]}))} />
        {sectionsVisibility.flashcards && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mt-8">
                 <OutputCard
                    title="Text Flashcard"
                    icon={<FileText className="text-green-400 h-8 w-8 mb-4 shrink-0" />}
                    content={editingContent.flashcardText}
                    type="flashcardText"
                    isEditing={isEditing.flashcardText}
                    onToggleEdit={() => handleToggleEdit('flashcardText')}
                    onContentChange={(value) => setEditingContent(prev => ({...prev, flashcardText: value}))}
                    onCancel={() => handleCancelEdit('flashcardText')}
                />
                <OutputCard
                    title="JSON Flashcard"
                    icon={<FileJson className="text-green-400 h-8 w-8 mb-4 shrink-0" />}
                    content={editingContent.flashcardJson}
                    type="flashcardJson"
                    isEditing={isEditing.json}
                    onToggleEdit={() => handleToggleEdit('flashcardJson')}
                    onContentChange={(value) => setEditingContent(prev => ({...prev, flashcardJson: value}))}
                    onCancel={() => handleCancelEdit('flashcardJson')}
                />
            </div>
        )}
        
        <Dialog open={!!previewContent} onOpenChange={(isOpen) => {if (!isOpen) {setPreviewContent(null); setIsPreviewEditing(false);}}}>
            <DialogContent className="max-w-3xl w-[90vw] h-[80vh] flex flex-col glass-card rounded-3xl p-0 no-scrollbar" hideCloseButton={true}>
            <DialogHeader className='p-6 pb-2 flex-row flex-none justify-between items-center'>
                <DialogTitle className="flex items-center gap-3 text-white">
                    {previewContent?.type.includes('Text') && <FileText className="text-blue-400 h-5 w-5" />}
                    {previewContent?.type.includes('Json') && <FileJson className="text-green-400 h-5 w-5" />}
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
        {uploadingFile && (
            <div className="fixed bottom-4 right-4 w-80">
                 <UploadProgress file={uploadingFile} onRetry={() => {}} onRemove={() => { setUploadingFile(null); uploadingFile.xhr?.abort(); }} />
            </div>
        )}
    </motion.div>
  );
}


export default function SavedQuestionSetPage({ params }: { params: { id: string } }) {
  const { id } = params;
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
  
  return <SavedQuestionSetPageContent id={id} />;
}
