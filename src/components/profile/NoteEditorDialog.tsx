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
import { 
    Bold, Italic, Underline, Strikethrough, Link, List, ListOrdered, 
    MessageSquareQuote, Minus, Palette, Heading1, Heading2, Heading3
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '@/lib/utils';
import { useEditor, EditorContent, FloatingMenu, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import LinkExtension from '@tiptap/extension-link';

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

const EditorToolbarButton = ({ icon: Icon, onClick, tip, isActive = false }: { icon: React.ElementType, onClick: (e: React.MouseEvent) => void, tip: string, isActive?: boolean }) => (
    <Button 
      variant="ghost" 
      size="icon" 
      onMouseDown={(e) => { e.preventDefault(); onClick(e); }} 
      title={tip}
      className={cn("h-8 w-8", isActive ? "bg-slate-700 text-white" : "text-slate-400")}
    >
        <Icon className="h-4 w-4" />
    </Button>
);

export const NoteEditorDialog = ({ open, onOpenChange, note, onSave }: NoteEditorDialogProps) => {
  const [color, setColor] = useState('#282828');

  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExtension,
      LinkExtension.configure({
        openOnClick: false,
        autolink: true,
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm prose-invert focus:outline-none max-w-full p-2 h-full',
      },
    },
  });

  useEffect(() => {
    if (open && note && editor) {
        if (!editor.isDestroyed) {
          editor.commands.setContent(note.content);
        }
        setColor(note.color || '#282828');
    } else if (!open) {
        editor?.commands.clearContent();
        setColor('#282828');
    }
  }, [note, open, editor]);

  const handleSave = () => {
    if (note && editor) {
      onSave({ ...note, content: editor.getHTML(), color });
    }
  };

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-3xl w-[90vw] h-[80vh] flex flex-col glass-card p-0"
        style={{ backgroundColor: color, borderColor: 'rgba(255, 255, 255, 0.1)' }}
      >
        <DialogHeader className="p-4 pb-2 flex-row items-center justify-between border-b border-white/10">
          <DialogTitle>{note?.id.startsWith('temp_') ? 'New Note' : 'Edit Note'}</DialogTitle>
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
        </DialogHeader>

        <div className="flex-1 relative overflow-hidden">
          {editor && (
            <>
              <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl flex gap-1 p-1">
                <EditorToolbarButton icon={Bold} onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} tip="Bold" />
                <EditorToolbarButton icon={Italic} onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} tip="Italic" />
                <EditorToolbarButton icon={Underline} onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} tip="Underline" />
                <EditorToolbarButton icon={Strikethrough} onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} tip="Strikethrough" />
              </BubbleMenu>

              <FloatingMenu editor={editor} tippyOptions={{ duration: 100 }} className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl flex gap-1 p-1">
                 <EditorToolbarButton icon={Heading1} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} tip="Heading 1" />
                 <EditorToolbarButton icon={Heading2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} tip="Heading 2" />
                 <EditorToolbarButton icon={Heading3} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} tip="Heading 3" />
                 <EditorToolbarButton icon={List} onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} tip="Bullet List" />
                 <EditorToolbarButton icon={ListOrdered} onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} tip="Ordered List" />
                 <EditorToolbarButton icon={MessageSquareQuote} onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} tip="Quote" />
                 <EditorToolbarButton icon={Minus} onClick={() => editor.chain().focus().setHorizontalRule().run()} tip="Horizontal Rule" />
                 <EditorToolbarButton icon={Link} onClick={setLink} isActive={editor.isActive('link')} tip="Insert Link" />
              </FloatingMenu>
            </>
          )}
          <EditorContent editor={editor} className="h-full overflow-y-auto p-4" />
        </div>
        
        <DialogFooter className="p-4 border-t border-white/10">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Note</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
