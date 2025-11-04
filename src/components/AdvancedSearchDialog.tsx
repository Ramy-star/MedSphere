
'use client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Search, X } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useDebounce } from 'use-debounce';
import { search as searchFlow } from '@/ai/flows/search-flow';
import { Content, contentService } from '@/lib/contentService';
import { useCollection } from '@/firebase/firestore/use-collection';
import { FileCard } from './FileCard';
import { FolderCard } from './FolderCard';
import { useRouter } from 'next/navigation';
import { ScrollArea } from './ui/scroll-area';
import { Skeleton } from './ui/skeleton';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { DateRangePicker } from './ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { addDays } from 'date-fns';

type SearchFilters = {
    type: 'all' | 'file' | 'folder' | 'link' | 'quiz' | 'exam' | 'flashcard';
    subject: string | 'all';
    dateRange?: DateRange;
};

const FileTypeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'file', label: 'File' },
    { value: 'folder', label: 'Folder' },
    { value: 'link', label: 'Link' },
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

    const [filters, setFilters] = useState<SearchFilters>({
        type: 'all',
        subject: 'all',
    });

    const subjects = useMemo(() => {
        if (!allItems) return [];
        return allItems.filter(item => item.type === 'SUBJECT');
    }, [allItems]);

    const performSearch = useCallback(async () => {
        if (!debouncedQuery && filters.type === 'all' && filters.subject === 'all' && !filters.dateRange) {
            setResults([]);
            return;
        }

        setIsSearching(true);
        if (!allItems) {
            setIsSearching(false);
            return;
        }

        // The search flow is client-side, so we can pass all items to it.
        // For a server-side search, this would be an API call.
        const searchResults = await searchFlow(debouncedQuery, allItems, filters);
        setResults(searchResults);
        setIsSearching(false);
    }, [debouncedQuery, allItems, filters]);

    useEffect(() => {
        performSearch();
    }, [performSearch]);

    const handleClose = () => {
        onOpenChange(false);
        // Reset state after a delay to allow for exit animation
        setTimeout(() => {
            setQuery('');
            setResults([]);
            setFilters({ type: 'all', subject: 'all' });
        }, 300);
    };

    const handleItemClick = (item: Content) => {
        const path = item.type === 'FOLDER' || item.type === 'SUBJECT' || item.type === 'SEMESTER' || item.type === 'LEVEL'
            ? `/folder/${item.id}`
            : `/`; // Files will open in preview, but we need a background route
        router.push(path);
        handleClose();
        // You would typically have a global state to open the file preview modal here
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-4 border-b border-white/10 flex-row items-center">
                    <Search className="h-5 w-5 text-slate-400" />
                    <Input
                        placeholder="Type a command or search..."
                        className="bg-transparent border-0 text-base h-auto p-0 pl-2 focus-visible:ring-0 focus-visible:ring-offset-0"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoFocus
                    />
                </DialogHeader>

                <div className="p-4 border-b border-white/10 flex flex-wrap items-center gap-3">
                    <Select value={filters.type} onValueChange={(value) => setFilters(f => ({ ...f, type: value as SearchFilters['type'] }))}>
                        <SelectTrigger className="w-[150px] h-8 rounded-full">
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                            {FileTypeOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <Select value={filters.subject} onValueChange={(value) => setFilters(f => ({ ...f, subject: value }))}>
                        <SelectTrigger className="w-[180px] h-8 rounded-full">
                            <SelectValue placeholder="Subject" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Subjects</SelectItem>
                            {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    
                    <DateRangePicker 
                      date={filters.dateRange}
                      onDateChange={(range) => setFilters(f => ({...f, dateRange: range}))}
                    />

                </div>

                <ScrollArea className="flex-1 overflow-y-auto">
                    <div className="p-4 space-y-2">
                        {isSearching && (
                            <div className="space-y-2">
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                            </div>
                        )}
                        {!isSearching && results.length === 0 && (
                            <div className="text-center text-slate-400 py-10">
                                <p>{debouncedQuery ? 'No results found.' : 'Start typing to search.'}</p>
                            </div>
                        )}
                        {!isSearching && results.map(item => (
                            <div key={item.id} onClick={() => handleItemClick(item)} className="cursor-pointer">
                                {item.type === 'FILE' || item.type === 'LINK' || item.type === 'INTERACTIVE_QUIZ' || item.type === 'INTERACTIVE_EXAM' || item.type === 'INTERACTIVE_FLASHCARD' ? (
                                    <FileCard item={item} onFileClick={() => {}} onRename={() => {}} onDelete={() => {}} onMove={()=>{}} onCopy={()=>{}} onToggleVisibility={()=>{}} showDragHandle={false} />
                                ) : (
                                    <FolderCard item={item} displayAs="list" onClick={() => {}} onRename={() => {}} onDelete={() => {}} onIconChange={()=>{}} onMove={()=>{}} onCopy={()=>{}} onToggleVisibility={()=>{}} />
                                )}
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <DialogFooter className="p-2 border-t border-white/10 text-xs text-slate-500 justify-start">
                    <p>Powered by MedSphere Search</p>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
