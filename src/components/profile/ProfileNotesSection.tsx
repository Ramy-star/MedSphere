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
import { doc, writeBatch, serverTimestamp, deleteDoc } from 'firebase/firestore';

export type Note = {
  id: string;
  content: string;
  color: string;
  createdAt: string;
  updatedAt: string;
};

export const ProfileNotesSection = ({ user }: { user: UserProfile }) => {
  const { data: notes, loading } = useCollection<Note>(`users/${user.id}/notes`, {
    orderBy: ['createdAt', 'desc'],
  });

  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const handleNewNote = () => {
    setEditingNote({
      id: `temp_${nanoid()}`, // Temporary ID for new notes
      content: '## New Note\n\nStart writing here...',
      color: '#282828', // Default color
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setIsEditorOpen(true);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setIsEditorOpen(true);
  };

  const handleSaveNote = async (noteToSave: Note) => {
    if (!user) return;
    const finalId = noteToSave.id.startsWith('temp_') ? nanoid() : noteToSave.id;
    const noteRef = doc(db, `users/${user.id}/notes`, finalId);
    
    const saveData = {
        ...noteToSave,
        id: finalId, // ensure the final ID is set
        updatedAt: serverTimestamp(),
        createdAt: noteToSave.createdAt || serverTimestamp(), // only set createdAt if it's a new note
    };
    if (noteToSave.id.startsWith('temp_')) {
        (saveData as any).createdAt = serverTimestamp();
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

      {!loading && notes?.length === 0 && (
        <div className="text-center py-10 border-2 border-dashed border-slate-800 rounded-2xl">
          <StickyNote className="mx-auto h-12 w-12 text-slate-600" />
          <h3 className="mt-4 text-lg font-semibold text-white">No Notes Yet</h3>
          <p className="mt-2 text-sm text-slate-400">Click "Add Note" to start jotting down your thoughts.</p>
        </div>
      )}

      {!loading && notes && notes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={() => handleEditNote(note)}
              onDelete={() => handleDeleteNote(note.id)}
            />
          ))}
        </div>
      )}

      <NoteEditorDialog
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        note={editingNote}
        onSave={handleSaveNote}
      />
    </div>
  );
};
