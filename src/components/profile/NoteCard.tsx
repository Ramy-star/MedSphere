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
  attributes?: React.HTMLAttributes<HTMLDivElement>;
  listeners?: React.HTMLAttributes<HTMLDivElement>;
};

// Helper function to convert hex to rgba
const hexToRgba = (hex: string, alpha: number): string => {
  if (!/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    return hex; // return original color if not a valid hex
  }
  let c: any = hex.substring(1).split('');
  if (c.length === 3) {
    c = [c[0], c[0], c[1], c[1], c[2], c[2]];
  }
  c = '0x' + c.join('');
  return `rgba(${[(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',')},${alpha})`;
};


export const NoteCard = ({ note, onEdit, onDelete, attributes, listeners }: NoteCardProps) => {
  
  const isValidDate = (date: any): boolean => {
    if (!date) return false;
    if (typeof date.toDate === 'function') return true;
    if (typeof date === 'string' && !isNaN(new Date(date).getTime())) return true;
    if (date.seconds && typeof date.seconds === 'number') return true;
    return false;
  };

  const formatDateSafe = (date: any) => {
    if (!isValidDate(date)) return '...';
    const d = typeof date.toDate === 'function' ? date.toDate() : new Date(date.seconds ? date.seconds * 1000 : date);
    return format(d, 'MMM dd, yyyy');
  }

  const formattedDate = formatDateSafe(note.updatedAt);
  const firstPage = note.pages && note.pages.length > 0 ? note.pages[0] : null;

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-2xl p-4 border border-white/10 transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer"
      )}
      style={{ backgroundColor: hexToRgba(note.color, 0.95) }}
      onClick={onEdit}
      {...attributes} 
      {...listeners}
    >
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-black/20 text-white" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
          <Edit className="h-4 w-4" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-red-400 hover:bg-red-500/20 hover:text-red-300" onClick={(e) => e.stopPropagation()}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this note and all its pages. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={(e) => {e.stopPropagation(); onDelete();}} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div 
        className="prose prose-sm prose-invert max-w-none flex-1 overflow-hidden h-40"
      >
        <h3 className="font-bold text-lg text-white/90 truncate">{note.title}</h3>
        <div 
          className={cn("text-white/70 line-clamp-4")} 
          dir={firstPage?.content && /[\u0600-\u06FF]/.test(firstPage.content) ? 'rtl' : 'ltr'} 
          dangerouslySetInnerHTML={{ __html: firstPage?.content || '' }} 
        />
      </div>

      <div className="text-right text-xs text-white/50 mt-2 flex-shrink-0">
        {formattedDate}
      </div>
    </div>
  );
};
