'use client';
import { useState, useMemo } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useCollection } from '@/firebase/firestore/use-collection';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, StickyNote } from 'lucide-react';
import { NoteCard } from '@/components/profile/NoteCard';
import { NoteEditorDialog } from '@/components/profile/NoteEditorDialog';
import { nanoid } from 'nanoid';
import { db } from '@/firebase';
import { doc, setDoc, serverTimestamp, deleteDoc, writeBatch, updateDoc } from 'firebase/firestore';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

export type NotePage = {
  id: string;
  title: string;
  content: string;
}

export type Note = {
  id: string;
  title: string;
  pages: NotePage[];
  color: string;
  createdAt: any; 
  updatedAt: any; 
  order: number;
  pinned?: boolean;
};

const SortableNoteCard = ({ note, onEdit, onDelete, onTogglePin }: { note: Note, onEdit: () => void, onDelete: () => void, onTogglePin: () => void }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: note.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 1 : 'auto',
    };

    return (
        <div ref={setNodeRef} style={style}>
            <NoteCard
                note={note}
                onEdit={onEdit}
                onDelete={onDelete}
                onTogglePin={onTogglePin}
                attributes={attributes}
                listeners={listeners}
            />
        </div>
    );
};


export default function NotesPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  
  const { data: notes, loading } = useCollection<Note>(user ? `users/${user.id}/profileNotes` : '', {
    orderBy: ['order', 'asc'],
    disabled: !user
  });

  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  
  const sortedNotes = useMemo(() => notes || [], [notes]);

  const handleNewNote = () => {
    const newPageId = nanoid();
    setEditingNote({
      id: `temp_${nanoid()}`,
      title: 'Untitled Note',
      pages: [{ id: newPageId, title: 'Page 1', content: '' }],
      color: '#282828',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      order: sortedNotes.length,
      pinned: false,
    });
    setIsEditorOpen(true);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setIsEditorOpen(true);
  };

  const handleSaveNote = async (noteToSave: Note) => {
    if (!user) return;
    const isNewNote = noteToSave.id.startsWith('temp_');
    const finalId = isNewNote ? nanoid() : noteToSave.id;
    const noteRef = doc(db, `users/${user.id}/profileNotes`, finalId);
    
    const saveData: Omit<Note, 'id'> & { id?: string } = {
        ...noteToSave,
        updatedAt: serverTimestamp(),
    };
    
    if (isNewNote) {
        saveData.id = finalId;
        (saveData as any).createdAt = serverTimestamp();
    } else {
        delete saveData.id;
    }
    
    await setDoc(noteRef, saveData, { merge: true });

    setIsEditorOpen(false);
    setEditingNote(null);
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!user) return;
    const noteRef = doc(db, `users/${user.id}/profileNotes`, noteId);
    await deleteDoc(noteRef);
  };

  const handleTogglePin = async (noteId: string) => {
    if (!user) return;
    const note = sortedNotes.find(n => n.id === noteId);
    if (!note) return;

    const noteRef = doc(db, `users/${user.id}/profileNotes`, noteId);
    await updateDoc(noteRef, { pinned: !note.pinned });

    toast({
        title: note.pinned ? 'Note Unpinned' : 'Note Pinned',
        description: `"${note.title}" has been ${note.pinned ? 'unpinned from' : 'pinned to'} your profile.`,
    });
  };
  
  const sensors = useSensors(useSensor(PointerSensor, {
      activationConstraint: {
          distance: 10,
      },
  }));
  
  const handleDragEnd = async (event: DragEndEvent) => {
    if (!user) return;
    const { active, over } = event;
    if (over && active.id !== over.id) {
        const oldIndex = sortedNotes.findIndex((n) => n.id === active.id);
        const newIndex = sortedNotes.findIndex((n) => n.id === over.id);
        const newOrder = arrayMove(sortedNotes, oldIndex, newIndex);

        const batch = writeBatch(db);
        newOrder.forEach((note, index) => {
            const docRef = doc(db, `users/${user.id}/profileNotes`, note.id);
            batch.update(docRef, { order: index });
        });
        await batch.commit();
    }
  };

  if (!user) {
    return <div className="flex items-center justify-center h-full"><p>Please log in to see your notes.</p></div>
  }

  return (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 sm:p-6"
    >
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">My Notes</h1>
        <Button onClick={handleNewNote} className="rounded-full h-9">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Note
        </Button>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
        </div>
      )}

      {!loading && sortedNotes.length === 0 && (
        <div className="text-center py-10 border-2 border-dashed border-slate-800 rounded-2xl">
          <StickyNote className="mx-auto h-12 w-12 text-slate-600" />
          <h3 className="mt-4 text-lg font-semibold text-white">No Notes Yet</h3>
          <p className="mt-2 text-sm text-slate-400">Click "Add Note" to start jotting down your thoughts.</p>
        </div>
      )}

      {!loading && sortedNotes.length > 0 && (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext items={sortedNotes.map(n => n.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {sortedNotes.map(note => (
                    <SortableNoteCard
                      key={note.id}
                      note={note}
                      onEdit={() => handleEditNote(note)}
                      onDelete={() => handleDeleteNote(note.id)}
                      onTogglePin={() => handleTogglePin(note.id)}
                    />
                  ))}
                </div>
            </SortableContext>
        </DndContext>
      )}

      <NoteEditorDialog
        open={isEditorOpen}
        onOpenChange={(isOpen) => {
            if (!isOpen) setEditingNote(null);
            setIsEditorOpen(isOpen);
        }}
        note={editingNote}
        onSave={handleSaveNote}
      />
    </motion.div>
  );
};
