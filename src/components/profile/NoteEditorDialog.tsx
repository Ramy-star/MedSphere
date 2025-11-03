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
import { cn } from '@/lib/utils';

type NoteEditorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: Note | null;
  onSave: (note: Note) => void;
};

const NOTE_COLORS = [
  '#282828', // Dark Gray
  '#402323', // Dark Red
  '#433422', // Dark Orange
  '#444026', // Dark Yellow
  '#2a3b2c', // Dark Green
  '#243a3a', // Dark Teal
  '#253342', // Dark Blue
  '#382a44', // Dark Purple
];

const EditorToolbarButton = ({ icon: Icon, onClick, tip }: { icon: React.ElementType, onClick: () => void, tip: string }) => (
    <Button variant="ghost" size="icon" onMouseDown={(e) => { e.preventDefault(); onClick(); }} title={tip}>
        <Icon className="h-4 w-4" />
    </Button>
);

export const NoteEditorDialog = ({ open, onOpenChange, note, onSave }: NoteEditorDialogProps) => {
  const [content, setContent] = useState('');
  const [color, setColor] = useState('#282828');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && note) {
      setContent(note.content);
      setColor(note.color || '#282828');
    } else if (!open) {
      // Reset when dialog closes
      setContent('');
      setColor('#282828');
    }
  }, [note, open]);
  
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

    let prefix = '', suffix = '', newText = '';
    
    switch (format) {
      case 'bold': prefix = '**'; suffix = '**'; break;
      case 'italic': prefix = '*'; suffix = '*'; break;
      case 'underline': prefix = '<u>'; suffix = '</u>'; break;
      case 'link': prefix = `[${selectedText || 'link text'}]`; suffix = '(https://)'; break;
      case 'image': prefix = '![alt text]'; suffix = '(https://)'; break;
      case 'ul': 
        const ulLines = selectedText.split('\n').map(line => `- ${line}`).join('\n');
        newText = textarea.value.substring(0, start) + ulLines + textarea.value.substring(end);
        break;
      case 'ol':
        const olLines = selectedText.split('\n').map((line, i) => `${i + 1}. ${line}`).join('\n');
        newText = textarea.value.substring(0, start) + olLines + textarea.value.substring(end);
        break;
      default:
        break;
    }
    
    if (format !== 'ul' && format !== 'ol') {
        newText = textarea.value.substring(0, start) + prefix + (format === 'link' || format === 'image' ? '' : selectedText) + suffix + textarea.value.substring(end);
    }
    
    setContent(newText);

    // Adjust cursor position after inserting format
    setTimeout(() => {
        textarea.focus();
        if (format === 'link') textarea.setSelectionRange(start + prefix.length + suffix.length, start + prefix.length + suffix.length);
        else if (format === 'image') textarea.setSelectionRange(start + prefix.length + suffix.length, start + prefix.length + suffix.length);
        else textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl w-[90vw] h-[80vh] flex flex-col glass-card p-0"
        style={{ backgroundColor: color, borderColor: 'rgba(255, 255, 255, 0.1)' }}
      >
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>{note?.id.startsWith('temp_') ? 'New Note' : 'Edit Note'}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-2 overflow-hidden px-6 pb-2">
          <div className="flex-shrink-0 flex items-center gap-1 border-b border-white/20 pb-2">
            <EditorToolbarButton icon={Bold} onClick={() => applyFormat('bold')} tip="Bold" />
            <EditorToolbarButton icon={Italic} onClick={() => applyFormat('italic')} tip="Italic" />
            <EditorToolbarButton icon={Underline} onClick={() => applyFormat('underline')} tip="Underline" />
            <EditorToolbarButton icon={Link} onClick={() => applyFormat('link')} tip="Insert Link" />
            <EditorToolbarButton icon={Image} onClick={() => applyFormat('image')} tip="Insert Image" />
            <EditorToolbarButton icon={List} onClick={() => applyFormat('ul')} tip="Unordered List" />
            <EditorToolbarButton icon={ListOrdered} onClick={() => applyFormat('ol')} tip="Ordered List" />
             <Popover>
                <PopoverTrigger asChild>
                   <Button variant="ghost" size="icon" title="Change color"><Palette className="h-4 w-4" /></Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2 bg-slate-900 border-slate-700">
                    <div className="flex gap-2">
                        {NOTE_COLORS.map(c => (
                            <button
                                key={c}
                                className="h-8 w-8 rounded-full border-2 transition-transform transform hover:scale-110"
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
            className="flex-1 w-full h-full resize-none bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 no-scrollbar p-2 text-base text-white/90"
            placeholder="Start writing your note..."
          />
        </div>
        <DialogFooter className="p-6 pt-4 border-t border-white/20">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Note</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
