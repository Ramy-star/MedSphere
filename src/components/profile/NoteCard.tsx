'use client';
import { Note } from './ProfileNotesSection';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type NoteCardProps = {
  note: Note;
  onEdit: () => void;
  onDelete: () => void;
};

export const NoteCard = ({ note, onEdit, onDelete }: NoteCardProps) => {
  return (
    <div
      className="group relative flex flex-col rounded-2xl p-4 border border-white/10"
      style={{ backgroundColor: note.color }}
    >
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={onEdit}>
          <Edit className="h-4 w-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-red-400 hover:bg-red-500/20 hover:text-red-300">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this note. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="prose prose-sm prose-invert max-w-none flex-1 overflow-y-auto no-scrollbar" style={{ color: 'white' }}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content}</ReactMarkdown>
      </div>
      <div className="text-right text-xs text-white/50 mt-2">
        {new Date(note.updatedAt).toLocaleDateString()}
      </div>
    </div>
  );
};
