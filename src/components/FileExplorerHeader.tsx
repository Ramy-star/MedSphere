
'use client';
import { ArrowRight, ArrowLeft, Plus } from 'lucide-react';
import { Breadcrumbs } from './breadcrumbs';
import type { ContentItem } from '@/lib/contentService';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FolderPlus, Upload } from 'lucide-react';
import { NewFolderDialog } from './new-folder-dialog';
import React, { useRef, useState } from 'react';
import { saveFile as saveFileToDb } from '@/lib/indexedDBService';
import { contentService } from '@/lib/contentService';


type AddContentMenuProps = {
  parentId: string | null;
  onContentAdded: () => void;
  trigger?: React.ReactNode;
}

function AddContentMenu({ parentId, onContentAdded, trigger }: AddContentMenuProps) {
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleAddFolder = async (folderName: string) => {
    await contentService.createFolder(parentId, folderName);
    onContentAdded();
    setPopoverOpen(false);
  };

  const handleUploadFile = async (file: File) => {
    const newFileItem = await contentService.uploadFile(parentId, { name: file.name, size: file.size, mime: file.type });
    await saveFileToDb(newFileItem.id, file);
    onContentAdded();
    setPopoverOpen(false);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleUploadFile(file);
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
    </>
  );
}


export default function FileExplorerHeader({ currentFolder, ancestors, onContentAdded }: { currentFolder?: ContentItem, ancestors?: ContentItem[], onContentAdded?: () => void }) {
  
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <Breadcrumbs ancestors={ancestors} />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => window.history.back()} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"><ArrowLeft size={16} /></button>
            <button onClick={() => window.history.forward()} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"><ArrowRight size={16} /></button>
          </div>
        </div>
      </div>
       {currentFolder && onContentAdded && (
        <div className="flex justify-end mt-4">
          <AddContentMenu parentId={currentFolder.id} onContentAdded={onContentAdded} />
        </div>
      )}
    </div>
  );
}
