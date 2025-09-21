
'use client';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { FolderPlus, Plus, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
    {
        label: "New Folder",
        icon: FolderPlus,
        action: () => console.log("New Folder clicked"),
    },
    {
        label: "Upload File",
        icon: Upload,
        action: () => console.log("Upload file clicked"),
    }
]

export function AddContentMenu() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button className="rounded-xl">
          <Plus className="mr-2 h-4 w-4" />
          Add Content
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0 glass-card border-slate-700/50" align="end">
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
  );
}
