
'use client';
import { useState, useEffect, useRef } from 'react';
import { useCollection } from '@/firebase/firestore/use-collection';
import { db } from '@/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { Plus, Check, Loader2, Bold, Italic, Underline, List, ListOrdered, Link as LinkIcon, Image as ImageIcon, Minus, Trash2, Edit, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';


export interface Note {
  id: string;
  content: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

const noteColors = [
    'bg-yellow-200/20 border-yellow-400/30',
    'bg-blue-200/20 border-blue-400/30',
    'bg-green-200/20 border-green-400/30',
    'bg-pink-200/20 border-pink-400/30',
    'bg-purple-200/20 border-purple-400/30',
    'bg-slate-700/50 border-slate-500/30'
];

const NoteCard = ({ note, onUpdate, onDelete }: { note: Note, onUpdate: (id: string, content: string, color: string) => void, onDelete: (id: string) => void }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(note.content);
    
    const handleSave = () => {
        onUpdate(note.id, editedContent, note.color);
        setIsEditing(false);
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className={cn("rounded-2xl p-4 flex flex-col h-64", note.color)}
        >
            {isEditing ? (
                 <Textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="flex-grow bg-transparent border-0 resize-none text-sm text-white no-scrollbar p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    autoFocus
                />
            ) : (
                <div className="flex-grow overflow-y-auto no-scrollbar prose prose-sm prose-invert text-white selectable">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
                </div>
            )}
            
            <div className="flex justify-end items-center mt-2 flex-shrink-0">
                {isEditing ? (
                    <Button size="sm" onClick={handleSave} className="h-8 rounded-lg">Save</Button>
                ) : (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                <MoreVertical size={16} />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onSelect={() => setIsEditing(true)}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                    <Palette className="mr-2 h-4 w-4" />
                                    <span>Change Color</span>
                                </DropdownMenuSubTrigger>
                                <DropdownMenuPortal>
                                <DropdownMenuSubContent>
                                    <div className="flex gap-2 p-2">
                                    {noteColors.map(colorClass => (
                                        <button key={colorClass} onClick={() => onUpdate(note.id, note.content, colorClass)} className={cn("w-6 h-6 rounded-full", colorClass.split(' ')[0])} />
                                    ))}
                                    </div>
                                </DropdownMenuSubContent>
                                </DropdownMenuPortal>
                            </DropdownMenuSub>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-400 focus:text-red-400 focus:bg-red-500/10">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>Delete</span>
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action will permanently delete this note.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => onDelete(note.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </motion.div>
    );
};

export const ProfileNotes = ({ userId }: { userId: string }) => {
    const { data: notes, loading } = useCollection<Note>(`users/${userId}/notes`, { orderBy: ['createdAt', 'desc'] });
    const { toast } = useToast();

    const handleAddNote = useCallback(async () => {
        try {
            await contentService.createNote(userId);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not create a new note.' });
        }
    }, [userId, toast]);

    const handleUpdateNote = useCallback(async (id: string, content: string, color: string) => {
        try {
            await contentService.updateNote(userId, id, { content, color });
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Error', description: 'Could not update the note.' });
        }
    }, [userId, toast]);
    
    const handleDeleteNote = useCallback(async (id: string) => {
        try {
            await contentService.deleteNote(userId, id);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the note.' });
        }
    }, [userId, toast]);

    return (
        <div className="space-y-4">
            <div className="text-right">
                <Button onClick={handleAddNote} className="rounded-full h-9">
                    <Plus className="mr-2 h-4 w-4" />
                    New Note
                </Button>
            </div>

            {loading && (
                <div className="flex justify-center items-center h-40">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
                </div>
            )}
            
            <AnimatePresence>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {notes?.map(note => (
                    <NoteCard key={note.id} note={note} onUpdate={handleUpdateNote} onDelete={handleDeleteNote} />
                ))}
                </div>
            </AnimatePresence>

            {!loading && notes?.length === 0 && (
                <div className="text-center py-10 border-2 border-dashed border-slate-800 rounded-2xl">
                    <p className="text-slate-400">You don't have any notes yet.</p>
                </div>
            )}
        </div>
    );
};

    