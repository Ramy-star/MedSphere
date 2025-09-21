
'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { FolderPlus, Plus, Upload } from 'lucide-react';

export function AddContentMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="rounded-xl">
          <Plus className="mr-2 h-4 w-4" />
          Add Content
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 glass-card bg-slate-900/80 backdrop-blur-lg border-slate-700">
        <DropdownMenuLabel>Create New</DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-700" />
        <DropdownMenuItem>
          <FolderPlus className="mr-2 h-4 w-4" />
          <span>New Folder</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Upload className="mr-2 h-4 w-4" />
          <span>Upload File</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
