'use client';
import { useState, useMemo } from 'react';
import type { UserProfile } from '@/stores/auth-store';
import { useCollection } from '@/firebase/firestore/use-collection';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, StickyNote } from 'lucide-react';
import { NoteCard } from './NoteCard';
import { NoteEditorDialog } from './NoteEditorDialog';
import { nanoid } from 'nanoid';
import { db } from '@/firebase';
import { doc, setDoc, serverTimestamp, deleteDoc, writeBatch } from 'firebase/firestore';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
};

const SortableNoteCard = ({ note, onEdit, onDelete }: { note: Note, onEdit: () => void, onDelete: () => void }) => {
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
                attributes={attributes}
                listeners={listeners}
            />
        </div>
    );
};


export const ProfileNotesSection = ({ user }: { user: UserProfile }) => {
  const { data: notes, loading } = useCollection<Note>(`users/${user.id}/notes`, {
    orderBy: ['order', 'asc'],
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
    const noteRef = doc(db, `users/${user.id}/notes`, finalId);
    
    const saveData: Omit<Note, 'id'> & { id?: string } = {
        ...noteToSave,
        updatedAt: serverTimestamp(),
    };
    
    if (isNewNote) {
        saveData.id = finalId;
        (saveData as any).createdAt = serverTimestamp();
    } else {
        delete saveData.id; // Don't write the ID inside the document
    }
    
    await setDoc(noteRef, saveData, { merge: true });

    setIsEditorOpen(false);
    setEditingNote(null);
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!user) return;
    const noteRef = doc(db, `users/${user.id}/notes`, noteId);
    await deleteDoc(noteRef);
  };
  
  const sensors = useSensors(useSensor(PointerSensor, {
      activationConstraint: {
          distance: 10,
      },
  }));
  
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
        const oldIndex = sortedNotes.findIndex((n) => n.id === active.id);
        const newIndex = sortedNotes.findIndex((n) => n.id === over.id);
        const newOrder = arrayMove(sortedNotes, oldIndex, newIndex);

        const batch = writeBatch(db);
        newOrder.forEach((note, index) => {
            const docRef = doc(db, `users/${user.id}/notes`, note.id);
            batch.update(docRef, { order: index });
        });
        await batch.commit();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sortedNotes.map(note => (
                    <SortableNoteCard
                      key={note.id}
                      note={note}
                      onEdit={() => handleEditNote(note)}
                      onDelete={() => handleDeleteNote(note.id)}
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
    </div>
  );
};
