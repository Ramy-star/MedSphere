
'use client';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FolderPlus, Plus, Upload, Link as LinkIcon } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { contentService } from '@/lib/contentService';
import { NewFolderDialog } from './new-folder-dialog';
import { useToast } from '@/hooks/use-toast';
import { NewLinkDialog } from './NewLinkDialog';

type AddContentMenuProps = {
  parentId: string | null;
  onFileSelected: (file: File) => void;
  trigger?: React.ReactNode;
}

export function AddContentMenu({ parentId, onFileSelected, trigger }: AddContentMenuProps) {
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [showNewLinkDialog, setShowNewLinkDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { toast } = useToast();

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
          label: "New Folder",
          icon: FolderPlus,
          action: () => setShowNewFolderDialog(true),
      },
      {
          label: "Upload File",
          icon: Upload,
          action: handleUploadClick,
      },
      {
          label: "Add Link",
          icon: LinkIcon,
          action: () => setShowNewLinkDialog(true),
      }
  ]

  return (
    <>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange}
        className="hidden" 
      />
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          {trigger || <Button className="rounded-xl"><Plus className="mr-2 h-4 w-4" />Add Content</Button>}
        </PopoverTrigger>
        <PopoverContent 
          className="w-56 p-0 border-slate-700 rounded-2xl bg-gradient-to-b from-slate-800/80 to-slate-900/70 backdrop-blur-lg shadow-lg shadow-blue-500/10" 
          align="end"
        >
            <div className="p-2 space-y-1">
              <p className="px-2 py-1 text-sm font-semibold text-slate-300">Create New</p>
              {menuItems.map((item) => (
                  <div 
                      key={item.label}
                      onClick={item.action}
                      className="flex items-center gap-3 p-2 rounded-lg text-sm text-slate-200 hover:bg-white/10 cursor-pointer transition-colors"
                  >
                      <item.icon className="h-4 w-4 text-slate-400" />
                      <span>{item.label}</span>
                  </div>
              ))}
          </div>
        </PopoverContent>
      </Popover>
      <NewFolderDialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog} onAddFolder={handleAddFolder} />
      <NewLinkDialog open={showNewLinkDialog} onOpenChange={setShowNewLinkDialog} onAddLink={handleAddLink} />
    </>
  );
}

    