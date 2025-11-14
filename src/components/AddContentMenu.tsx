'use client';
import { PopoverContent } from '@/components/ui/popover';
import { FolderPlus, Plus, Upload } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { contentService } from '@/lib/contentService';
import { NewFolderDialog } from './new-folder-dialog';
import { useToast } from '@/hooks/use-toast';
import { NewLinkDialog } from './NewLinkDialog';
import { Link2Icon } from './icons/Link2Icon';
import { useAuthStore } from '@/stores/auth-store';
import { FlashcardIcon } from './icons/FlashcardIcon';
import { InteractiveExamIcon } from './icons/InteractiveExamIcon';
import { Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';


type AddContentMenuProps = {
  parentId: string | null;
  onFileSelected: (file: File) => void;
  setPopoverOpen: (isOpen: boolean) => void;
}

export function AddContentMenu({ parentId, onFileSelected, setPopoverOpen }: AddContentMenuProps) {
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [showNewClassDialog, setShowNewClassDialog] = useState(false);
  const [showNewLinkDialog, setShowNewLinkDialog] = useState(false);
  
  const [interactiveContentType, setInteractiveContentType] = useState<'quiz' | 'exam' | 'flashcard' | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { can, user } = useAuthStore();

  const handleAddFolder = async (folderName: string) => {
    try {
        await contentService.createFolder(parentId, folderName);
        toast({ title: 'Folder Created', description: `"${folderName}" has been created.` });
        setShowNewFolderDialog(false);
        setPopoverOpen(false);
    } catch(error: any) {
        console.error("Failed to create folder:", error);
        toast({ 
            variant: 'destructive', 
            title: 'Error creating folder', 
            description: error.message || 'An unknown error occurred.' 
        });
    }
  };

  const handleAddClass = async (className: string) => {
    try {
        await contentService.createFolder(parentId, className, { isClassContainer: true });
        toast({ title: 'Class Created', description: `"${className}" has been created.` });
        setShowNewClassDialog(false);
        setPopoverOpen(false);
    } catch(error: any) {
        console.error("Failed to create class:", error);
        toast({ 
            variant: 'destructive', 
            title: 'Error creating class', 
            description: error.message || 'An unknown error occurred.' 
        });
    }
  }

  const handleAddLink = async (name: string, url: string) => {
     try {
        await contentService.createLink(parentId, name, url);
        toast({ title: 'Link Created', description: `"${name}" has been created.` });
        setShowNewLinkDialog(false);
        setPopoverOpen(false);
    } catch(error: any) {
        console.error("Failed to create link:", error);
        toast({ 
            variant: 'destructive', 
            title: 'Error creating link', 
            description: error.message || 'An unknown error occurred.' 
        });
    }
  }
  
  const handleAddInteractiveContent = async (name: string) => {
    if (!parentId || !interactiveContentType) return;
    try {
        const typeMap = {
            quiz: 'INTERACTIVE_QUIZ',
            exam: 'INTERACTIVE_EXAM',
            flashcard: 'INTERACTIVE_FLASHCARD'
        };
        const friendlyNameMap = {
            quiz: 'Quiz',
            exam: 'Exam',
            flashcard: 'Flashcard Set'
        };

        const type = typeMap[interactiveContentType] as 'INTERACTIVE_QUIZ' | 'INTERACTIVE_EXAM' | 'INTERACTIVE_FLASHCARD';
        
        await contentService.createOrUpdateInteractiveContent({id: parentId, type: 'FOLDER', name: 'Parent', parentId: ''}, name, {}, '', type);
        toast({ title: `${friendlyNameMap[interactiveContentType]} Created`, description: `"${name}" has been created.` });
        setPopoverOpen(false);
    } catch(error: any) {
        console.error(`Failed to create ${interactiveContentType}:`, error);
        toast({ 
            variant: 'destructive', 
            title: `Error creating ${interactiveContentType}`, 
            description: error.message || 'An unknown error occurred.' 
        });
    } finally {
        setInteractiveContentType(null);
    }
  };


  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelected(file);
      setPopoverOpen(false);
    }
    if(event.target) {
        event.target.value = '';
    }
  };
  
  const menuItems = [
      {
          label: "New Class",
          icon: Plus,
          action: () => setShowNewClassDialog(true),
          permission: 'canAddClass'
      },
      {
          label: "New Folder",
          icon: FolderPlus,
          action: () => setShowNewFolderDialog(true),
          permission: 'canAddFolder'
      },
      {
          label: "Upload File",
          icon: Upload,
          action: handleUploadClick,
          permission: 'canUploadFile'
      },
      {
          label: "Add Link",
          icon: Link2Icon,
          action: () => setShowNewLinkDialog(true),
          permission: 'canAddLink'
      },
      {
          label: "Create Quiz",
          icon: Lightbulb,
          action: () => setInteractiveContentType('quiz'),
          permission: 'canAdministerExams',
          color: "text-yellow-400"
      },
       {
          label: "Create Flashcard",
          icon: FlashcardIcon,
          action: () => setInteractiveContentType('flashcard'),
          permission: 'canAdministerFlashcards',
          color: ""
      },
      {
          label: "Create Exam",
          icon: InteractiveExamIcon,
          action: () => setInteractiveContentType('exam'),
          permission: 'canAdministerExams',
          color: ""
      }
  ].sort((a, b) => {
    const order = ['New Class', 'New Folder', 'Upload File', 'Add Link', 'Create Quiz', 'Create Flashcard', 'Create Exam'];
    return order.indexOf(a.label) - order.indexOf(b.label);
  });

  const visibleMenuItems = menuItems.filter(item => can(item.permission, parentId));
  
  if (!user || visibleMenuItems.length === 0) return null;

  return (
    <>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange}
        className="hidden" 
      />
      <PopoverContent 
        className="w-56 p-2 border-slate-700" 
        align="end"
      >
          <div className="space-y-1">
            <p className="px-2 py-1.5 text-sm font-semibold text-slate-300">Create New</p>
            {visibleMenuItems.map((item) => (
                <div 
                    key={item.label}
                    onClick={item.action}
                    className="flex items-center gap-3 p-2 rounded-xl text-sm text-slate-200 hover:bg-white/10 cursor-pointer transition-colors"
                >
                    <item.icon className={cn("h-4 w-4 text-slate-400", item.color)} />
                    <span>{item.label}</span>
                </div>
            ))}
        </div>
      </PopoverContent>
      <NewFolderDialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog} onAddFolder={handleAddFolder} />
      <NewFolderDialog open={showNewClassDialog} onOpenChange={setShowNewClassDialog} onAddFolder={handleAddClass} title="Add new class" description="Create a new class container." />
      <NewLinkDialog open={showNewLinkDialog} onOpenChange={setShowNewLinkDialog} onAddLink={handleAddLink} />
      <NewFolderDialog
        open={!!interactiveContentType}
        onOpenChange={(isOpen) => !isOpen && setInteractiveContentType(null)}
        onAddFolder={handleAddInteractiveContent}
        title={`Create New ${interactiveContentType === 'quiz' ? 'Quiz' : interactiveContentType === 'exam' ? 'Exam' : 'Flashcard Set'}`}
        description={`Enter a name for the new interactive content.`}
      />
    </>
  );
}
