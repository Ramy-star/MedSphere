
'use client';
import { useState, useEffect, useCallback } from 'react';
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
    MessageSquareQuote, Minus, Palette, Heading1, Heading2, Heading3, Undo, Redo, ChevronDown, AlignLeft, AlignCenter, AlignRight, Highlighter, Droplets, Pilcrow, Image as ImageIcon, TextQuote
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '@/lib/utils';
import { useEditor, EditorContent, BubbleMenu, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import LinkExtension from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import History from '@tiptap/extension-history';
import { motion, AnimatePresence } from 'framer-motion';
import Placeholder from '@tiptap/extension-placeholder';
import FontFamily from '@tiptap/extension-font-family';
import ImageExtension from '@tiptap/extension-image';
import { contentService } from '@/lib/contentService';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { Smile } from 'lucide-react';

type NoteEditorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: Note | null;
  onSave: (note: Note) => void;
};

const NOTE_COLORS = [
  '#282828',
  '#5C2B29',
  '#614A19',
  '#635D19',
  '#345920',
  '#16504B',
  '#204250',
  '#42275E',
];

const HIGHLIGHT_COLORS = [
    { name: 'Yellow', color: '#fef08a' },
    { name: 'Green', color: '#a7f3d0' },
    { name: 'Blue', color: '#bfdbfe' },
    { name: 'Red', color: '#fecaca' },
    { name: 'Purple', color: '#e9d5ff' },
];

const editorExtensions = [
  StarterKit.configure({
    history: false, // We're using the standalone history extension
    horizontalRule: {
      HTMLAttributes: {
        class: 'border-white my-4',
      },
    },
  }),
  UnderlineExtension,
  LinkExtension.configure({
    openOnClick: false,
    autolink: true,
    linkOnPaste: true,
  }),
  TextAlign.configure({
    types: ['heading', 'paragraph'],
  }),
  Highlight.configure({ 
      multicolor: true,
      HTMLAttributes: {
          class: 'text-black',
      },
  }),
  TextStyle,
  Color,
  History.configure({
    depth: 20,
  }),
  Placeholder.configure({
    placeholder: 'Write something amazing...',
    emptyEditorClass: 'is-editor-empty',
  }),
  FontFamily,
  ImageExtension.configure({
    inline: false, // Allows images to be on their own line
    allowBase64: true,
  }),
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

const ColorPicker = ({ editor }: { editor: Editor }) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="ghost" size="icon" title="Text Color" className="h-8 w-8 text-slate-400">
        <Droplets className="h-4 w-4" />
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-2 bg-slate-900 border-slate-700">
      <div className="flex gap-1">
        {['#ffffff', '#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1', '#ff9ff3'].map(color => (
          <button
            key={color}
            onClick={() => editor.chain().focus().setColor(color).run()}
            className="w-6 h-6 rounded-full border-2"
            style={{ backgroundColor: color, borderColor: editor.isActive('textStyle', { color }) ? 'white' : 'transparent' }}
          />
        ))}
        <button onClick={() => editor.chain().focus().unsetColor().run()} className="text-xs px-2">Reset</button>
      </div>
    </PopoverContent>
  </Popover>
);

const HighlightPicker = ({ editor }: { editor: Editor }) => (
  <Popover>
    <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" title="Highlight Color" className="h-8 w-8 text-slate-400">
            <Highlighter className="h-4 w-4" />
        </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-2 bg-slate-900 border-slate-700">
        <div className="flex gap-1">
            {HIGHLIGHT_COLORS.map(({ color }) => (
                <button
                    key={color}
                    onClick={() => editor.chain().focus().toggleHighlight({ color }).run()}
                    className="w-6 h-6 rounded-full border-2"
                    style={{ backgroundColor: color, borderColor: editor.isActive('highlight', { color }) ? '#3b82f6' : 'transparent' }}
                />
            ))}
            <button onClick={() => editor.chain().focus().unsetHighlight().run()} className="text-xs px-2">None</button>
        </div>
    </PopoverContent>
  </Popover>
);

