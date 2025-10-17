
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Content } from '@/lib/contentService';
import { useCollection } from '@/firebase/firestore/use-collection';
import { ChevronRight, Folder as FolderIcon, Layers, Calendar, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';

type FolderSelectorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectFolder: (folderId: string) => void;
};

type TreeNode = Content & { children?: TreeNode[] };

function buildTree(items: Content[]): TreeNode[] {
    const itemMap = new Map<string, TreeNode>(items.map(item => [item.id, { ...item, children: [] }]));
    const roots: TreeNode[] = [];

    items.forEach(item => {
        const node = itemMap.get(item.id)!;
        if (item.parentId && itemMap.has(item.parentId)) {
            const parent = itemMap.get(item.parentId)!;
            if (!parent.children) parent.children = [];
            parent.children.push(node);
        } else {
            roots.push(node);
        }
    });

    // Sort children by 'order' property
    itemMap.forEach(node => {
        if (node.children) {
            node.children.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        }
    });
    
    // Sort roots as well
    roots.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    return roots;
}

const getIconForType = (type: Content['type']) => {
    switch (type) {
        case 'LEVEL':
            return <Layers className="h-5 w-5 text-blue-400" />;
        case 'SEMESTER':
            return <Calendar className="h-5 w-5 text-green-400" />;
        case 'SUBJECT':
        case 'FOLDER':
        default:
            return <FolderIcon className="h-5 w-5 text-yellow-400" />;
    }
};

function FolderTree({ node, onSelect, selectedId, level = 0 }: { node: TreeNode, onSelect: (id: string, type: string) => void, selectedId: string | null, level?: number }) {
    const [isOpen, setIsOpen] = useState(false);
    const isSelectable = node.type === 'FOLDER' || node.type === 'SUBJECT' || node.type === 'SEMESTER';

    const handleNodeClick = () => {
        if (isSelectable) {
            onSelect(node.id, node.type);
        }
        if (node.children && node.children.length > 0) {
            setIsOpen(!isOpen);
        }
    };

    return (
        <div>
            <div
                onClick={handleNodeClick}
                className={cn(
                    "flex items-center justify-between p-2 rounded-lg cursor-pointer",
                    selectedId === node.id ? "bg-blue-500/30 text-white" : "hover:bg-white/10 text-slate-300",
                )}
                style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
            >
                <div className="flex items-center gap-3">
                    {getIconForType(node.type)}
                    <span>{node.name}</span>
                </div>
                {node.children && node.children.length > 0 && (
                    <ChevronRight className={cn("h-4 w-4 transition-transform", isOpen && "rotate-90")} />
                )}
            </div>
            {isOpen && node.children && (
                <div className="mt-1">
                    {node.children.map(child => (
                        <FolderTree key={child.id} node={child} onSelect={onSelect} selectedId={selectedId} level={level + 1} />
                    ))}
                </div>
            )}
        </div>
    );
}

export function FolderSelectorDialog({ open, onOpenChange, onSelectFolder }: FolderSelectorDialogProps) {
  const { data: allItems, loading } = useCollection<Content>('content');
  const [selectedFolder, setSelectedFolder] = useState<{ id: string, type: string } | null>(null);

  const tree = useMemo(() => {
    if (!allItems) return [];
    // We only want to show folders, not files, in the selector
    const folderItems = allItems.filter(item => item.type !== 'FILE' && item.type !== 'LINK');
    return buildTree(folderItems);
  }, [allItems]);
  
  const handleSelect = useCallback((id: string, type: string) => {
    setSelectedFolder({ id, type });
  }, []);

  const handleConfirm = () => {
    if (selectedFolder) {
      onSelectFolder(selectedFolder.id);
    }
  };
  
  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
        setSelectedFolder(null);
    }, 300);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[90vw] max-w-lg p-0 border-slate-700 rounded-2xl bg-slate-900/70 backdrop-blur-xl shadow-lg text-white flex flex-col">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Select Destination</DialogTitle>
          <DialogDescription>
            Choose a folder to save the new file in.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden px-6">
            <ScrollArea className="h-96 pr-4 -mr-4">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                    </div>
                ) : (
                    <div className="space-y-1">
                       {tree.map(node => (
                           <FolderTree key={node.id} node={node} onSelect={handleSelect} selectedId={selectedFolder?.id || null} />
                       ))}
                    </div>
                )}
            </ScrollArea>
        </div>
        <DialogFooter className="p-6 pt-4 border-t border-slate-800">
          <Button type="button" variant="outline" className="rounded-xl" onClick={handleClose}>Cancel</Button>
          <Button type="button" className="rounded-xl" onClick={handleConfirm} disabled={!selectedFolder}>
            Save Here
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

