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
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type NoteCardProps = {
  note: Note;
  onEdit: () => void;
  onDelete: () => void;
};

export const NoteCard = ({ note, onEdit, onDelete }: NoteCardProps) => {
  
  const isValidDate = (date: any): boolean => {
    if (!date) return false;
    // Firestore Timestamps have toDate(), ISO strings are parsed by new Date()
    return typeof date.toDate === 'function' || !isNaN(new Date(date).getTime());
  };

  const formattedDate = isValidDate(note.updatedAt)
    ? format(typeof note.updatedAt.toDate === 'function' ? note.updatedAt.toDate() : new Date(note.updatedAt), 'MMM dd, yyyy')
    : 'Saving...';


  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-2xl p-4 border border-white/10 transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer bg-opacity-80"
      )}
      style={{ backgroundColor: note.color }}
      onClick={onEdit}
    >
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-black/20 text-white" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
          <Edit className="h-4 w-4" />
        </Button>
        <AlertDialog onOpenChange={(e) => { if(e) e.stopPropagation(); }}>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-red-400 hover:bg-red-500/20 hover:text-red-300" onClick={(e) => e.stopPropagation()}>
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
              <AlertDialogAction onClick={(e) => {e.stopPropagation(); onDelete();}} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="prose prose-sm prose-invert max-w-none flex-1 overflow-hidden h-40">
        <div 
          className="line-clamp-[7]" // Limits the text to 7 lines
          dangerouslySetInnerHTML={{ __html: note.content }} 
        />
      </div>
      <div className="text-right text-xs text-white/50 mt-2 flex-shrink-0">
        {formattedDate}
      </div>
    </div>
  );
};
