'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Content } from '@/lib/contentService';
import { useCollection } from '@/firebase/firestore/use-collection';
import { ChevronRight, Folder as FolderIcon, Layers, Calendar, Loader2, File as FileIcon, FileText, FileImage, FileVideo, Music, FileSpreadsheet, Presentation, FileCode, Lightbulb, HelpCircle, FileCheck, Layers as LayersIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import { Link2Icon } from './icons/Link2Icon';
import Image from 'next/image';
import { allSubjectIcons } from '@/lib/file-data';
import { InteractiveExamIcon } from './icons/InteractiveExamIcon';
import { FlashcardIcon } from './icons/FlashcardIcon';


export type ActionType = 'select_source' | 'save_questions_md' | 'save_exam_md' | 'create_quiz' | 'create_exam' | 'create_flashcard' | 'move' | 'copy' | null;

type FolderSelectorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (item: Content) => void;
  actionType: ActionType;
  currentItemId?: string;
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
            if (!parent.children.some(child => child.id === node.id)) {
                parent.children.push(node);
            }
        } else if (item.parentId === null) {
            if (!roots.some(root => root.id === node.id)) {
              roots.push(node);
            }
        }
    });

    itemMap.forEach(node => {
        if (node.children) {
            node.children.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        }
    });
    
    roots.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    return roots;
}

const getIconForItem = (item: Content): { Icon: React.ElementType, color: string } => {
    if (item.metadata?.iconURL) {
        return { Icon: () => <Image src={item.metadata!.iconURL!} alt={item.name} width={20} height={20} className="w-5 h-5 object-cover rounded-sm shrink-0" />, color: '' };
    }

    if (item.type === 'LINK') return { Icon: Link2Icon, color: 'text-cyan-400' };
    if (item.type === 'INTERACTIVE_QUIZ') return { Icon: Lightbulb, color: 'text-yellow-400' };
    if (item.type === 'INTERACTIVE_EXAM') return { Icon: InteractiveExamIcon, color: '' };
    if (item.type === 'INTERACTIVE_FLASHCARD') return { Icon: FlashcardIcon, color: '' };
    if (item.type === 'LEVEL') return { Icon: Layers, color: 'text-blue-400' };
    if (item.type === 'SEMESTER') return { Icon: Calendar, color: 'text-green-400' };
    if (item.type === 'SUBJECT') {
        const SubjectIcon = (item.iconName && allSubjectIcons[item.iconName]) || FolderIcon;
        return { Icon: SubjectIcon, color: item.color || 'text-yellow-400' };
    }
    if (item.type === 'FOLDER') return { Icon: FolderIcon, color: 'text-yellow-400' };

    const mimeType = item.metadata?.mime;
    if (mimeType?.startsWith('image/')) return { Icon: FileImage, color: 'text-purple-400' };
    if (mimeType?.startsWith('video/')) return { Icon: FileVideo, color: 'text-red-400' };
    if (mimeType?.startsWith('audio/')) return { Icon: Music, color: 'text-orange-400' };
    if (mimeType === 'application/pdf') return { Icon: FileText, color: 'text-red-400' };
    if (mimeType === 'text/markdown') return { Icon: HelpCircle, color: 'text-red-400' };
    
    const extension = item.name.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'docx': case 'doc': return { Icon: FileText, color: 'text-blue-500' };
        case 'xlsx': case 'xls': return { Icon: FileSpreadsheet, color: 'text-green-500' };
        case 'pptx': case 'ppt': return { Icon: Presentation, color: 'text-orange-500' };
        case 'html': case 'js': case 'css': case 'tsx': case 'ts': return { Icon: FileCode, color: 'text-gray-400' };
        default: return { Icon: FileIcon, color: 'text-gray-400' };
    }
};

