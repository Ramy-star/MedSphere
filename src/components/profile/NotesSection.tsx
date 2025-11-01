'use client';
import { useState, useEffect, useRef } from 'react';
import { useCollection } from '@/firebase/firestore/use-collection';
import { db } from '@/firebase';
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { Plus, Check, Loader2, Bold, Italic, Underline, List, ListOrdered, Link as LinkIcon, Image as ImageIcon, Minus, Trash2, Edit, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Note {
  id: string;
  content: string;
  color: string;
  createdAt: any;
  order: number;
}

const NOTE_COLORS = [
  '#282828', // Dark Gray
  '#402323', // Dark Red
  '#433422', // Dark Orange
  '#444026', // Dark Yellow
  '#2a3b2c', // Dark Green
  '#243a3a', // Dark Teal
  '#253342', // Dark Blue
  '#382a44', // Dark Purple
];


function RichTextEditor({ content, onChange }: { content: string, onChange: (newContent: string) => void }) {
    const editorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== content) {
            editorRef.current.innerHTML = content;
        }
    }, [content]);

    const handleInput = () => {
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };
    
    const execCmd = (cmd: string, value?: string) => {
        document.execCommand(cmd, false, value);
        editorRef.current?.focus();
        handleInput();
    }
    
    const handleLink = () => {
        const url = prompt("Enter the URL:");
        if (url) execCmd('createLink', url);
    }
    
    const handleImage = () => {
        const url = prompt("Enter the Image URL:");
        if (url) execCmd('insertImage', url);
    }


    return (
        <div>
            <div className="flex flex-wrap gap-1 p-2 bg-slate-800/50 rounded-t-lg border-b border-slate-700">
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onMouseDown={e => {e.preventDefault(); execCmd('bold')}}><Bold size={16}/></Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onMouseDown={e => {e.preventDefault(); execCmd('italic')}}><Italic size={16}/></Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onMouseDown={e => {e.preventDefault(); execCmd('underline')}}><Underline size={16}/></Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onMouseDown={e => {e.preventDefault(); execCmd('insertUnorderedList')}}><List size={16}/></Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onMouseDown={e => {e.preventDefault(); execCmd('insertOrderedList')}}><ListOrdered size={16}/></Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onMouseDown={e => {e.preventDefault(); handleLink()}}><LinkIcon size={16}/></Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onMouseDown={e => {e.preventDefault(); handleImage()}}><ImageIcon size={16}/></Button>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onMouseDown={e => {e.preventDefault(); execCmd('insertHorizontalRule')}}><Minus size={16}/></Button>
            </div>
            <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                className="prose prose-sm prose-invert max-w-none p-4 h-48 overflow-y-auto focus:outline-none"
                style={{minHeight: '12rem'}}
            />
        </div>
    )
}

function NoteCard({ note, onUpdate, onDelete }: { note: Note, onUpdate: (id: string, updates: Partial<Note>) => void, onDelete: (id: string) => void }) {
    const [content, setContent] = useState(note.content);
    const [color, setColor] = useState(note.color);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        setContent(note.content);
        setColor(note.color);
    }, [note]);

    const handleSave = () => {
        onUpdate(note.id, { content, color });
        setIsEditing(false);
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="rounded-2xl border border-slate-700 overflow-hidden shadow-lg"
            style={{ backgroundColor: color }}
        >
            <div className="p-4 relative">
                {isEditing ? (
                    <RichTextEditor content={content} onChange={setContent} />
                ) : (
                    <div
                        className="prose prose-sm prose-invert max-w-none h-48 overflow-y-auto"
                        dangerouslySetInnerHTML={{ __html: content }}
                    />
                )}
                <div className="absolute top-2 right-2 flex items-center gap-1">
                    {isEditing ? (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-green-400" onClick={handleSave}>
                            <Check size={18} />
                        </Button>
                    ) : (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsEditing(true)}>
                            <Edit size={16} />
                        </Button>
                    )}
                     <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-2">
                            <div className="flex gap-2">
                                {NOTE_COLORS.map(c => (
                                    <button
                                        key={c}
                                        className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                                        style={{ backgroundColor: c, borderColor: color === c ? '#3b82f6' : 'transparent' }}
                                        onClick={() => {
                                            setColor(c);
                                            if (!isEditing) onUpdate(note.id, { color: c });
                                        }}
                                    />
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => onDelete(note.id)}>
                        <Trash2 size={16} />
                    </Button>
                </div>
            </div>
        </motion.div>
    );
}

export function NotesSection({ userId }: { userId: string }) {
    const { data: notes, loading } = useCollection<Note>(`users/${userId}/notes`, { orderBy: ['order', 'asc'] });
    
    const handleAddNote = async () => {
        const notesCollection = collection(db, `users/${userId}/notes`);
        const newOrder = notes ? notes.length : 0;
        await addDoc(notesCollection, {
            content: 'New Note',
            color: '#282828',
            createdAt: serverTimestamp(),
            order: newOrder
        });
    };

    const handleUpdateNote = async (id: string, updates: Partial<Note>) => {
        const noteRef = doc(db, `users/${userId}/notes`, id);
        await updateDoc(noteRef, updates);
    };

    const handleDeleteNote = async (id: string) => {
        await deleteDoc(doc(db, `users/${userId}/notes`, id));
        // Re-order remaining notes
        const remainingNotes = notes?.filter(n => n.id !== id) || [];
        const batch = writeBatch(db);
        remainingNotes.forEach((note, index) => {
            const docRef = doc(db, `users/${userId}/notes`, note.id);
            batch.update(docRef, { order: index });
        });
        await batch.commit();
    };

    if (loading && !notes) {
        return <div className="h-20 w-full rounded-lg bg-slate-800/50 animate-pulse" />;
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                    {notes?.map(note => (
                        <NoteCard key={note.id} note={note} onUpdate={handleUpdateNote} onDelete={handleDeleteNote} />
                    ))}
                </AnimatePresence>
            </div>

            <Button onClick={handleAddNote} variant="outline" className="w-full border-dashed hover:bg-slate-800/50 hover:border-slate-600">
                <Plus className="mr-2" size={16} />
                Add Note
            </Button>
        </div>
    );
}
