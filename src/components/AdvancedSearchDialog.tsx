
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
import { Input } from './ui/input';
import { Search, X, Loader2, Folder as FolderIcon, File as FileIcon, Layers, FileType, Telescope } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useDebounce } from 'use-debounce';
import { search as searchFlow } from '@/ai/flows/search-flow';
import { Content, contentService } from '@/lib/contentService';
import { useCollection } from '@/firebase/firestore/use-collection';
import { FileCard } from './FileCard';
import { useRouter } from 'next/navigation';
import { ScrollArea } from './ui/scroll-area';
import { Skeleton } from './ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useToast } from '@/hooks/use-toast';
import { FilePreviewModal } from './FilePreviewModal';
import { RenameDialog } from './RenameDialog';
import { ChangeIconDialog } from './ChangeIconDialog';
import { FolderSelectorDialog } from './FolderSelectorDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter as AlertDialogFooterComponent } from './ui/alert-dialog';
import { cn } from '@/lib/utils';
import { LayersIcon } from 'lucide-react';


type SearchFilters = {
    type: 'all' | 'lecture' | 'quiz' | 'exam' | 'flashcard';
    level: string | 'all';
};

const FileTypeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'lecture', label: 'Lecture' },
    { value: 'quiz', label: 'Quiz' },
    { value: 'exam', label: 'Exam' },
    { value: 'flashcard', label: 'Flashcard' },
];

