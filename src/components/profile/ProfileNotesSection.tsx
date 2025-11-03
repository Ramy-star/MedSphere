'use client';
import { useState, useMemo } from 'react';
import type { UserProfile } from '@/stores/auth-store';
import { useCollection } from '@/firebase/firestore/use-collection';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, StickyNote, Star } from 'lucide-react';
import { NoteCard } from './NoteCard';
import { NoteEditorDialog } from './NoteEditorDialog';
import { nanoid } from 'nanoid';
import { db } from '@/firebase';
import { doc, setDoc, serverTimestamp, deleteDoc, writeBatch, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

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
                attributes={attributes}
                listeners={listeners}
                onTogglePin={onTogglePin}
            />
        </div>
    );
};


export const ProfileNotesSection = ({ user }: { user: UserProfile }) => {
  const router = useRouter();
  const { toast } = useToast();
  
  // Fetch only pinned notes for the profile view
  const { data: pinnedNotes, loading } = useCollection<Note>(`users/${user.id}/profileNotes`, {
    where: ['pinned', '==', true],
    orderBy: ['order', 'asc'],
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!pinnedNotes || pinnedNotes.length === 0) {
    return (
        <div className="text-center py-8 sm:py-10 border-2 border-dashed border-slate-800 rounded-2xl">
            <StickyNote className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-slate-600" />
            <h3 className="mt-4 text-base sm:text-lg font-semibold text-white">No Pinned Notes</h3>
            <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-slate-400">
                You can pin important notes from the "My Notes" page to see them here.
            </p>
             <Button onClick={() => router.push('/notes')} className="mt-4 rounded-full h-9">
                Go to My Notes
            </Button>
        </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pinnedNotes.map(note => (
            <NoteCard
                key={note.id}
                note={note}
                onEdit={() => router.push('/notes')} // Redirect to edit
                onDelete={() => {}} // No delete from profile
                onTogglePin={() => {}} // No unpin from here to keep it simple
            />
        ))}
    </div>
  );
};
