'use client';
import { Note, NotePage } from './ProfileNotesSection';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Star, Eye } from 'lucide-react';
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
import { format, parseISO } from 'date-fns';

type NoteCardProps = {
  note: Note;
  onEdit?: () => void;
  onDelete?: () => void;
  onTogglePin?: () => void;
  onView?: () => void;
  attributes?: React.HTMLAttributes<HTMLDivElement>;
  listeners?: React.HTMLAttributes<HTMLDivElement>;
  showDelete?: boolean;
  showPin?: boolean;
  showView?: boolean;
};

// Helper function to convert hex to rgba
const hexToRgba = (hex: string, alpha: number): string => {
  if (!hex || !/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
    return `rgba(40, 40, 40, ${alpha})`; // Default color if hex is invalid
  }
  let c: any = hex.substring(1).split('');
  if (c.length === 3) {
    c = [c[0], c[0], c[1], c[1], c[2], c[2]];
  }
  c = '0x' + c.join('');
  return `rgba(${[(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',')},${alpha})`;
};


export const NoteCard = ({ note, onEdit, onDelete, onTogglePin, onView, attributes, listeners, showDelete, showPin, showView }: NoteCardProps) => {
  
  const isValidDate = (date: any): boolean => {
    if (!date) return false;
    if (date instanceof Date) return true;
    if (typeof date === 'string' && !isNaN(parseISO(date).getTime())) return true;
    if (date.seconds && typeof date.seconds === 'number') return true;
    return false;
  };

  const formatDateSafe = (date: any) => {
    if (!isValidDate(date)) return '...';
    const d = date.toDate ? date.toDate() : new Date(date.seconds ? date.seconds * 1000 : date);
    return format(d, 'MMM dd');
  }

  const formattedDate = formatDateSafe(note.updatedAt);
  
  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent event bubbling if a button was clicked
    if (e.target instanceof HTMLElement && e.target.closest('button')) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    // If onEdit is provided, it's the primary action for the card click
    if (onEdit) {
      onEdit();
    } else if (onView) { // Fallback to onView if onEdit is not available
      onView();
    }
  };
  
  const contentPreview = (note.pages && note.pages[0]?.content) || '';

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-2xl p-3 border transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer h-24",
      )}
      style={{ backgroundColor: hexToRgba(note.color, 0.95), borderColor: hexToRgba(note.color, 1) }}
      onClick={handleCardClick}
      {...attributes} 
      {...listeners}
    >
      <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {onView && showView && (
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-black/20 text-white" onClick={onView}>
             <Eye className="h-4 w-4" />
           </Button>
        )}
        {onEdit && !showView && (
             <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-black/20 text-white" onClick={onEdit}>
                <Edit className="h-4 w-4" />
            </Button>
        )}
        {onTogglePin && showPin && (
           <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-black/20 text-white" onClick={onTogglePin}>
             <Star className={cn("h-4 w-4", note.pinned ? "text-yellow-400 fill-yellow-400" : "text-white")} />
           </Button>
        )}
        {onDelete && showDelete && (
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
        )}
      </div>

      <div 
        className="prose prose-sm prose-invert max-w-none flex-1 overflow-hidden"
      >
        <h3 className="font-bold text-base text-white/90 truncate m-0">{note.title}</h3>
      </div>

      <div className="text-right text-xs text-white/60 mt-auto flex-shrink-0">
        {formattedDate}
      </div>
    </div>
  );
};