const FontPicker = ({ editor }: { editor: Editor }) => (
    <Popover>
        <PopoverTrigger asChild>
            <Button variant="ghost" className="h-8 w-40 justify-between text-slate-300">
                <span>{editor.getAttributes('textStyle').fontFamily || 'Default'}</span>
                <ChevronDown className="h-4 w-4" />
            </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-1 bg-slate-900 border-slate-700">
            {['Inter', 'Arial', 'Georgia', 'Courier New', 'serif', 'sans-serif', 'monospace', '"IBM Plex Sans Arabic"'].map(font => (
                <button
                    key={font}
                    onClick={() => editor.chain().focus().setFontFamily(font).run()}
                    className={cn("w-full text-left p-2 text-sm rounded-md hover:bg-slate-800", {
                        'bg-slate-700': editor.isActive('textStyle', { fontFamily: font })
                    })}
                >
                    <span style={{ fontFamily: font }}>{font.replace(/"/g, '')}</span>
                </button>
            ))}
            <button onClick={() => editor.chain().focus().unsetFontFamily().run()} className="w-full text-left p-2 text-sm text-red-400 rounded-md hover:bg-slate-800">
                Reset
            </button>
        </PopoverContent>
    </Popover>
);

const EmojiSelector = ({ editor }: { editor: Editor }) => (
    <Popover>
        <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" title="Insert Emoji" className="h-8 w-8 text-slate-400">
                <Smile className="h-4 w-4" />
            </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-700 max-h-80 overflow-y-auto no-scrollbar">
            <EmojiPicker 
                onEmojiClick={(emojiData: EmojiClickData) => editor.chain().focus().insertContent(emojiData.emoji).run()}
                theme="dark"
                lazyLoadEmojis={true}
            />
        </PopoverContent>
    </Popover>
);


export const NoteEditorDialog = ({ open, onOpenChange, note, onSave }: NoteEditorDialogProps) => {
  const [color, setColor] = useState('#282828');
  const [isToolbarOpen, setIsToolbarOpen] = useState(false);

  const editor = useEditor({
    extensions: editorExtensions,
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm prose-invert focus:outline-none max-w-full p-2 h-full',
      },
      handleDrop: function(view, event, slice, moved) {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
          const file = event.dataTransfer.files[0];
          if (file.type.startsWith("image/")) {
            event.preventDefault();
            contentService.uploadNoteImage(file).then(url => {
              const { schema } = view.state;
              const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
              if (!coordinates) return;
              const node = schema.nodes.image.create({ src: url });
              const transaction = view.state.tr.insert(coordinates.pos, node);
              view.dispatch(transaction);
            }).catch(err => {
                console.error(err);
            });
            return true;
          }
        }
        return false;
      }
    },
  });

  useEffect(() => {
    if (open && note && editor) {
        if (!editor.isDestroyed) {
          editor.commands.setContent(note.content);
        }
        setColor(note.color || '#282828');
        setIsToolbarOpen(false); // Reset toolbar state on open
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
  
  if (!editor) {
    return null;
  }
  
  const handleImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
            try {
              const url = await contentService.uploadNoteImage(file);
              editor.chain().focus().setImage({ src: url }).run();
            } catch(error) {
              console.error(error);
            }
        }
    };
    input.click();
  };

  const ToolbarContent = () => (
      <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-900/50 rounded-lg border border-slate-700">
        <EditorToolbarButton icon={Undo} onClick={() => editor.chain().focus().undo().run()} tip="Undo" />
        <EditorToolbarButton icon={Redo} onClick={() => editor.chain().focus().redo().run()} tip="Redo" />
        <div className="w-px h-6 bg-slate-700 mx-1" />
        <FontPicker editor={editor} />
        <div className="w-px h-6 bg-slate-700 mx-1" />
        <EditorToolbarButton icon={Bold} onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} tip="Bold" />
        <EditorToolbarButton icon={Italic} onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} tip="Italic" />
        <EditorToolbarButton icon={Underline} onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} tip="Underline" />
        <EditorToolbarButton icon={Strikethrough} onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} tip="Strikethrough" />
        <HighlightPicker editor={editor} />
        <ColorPicker editor={editor} />
        <div className="w-px h-6 bg-slate-700 mx-1" />
        <EditorToolbarButton icon={AlignLeft} onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} tip="Align Left" />
        <EditorToolbarButton icon={AlignCenter} onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} tip="Align Center" />
        <EditorToolbarButton icon={AlignRight} onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} tip="Align Right" />
        <div className="w-px h-6 bg-slate-700 mx-1" />
        <EditorToolbarButton icon={Heading1} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} tip="Heading 1" />
        <EditorToolbarButton icon={Heading2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} tip="Heading 2" />
        <EditorToolbarButton icon={Heading3} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} tip="Heading 3" />
        <EditorToolbarButton icon={Pilcrow} onClick={() => editor.chain().focus().setParagraph().run()} isActive={editor.isActive('paragraph')} tip="Paragraph" />
        <div className="w-px h-6 bg-slate-700 mx-1" />
        <EditorToolbarButton icon={List} onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} tip="Bullet List" />
        <EditorToolbarButton icon={ListOrdered} onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} tip="Ordered List" />
        <EditorToolbarButton icon={TextQuote} onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} tip="Quote" />
        <EditorToolbarButton icon={Minus} onClick={() => editor.chain().focus().setHorizontalRule().run()} tip="Horizontal Rule" />
        <div className="w-px h-6 bg-slate-700 mx-1" />
        <EditorToolbarButton icon={Link} onClick={setLink} isActive={editor.isActive('link')} tip="Insert Link" />
        <EditorToolbarButton icon={ImageIcon} onClick={handleImageUpload} tip="Insert Image" />
        <EmojiSelector editor={editor} />
      </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-3xl w-[90vw] h-[80vh] flex flex-col glass-card p-0"
        style={{ backgroundColor: color, borderColor: 'rgba(255, 255, 255, 0.1)' }}
      >
        <div className="p-4 flex-shrink-0">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <DialogTitle>{note?.id.startsWith('temp_') ? 'New Note' : 'Edit Note'}</DialogTitle>
              <div className="flex items-center gap-1">
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
                  <Button variant="ghost" size="icon" onClick={() => setIsToolbarOpen(prev => !prev)} title="Toggle Toolbar">
                      <ChevronDown className={cn("transition-transform", isToolbarOpen && "rotate-180")} />
                  </Button>
              </div>
            </div>
            <AnimatePresence>
              {isToolbarOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <ToolbarContent />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden px-4">
          <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }} className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl flex gap-1 p-1">
            <EditorToolbarButton icon={Bold} onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} tip="Bold" />
            <EditorToolbarButton icon={Italic} onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} tip="Italic" />
            <EditorToolbarButton icon={Underline} onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} tip="Underline" />
            <EditorToolbarButton icon={Strikethrough} onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} tip="Strikethrough" />
          </BubbleMenu>
          
          <EditorContent editor={editor} className="h-full overflow-y-auto p-2 rounded-lg bg-black/10" />
        </div>
        
        <DialogFooter className="p-4 border-t border-white/10 flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Note</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
