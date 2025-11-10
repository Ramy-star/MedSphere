'use client';
import { useState, useMemo } from 'react';
import type { UserProfile } from '@/stores/auth-store';
import { useCollection } from '@/firebase/firestore/use-collection';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, StickyNote, Star, Eye } from 'lucide-react';
import { NoteCard } from './NoteCard';
import { db } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { FilePreviewModal } from '../FilePreviewModal';


export type Note = {
  id: string;
  title: string;
  content: string; // Simplified from pages array
  color: string;
  createdAt: any; 
  updatedAt: any; 
  order: number;
  pinned?: boolean;
};

export const ProfileNotesSection = ({ user }: { user: UserProfile }) => {
  const router = useRouter();
  const { toast } = useToast();
  const [viewingNote, setViewingNote] = useState<Note | null>(null);

  
  const { data: allNotes, loading } = useCollection<Note>(`users/${user.id}/profileNotes`, {
    orderBy: ['order', 'asc'],
  });

  const pinnedNotes = useMemo(() => {
    if (!allNotes) return [];
    return allNotes.filter(note => note.pinned === true);
  }, [allNotes]);


  const handleTogglePin = async (note: Note) => {
    const noteRef = doc(db, `users/${user.id}/profileNotes`, note.id);
    await updateDoc(noteRef, { pinned: !note.pinned });

    toast({
        title: 'Note Unpinned',
        description: `"${note.title}" has been unpinned from your profile.`,
    });
  };

  const handleViewNote = (note: Note) => {
    const syntheticContentItem = {
        id: note.id,
        name: note.title,
        type: 'NOTE',
        parentId: user?.id || null,
        metadata: {
            // Pass the entire simplified note structure
            quizData: JSON.stringify(note) 
        }
    };
    setViewingNote(syntheticContentItem as any);
  };


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
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pinnedNotes.map(note => (
              <NoteCard
                  key={note.id}
                  note={note}
                  onEdit={() => router.push(`/notes?edit=${note.id}`)}
                  onTogglePin={() => handleTogglePin(note)}
                  onView={() => handleViewNote(note)}
                  showPin
                  showView
              />
          ))}
      </div>
      {viewingNote && (
          <FilePreviewModal 
              item={viewingNote as any}
              onOpenChange={(isOpen) => !isOpen && setViewingNote(null)}
          />
      )}
    </>
  );
};