function FolderTree({ node, onSelect, selectedId, level = 0, actionType, currentItemId }: { node: TreeNode, onSelect: (item: Content) => void, selectedId: string | null, level?: number, actionType: ActionType | null, currentItemId?: string }) {
    const [isOpen, setIsOpen] = useState(false);

    const isSelectable = useMemo(() => {
        if (node.id === currentItemId) return false;

        if (actionType === null) { // For scope selection
            return node.type !== 'FILE' && node.type !== 'LINK';
        }
        
        switch (actionType) {
            case 'select_source':
                return node.type === 'FILE' && node.metadata?.mime === 'application/pdf';
            case 'move':
            case 'copy':
                return node.type !== 'FILE' && node.type !== 'LINK';
            case 'save_questions_md':
                return node.type === 'FOLDER' || (node.type === 'FILE' && node.metadata?.mime === 'text/markdown');
            case 'create_quiz':
                return node.type === 'FOLDER' || node.type === 'INTERACTIVE_QUIZ';
            case 'create_exam':
                return node.type === 'FOLDER' || node.type === 'INTERACTIVE_EXAM';
             case 'create_flashcard':
                return node.type === 'FOLDER' || node.type === 'INTERACTIVE_FLASHCARD';
            default:
                return true;
        }
    }, [actionType, node, currentItemId]);

    const hasVisibleChildren = node.children && node.children.length > 0;

    const handleNodeClick = () => {
        if (isSelectable) {
            onSelect(node);
        }
    };
    
    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (hasVisibleChildren) {
            setIsOpen(!isOpen);
        }
    };
    
    const { Icon, color } = getIconForItem(node);

    return (
        <div>
            <div
                onClick={handleNodeClick}
                className={cn(
                    "flex items-center justify-between p-2 rounded-lg group",
                    isSelectable ? "cursor-pointer" : "cursor-not-allowed",
                    selectedId === node.id ? "bg-blue-500/30 text-white" : isSelectable ? "hover:bg-white/10 text-slate-300" : "text-slate-500",
                )}
                style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
            >
                <div className="flex items-center gap-3 flex-1 overflow-hidden">
                   <button 
                     onClick={handleToggle}
                     className={cn("p-1 rounded-full", hasVisibleChildren ? "hover:bg-white/10" : "cursor-default")}
                    >
                     {hasVisibleChildren ? (
                        <ChevronRight className={cn("h-4 w-4 transition-transform", isOpen && "rotate-90")} />
                     ) : (
                        <div className="w-4 h-4" /> // Placeholder for alignment
                     )}
                   </button>
                   <Icon className={cn("w-5 h-5 shrink-0", color)} />
                   <span className="truncate">{node.name}</span>
                </div>
            </div>
            {isOpen && hasVisibleChildren && (
                <div className="mt-1">
                    {node.children!.map(child => (
                        <FolderTree key={child.id} node={child} onSelect={onSelect} selectedId={selectedId} level={level + 1} actionType={actionType} currentItemId={currentItemId} />
                    ))}
                </div>
            )}
        </div>
    );
}

export function FolderSelectorDialog({ open, onOpenChange, onSelect, actionType, currentItemId }: FolderSelectorDialogProps) {
  const { data: allItems, loading } = useCollection<Content>('content');
  const [selectedItem, setSelectedItem] = useState<Content | null>(null);

  const tree = useMemo(() => {
    if (!allItems) return [];
    if (actionType === 'select_source') {
        return buildTree(allItems);
    }
    const filteredItems = allItems.filter(item => {
        if (actionType === null) return item.type !== 'FILE' && item.type !== 'LINK'; // For scope selection
        return true;
    });
    return buildTree(filteredItems);
  }, [allItems, actionType]);
  
  const handleSelect = useCallback((item: Content) => {
    setSelectedItem(item);
  }, []);

  const handleConfirm = () => {
    if (selectedItem && actionType !== undefined) {
        onSelect(selectedItem);
    }
  };
  
  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
        setSelectedItem(null);
    }, 300);
  }

  const getDialogConfig = () => {
      switch(actionType){
          case 'select_source':
              return { title: 'Select Source File', buttonText: 'Select'};
          case 'move':
              return { title: 'Move to...', buttonText: 'Move Here' };
          case 'copy':
              return { title: 'Copy to...', buttonText: 'Copy Here' };
          case 'create_quiz':
          case 'create_exam':
          case 'create_flashcard':
          case 'save_questions_md':
          case 'save_exam_md':
              return { title: 'Select Destination', buttonText: 'Save Here' };
          default:
              return { title: 'Select Item', buttonText: 'Select' };
      }
  }
  
  const { title, buttonText } = getDialogConfig();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[90vw] max-w-lg p-0 border-slate-700 rounded-2xl bg-slate-900/70 backdrop-blur-xl shadow-lg text-white flex flex-col h-[70vh]">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden px-6">
            <ScrollArea className="h-full pr-4 -mr-4">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                    </div>
                ) : (
                    <div className="space-y-1">
                       {tree.map(node => (
                           <FolderTree key={node.id} node={node} onSelect={handleSelect} selectedId={selectedItem?.id || null} actionType={actionType} currentItemId={currentItemId} />
                       ))}
                    </div>
                )}
            </ScrollArea>
        </div>
        <DialogFooter className="p-6 pt-4 border-t border-slate-800">
          <Button type="button" variant="outline" className="rounded-xl" onClick={handleClose}>Cancel</Button>
          <Button type="button" className="rounded-xl" onClick={handleConfirm} disabled={!selectedItem}>
            {buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
