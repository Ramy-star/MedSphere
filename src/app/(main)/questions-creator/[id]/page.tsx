
'use client';

import { useState, useEffect, use, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, FileJson, Save, Loader2, Copy, Download, Pencil, Check, Eye, X, Wrench, ArrowLeft, FolderPlus, DownloadCloud, Lightbulb, HelpCircle, FileQuestion } from 'lucide-react';
import { motion } from 'framer-motion';
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
import { contentService } from '@/lib/contentService';
import { UploadProgress, type UploadingFile } from '@/components/UploadProgress';
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


function SavedQuestionSetPageContent({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useUser();
  const isAdmin = user?.uid === process.env.NEXT_PUBLIC_ADMIN_UID;
  const { data: questionSet, loading } = useDoc<SavedQuestionSet>(user ? `users/${user.uid}/questionSets` : '', id, {
    disabled: !id || !user
  });

  const [isEditing, setIsEditing] = useState({ text: false, json: false });
  const [editingContent, setEditingContent] = useState({ text: '', json: '' });
  const [isRepairing, setIsRepairing] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<{title: string, content: string, type: 'text' | 'json'} | null>(null);
  const [isPreviewEditing, setIsPreviewEditing] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  const [showFolderSelector, setShowFolderSelector] = useState(false);
  const [isSavingMd, setIsSavingMd] = useState(false);
  const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<UploadingFile | null>(null);
  const [copiedStatus, setCopiedStatus] = useState({ text: false, json: false });

  const titleRef = useRef<HTMLHeadingElement>(null);


  const { toast } = useToast();

  useEffect(() => {
    if (loading) return;
    if (!questionSet) {
        //notFound();
    } else {
        setEditingContent({ text: questionSet.textQuestions, json: questionSet.jsonQuestions });
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
  
  const handleToggleEdit = async (type: 'text' | 'json') => {
    if (isEditing[type]) {
      // Save
      if (questionSet) {
        const updatedData = {
          [type === 'text' ? 'textQuestions' : 'jsonQuestions']: editingContent[type],
        };
        // Only save if content has changed
        if (editingContent[type] !== questionSet[type === 'text' ? 'textQuestions' : 'jsonQuestions']) {
            await updateQuestionSet(updatedData);
            toast({ title: 'Saved', description: `${type === 'text' ? 'Text' : 'JSON'} questions have been updated.` });
        }
      }
    }
    setIsEditing(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const handleCancelEdit = (type: 'text' | 'json') => {
    if (questionSet) {
      setEditingContent(prev => ({
        ...prev,
        [type]: type === 'text' ? questionSet.textQuestions : questionSet.jsonQuestions
      }));
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
  
  const handleCopy = (content: string, type: 'text' | 'json') => {
    navigator.clipboard.writeText(content);
    toast({ title: 'Copied to Clipboard', description: `${type === 'text' ? 'Text' : 'JSON'} questions have been copied.` });
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

  const handleSaveToFile = async (parentId: string) => {
    if (!questionSet) return;

    setShowFolderSelector(false);
    setIsSavingMd(true);
    toast({ title: "Formatting Markdown...", description: "AI is re-formatting the questions for perfect output." });

    try {
        const formattedContent = await reformatMarkdown({ rawText: questionSet.textQuestions });

        const originalFileName = questionSet.fileName.replace(/\.[^/.]+$/, ""); // Remove extension
        const newFileName = `${originalFileName} - Questions`;
        const newFileNameWithExt = `${newFileName}.md`;
        
        const file = new File([formattedContent], newFileNameWithExt, { type: 'text/markdown' });

        const tempId = `upload_${Date.now()}_${file.name}`;
        
        setUploadingFile({ id: tempId, name: newFileName, size: file.size, progress: 0, status: 'uploading', file: file });

        const callbacks = {
            onProgress: (progress: number) => {
                setUploadingFile(prev => prev ? { ...prev, progress, status: 'uploading' } : null);
            },
            onSuccess: (content: any) => {
                setUploadingFile(prev => prev ? { ...prev, status: 'success' } : null);
                setTimeout(() => setUploadingFile(null), 3000);
                toast({ title: "File Saved", description: `"${content.name}" has been saved successfully.` });
                setIsSavingMd(false);
            },
            onError: (error: Error) => {
                console.error("Save to file failed:", error);
                setUploadingFile(prev => prev ? { ...prev, status: 'error' } : null);
                toast({
                    variant: 'destructive',
                    title: 'Save Failed',
                    description: error.message || `Could not save file. Please try again.`
                })
                setIsSavingMd(false);
            }
        };
        
        // Pass the sourceFileId to the createFile function
        const xhr = await contentService.createFile(parentId, file, callbacks, { sourceFileId: questionSet.sourceFileId });
        setUploadingFile(prev => prev ? { ...prev, xhr } : null);
    } catch(e: any) {
        toast({
            variant: 'destructive',
            title: 'Formatting Failed',
            description: e.message || 'Could not re-format the markdown content.'
        });
        setIsSavingMd(false);
    }
};

  const handleCreateQuiz = async (parentId: string) => {
    if (!questionSet) return;
    setIsCreatingQuiz(true);
    setShowFolderSelector(false);
    try {
        await contentService.createInteractiveQuiz(parentId, questionSet.fileName, questionSet.jsonQuestions, questionSet.sourceFileId);
        toast({ title: 'Interactive Quiz Created', description: `Quiz for "${questionSet.fileName}" has been created.` });
    } catch (error: any) {
        console.error("Failed to create interactive quiz:", error);
        toast({
            variant: 'destructive',
            title: 'Creation Failed',
            description: error.message || 'Could not create the interactive quiz.'
        });
    } finally {
        setIsCreatingQuiz(false);
    }
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
    const isJsonCardWithError = type === 'json' && jsonError;
    const isCopied = copiedStatus[type];

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
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full active:scale-95" onClick={() => { setIsSavingMd(true); setShowFolderSelector(true); }} disabled={isSavingMd}>
                                        {isSavingMd ? <Loader2 className="h-4 w-4 animate-spin"/> : <HelpCircle className="h-4 w-4 text-red-400" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Save as File</p></TooltipContent>
                            </Tooltip>
                        )}
                        {isAdmin && type === 'json' && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full active:scale-95" onClick={() => { setIsCreatingQuiz(true); setShowFolderSelector(true); }} disabled={isCreatingQuiz}>
                                        {isCreatingQuiz ? <Loader2 className="h-4 w-4 animate-spin"/> : <Lightbulb className="h-4 w-4 text-yellow-400" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Create Interactive Quiz</p></TooltipContent>
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
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full active:scale-95" onClick={() => handleDownload(content, type === 'text' ? 'md' : 'json')}>
                                    <Download className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Download .{type === 'text' ? 'md' : 'json'}</p></TooltipContent>
                        </Tooltip>
                    </div>
                </TooltipProvider>
            </div>
             <textarea
                value={isThisCardEditing ? editingContent[type] : content}
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
         
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {renderOutputCard("Text Questions", <FileText className="text-blue-400 h-8 w-8 mb-4 shrink-0" />, editingContent.text, 'text')}
            {renderOutputCard("JSON Questions", <FileJson className="text-green-400 h-8 w-8 mb-4 shrink-0" />, editingContent.json, 'json')}
        </div>
        
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
            onOpenChange={(isOpen) => {
                if (!isOpen) {
                    // This is the cancel/close action
                    setIsSavingMd(false);
                    setIsCreatingQuiz(false);
                }
                setShowFolderSelector(isOpen);
            }} 
            onSelectFolder={(folderId) => {
                if (isSavingMd) {
                    handleSaveToFile(folderId);
                } else if (isCreatingQuiz) {
                    handleCreateQuiz(folderId);
                }
            }} 
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