export function AdvancedSearchDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
    const [query, setQuery] = useState('');
    const [debouncedQuery] = useDebounce(query, 300);
    const [results, setResults] = useState<Content[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const { data: allItems, loading: loadingAllItems } = useCollection<Content>('content');
    const router = useRouter();
    const { toast } = useToast();
    const dialogContentRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);


    // State for actions
    const [previewFile, setPreviewFile] = useState<Content | null>(null);
    const [itemToRename, setItemToRename] = useState<Content | null>(null);
    const [itemToMove, setItemToMove] = useState<Content | null>(null);
    const [itemToCopy, setItemToCopy] = useState<Content | null>(null);
    const [itemToDelete, setItemToDelete] = useState<Content | null>(null);
    const [showFolderSelector, setShowFolderSelector] = useState(false);
    const [currentAction, setCurrentAction] = useState<'move' | 'copy' | null>(null);

    const [filters, setFilters] = useState<SearchFilters>({
        type: 'all',
        level: 'all',
    });

    const levels = useMemo(() => {
        if (!allItems) return [];
        return allItems.filter(item => item.type === 'LEVEL').sort((a,b) => (a.order || 0) - (b.order || 0));
    }, [allItems]);
    
    const selectedLevelName = useMemo(() => {
        if (filters.level === 'all') return 'All Levels';
        return levels.find(l => l.id === filters.level)?.name || 'All Levels';
    }, [filters.level, levels]);

    const selectedTypeName = useMemo(() => {
        return FileTypeOptions.find(opt => opt.value === filters.type)?.label || 'All Types';
    }, [filters.type]);


    const performSearch = useCallback(async () => {
        if (!debouncedQuery.trim() && filters.type === 'all' && filters.level === 'all') {
            setResults([]);
            setIsSearching(false);
            return;
        }

        if (!allItems || loadingAllItems) return;
        
        setIsSearching(true);
        const searchResults = await searchFlow(debouncedQuery, allItems, filters);
        setResults(searchResults);
        setIsSearching(false);
    }, [debouncedQuery, allItems, filters, loadingAllItems]);

    useEffect(() => {
        performSearch();
    }, [performSearch]);

    const handleClose = () => {
        onOpenChange(false);
        setTimeout(() => {
            setQuery('');
            setResults([]);
            setFilters({ type: 'all', level: 'all' });
        }, 300);
    };

    const handleFileClick = (item: Content) => {
        setPreviewFile(item);
    };

    const handleRename = useCallback(async (newName: string) => {
        if (!itemToRename) return;
        await contentService.rename(itemToRename.id, newName);
        toast({ title: "Renamed", description: `"${itemToRename.name}" was renamed to "${newName}".` });
        setItemToRename(null);
    }, [itemToRename, toast]);

    const handleDelete = useCallback(async () => {
        if (!itemToDelete) return;
        await contentService.delete(itemToDelete.id);
        toast({ title: "Deleted", description: `"${itemToDelete.name}" has been deleted.` });
        setItemToDelete(null);
    }, [itemToDelete, toast]);

    const handleToggleVisibility = useCallback(async (item: Content) => {
        await contentService.toggleVisibility(item.id);
        const isHidden = !item.metadata?.isHidden;
        toast({
            title: `Item ${isHidden ? 'Hidden' : 'Visible'}`,
            description: `"${item.name}" is now ${isHidden ? 'hidden from other users' : 'visible to everyone'}.`
        });
    }, [toast]);

    const handleFolderSelect = useCallback(async (folder: Content) => {
        const itemToProcess = currentAction === 'move' ? itemToMove : itemToCopy;
        if (!itemToProcess || !currentAction) return;

        try {
            if (currentAction === 'move') {
                await contentService.move(itemToProcess.id, folder.id);
                toast({ title: "Item Moved", description: `Moved "${itemToProcess.name}" successfully.` });
            } else {
                await contentService.copy(itemToProcess, folder.id);
                toast({ title: "Item Copied", description: `Copied "${itemToProcess.name}" successfully.` });
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: `Error ${currentAction === 'move' ? 'Moving' : 'Copying'} Item`,
                description: error.message || 'An unknown error occurred.',
            });
        } finally {
            setShowFolderSelector(false);
            setItemToMove(null);
            setItemToCopy(null);
            setCurrentAction(null);
        }
    }, [currentAction, itemToCopy, itemToMove, toast]);


    return (
        <>
            <Dialog open={open} onOpenChange={handleClose}>
                <DialogContent 
                    ref={dialogContentRef}
                    className="max-w-3xl h-[80vh] flex flex-col p-0 gap-0 rounded-2xl bg-gradient-to-br from-slate-900/80 to-green-950/80 backdrop-blur-xl text-white border-0"
                >
                    <DialogHeader className="p-4 border-b border-white/10 flex-row items-center">
                        <Search className={cn("h-5 w-5 transition-all duration-300", (isFocused || query) ? 'text-white -rotate-90' : 'text-slate-400')} />
                        <Input
                            placeholder="Search content..."
                            className="bg-transparent border-0 text-base h-auto p-0 pl-2 focus-visible:ring-0 focus-visible:ring-offset-0"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            autoFocus
                        />
                         <DialogTitle className="sr-only">Advanced Search</DialogTitle>
                         <DialogDescription className="sr-only">Search for files and folders with advanced filters.</DialogDescription>
                    </DialogHeader>

                    <div className="p-3 border-b border-white/10 flex flex-wrap items-center gap-2">
                         <Select value={filters.level} onValueChange={(value) => setFilters(f => ({ ...f, level: value }))}>
                            <SelectTrigger className="w-auto h-8 rounded-full border-white/10 bg-black/20 hover:bg-white/10 text-slate-300 gap-2 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                                <LayersIcon className="h-4 w-4 text-blue-400"/>
                                <SelectValue asChild>
                                    <span className="truncate">{selectedLevelName}</span>
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent container={dialogContentRef.current}>
                                <SelectItem value="all">All Levels</SelectItem>
                                {levels.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={filters.type} onValueChange={(value) => setFilters(f => ({ ...f, type: value as SearchFilters['type'] }))}>
                            <SelectTrigger className="w-auto h-8 rounded-full border-white/10 bg-black/20 hover:bg-white/10 text-slate-300 gap-2 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                                <FileType className="h-4 w-4 text-green-400"/>
                                <SelectValue asChild>
                                    <span className="truncate">{selectedTypeName}</span>
                                </SelectValue>
                            </SelectTrigger>
                             <SelectContent container={dialogContentRef.current}>
                                {FileTypeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <ScrollArea className="flex-1 overflow-y-auto no-scrollbar">
                        <div className="p-2 space-y-0.5">
                            {(isSearching || loadingAllItems) && !results.length && (debouncedQuery.trim() || filters.level !== 'all' || filters.type !== 'all') ? (
                                <div className="space-y-2 p-2">
                                    <Skeleton className="h-12 w-full" />
                                    <Skeleton className="h-12 w-full" />
                                    <Skeleton className="h-12 w-full" />
                                </div>
                            ) : results.length > 0 ? (
                                results.map(item => (
                                    <FileCard
                                        key={item.id}
                                        item={item}
                                        onFileClick={() => handleFileClick(item)}
                                        onRename={() => setItemToRename(item)}
                                        onDelete={() => setItemToDelete(item)}
                                        onMove={() => { setItemToMove(item); setCurrentAction('move'); setShowFolderSelector(true); }}
                                        onCopy={() => { setItemToCopy(item); setCurrentAction('copy'); setShowFolderSelector(true); }}
                                        onToggleVisibility={() => handleToggleVisibility(item)}
                                        showDragHandle={false}
                                    />
                                ))
                            ) : (
                                <div className="text-center text-slate-400 py-10">
                                    <p>{debouncedQuery || filters.type !== 'all' || filters.level !== 'all' ? 'No results found.' : 'Start typing to search.'}</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    <DialogFooter className="p-2 border-t border-white/10 flex-row justify-between items-center text-xs text-slate-500">
                        <p className="pl-1 mb-0.5">{results.length} result(s)</p>
                        <div className='flex items-center gap-1.5 mb-0.5'>
                            <Telescope className='w-3 h-3 text-slate-400' />
                            <span>Powered by MedSphere Advanced Search</span>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <FilePreviewModal
                item={previewFile}
                onOpenChange={(isOpen) => !isOpen && setPreviewFile(null)}
            />
            <RenameDialog
                item={itemToRename}
                onOpenChange={(isOpen) => !isOpen && setItemToRename(null)}
                onRename={handleRename}
            />
             <AlertDialog open={!!itemToDelete} onOpenChange={(isOpen) => !isOpen && setItemToDelete(null)}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete "{itemToDelete?.name}". This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooterComponent>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                  </AlertDialogFooterComponent>
                </AlertDialogContent>
            </AlertDialog>
            <FolderSelectorDialog
              open={showFolderSelector}
              onOpenChange={setShowFolderSelector}
              onSelect={handleFolderSelect}
              actionType={currentAction}
              currentItemId={itemToMove?.id || itemToCopy?.id}
            />
        </>
    );
}

    