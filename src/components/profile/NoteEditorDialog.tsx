'use client';
import { useState, useEffect, useRef } from 'react';
import { Note } from './ProfileNotesSection';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Bold, Italic, Underline, Link, Image, List, ListOrdered, Palette } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';

type NoteEditorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: Note | null;
  onSave: (note: Note) => void;
};

const NOTE_COLORS = [
  '#333333', // dark gray
  '#8B0000', // dark red
  '#006400', // dark green
  '#00008B', // dark blue
  '#4B0082', // indigo
  '#800080', // purple
];

export const NoteEditorDialog = ({ open, onOpenChange, note, onSave }: NoteEditorDialogProps) => {
  const [content, setContent] = useState('');
  const [color, setColor] = useState('#333333');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (note) {
      setContent(note.content);
      setColor(note.color);
    }
  }, [note]);

  const handleSave = () => {
    if (note) {
      onSave({ ...note, content, color });
    }
  };

  const applyFormat = (format: 'bold' | 'italic' | 'underline' | 'link' | 'image' | 'ul' | 'ol') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);

    let prefix = '', suffix = '';
    switch (format) {
      case 'bold': prefix = '**'; suffix = '**'; break;
      case 'italic': prefix = '*'; suffix = '*'; break;
      case 'underline': prefix = '<u>'; suffix = '</u>'; break;
      case 'link': prefix = '['; suffix = '](url)'; break;
      case 'image': prefix = '![alt]('; suffix = ')'; break;
      case 'ul': prefix = '- '; suffix = ''; break;
      case 'ol': prefix = '1. '; suffix = ''; break;
    }
    
    const newText = textarea.value.substring(0, start) + prefix + selectedText + suffix + textarea.value.substring(end);
    setContent(newText);

    // Adjust cursor position after inserting format
    setTimeout(() => {
        textarea.focus();
        if(format === 'link' && !selectedText) textarea.setSelectionRange(start + 1, start + 1);
        else if (format === 'image' && !selectedText) textarea.setSelectionRange(start + 6, start + 6);
        else textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[90vw] h-[80vh] flex flex-col glass-card">
        <DialogHeader>
          <DialogTitle>{note?.id.startsWith('temp_') ? 'New Note' : 'Edit Note'}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="flex-shrink-0 flex items-center gap-1 border-b border-slate-700 pb-2">
            <Button variant="ghost" size="icon" onClick={() => applyFormat('bold')}><Bold className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => applyFormat('italic')}><Italic className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => applyFormat('underline')}><Underline className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => applyFormat('link')}><Link className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => applyFormat('image')}><Image className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => applyFormat('ul')}><List className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => applyFormat('ol')}><ListOrdered className="h-4 w-4" /></Button>
             <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon"><Palette className="h-4 w-4" /></Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2">
                    <div className="flex gap-1">
                        {NOTE_COLORS.map(c => (
                            <button
                                key={c}
                                className="h-8 w-8 rounded-full border-2"
                                style={{ backgroundColor: c, borderColor: color === c ? 'white' : 'transparent' }}
                                onClick={() => setColor(c)}
                            />
                        ))}
                    </div>
                </PopoverContent>
            </Popover>
          </div>
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 w-full h-full resize-none bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 no-scrollbar"
            placeholder="Start writing your note..."
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Note</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
