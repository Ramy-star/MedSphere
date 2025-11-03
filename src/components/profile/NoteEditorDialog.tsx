'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Note, NotePage } from './ProfileNotesSection';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
  DialogPortal,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
    Bold, Italic, Underline, Strikethrough, Link as LinkIcon, List, ListOrdered, 
    Minus, Palette, Heading1, Heading2, Heading3, Undo, Redo, ChevronDown, AlignLeft, AlignCenter, AlignRight, Highlighter, TextQuote, Pilcrow, Image as ImageIcon, X, Plus, ChevronLeft, ChevronRight,
    Maximize, Shrink
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
import { nanoid } from 'nanoid';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from '../ui/scroll-area';
import { Input } from '../ui/input';
import { Slider } from '../ui/slider';

const NOTE_COLORS = [
    '#282828', // dark grey
    '#5C2B29', // dark red
    '#614A19', // dark orange
    '#635D19', // dark yellow
    '#345920', // dark green
    '#16504B', // dark teal
    '#204250', // dark blue
    '#42275E', // dark purple
];

const HIGHLIGHT_COLORS = [
    { name: 'Yellow', color: '#fef08a' },
    { name: 'Green', color: '#a7f3d0' },
    { name: 'Blue', color: '#bfdbfe' },
    { name: 'Red', color: '#fecaca' },
    { name: 'Purple', color: '#e9d5ff' },
];

const FONT_FAMILIES = [
    { name: 'Default', value: '' },
    { name: 'Inter', value: 'Inter, sans-serif' },
    { name: 'Poppins', value: 'Poppins, sans-serif' },
    { name: 'Roboto', value: 'Roboto, sans-serif' },
    { name: 'Lato', value: 'Lato, sans-serif' },
    { name: 'Montserrat', value: 'Montserrat, sans-serif' },
    { name: 'Impact', value: 'Impact, sans-serif' },
    { name: 'Comic Sans MS', value: 'Comic Sans MS, cursive' },
    { name: 'Amasis', value: 'Amasis, serif' },
    { name: 'Cairo', value: 'Cairo, sans-serif' },
    { name: 'Tajawal', value: 'Tajawal, sans-serif' },
    { name: 'Amiri', value: 'Amiri, serif' },
    { name: 'Almarai', value: 'Almarai, sans-serif' },
    { name: 'Noto Kufi Arabic', value: 'Noto Kufi Arabic, sans-serif' },
    { name: 'IBM Plex Sans Arabic', value: 'IBM Plex Sans Arabic, sans-serif' },
];


const editorExtensions = [
  StarterKit.configure({
    history: false,
    horizontalRule: {
      HTMLAttributes: { class: 'border-white my-4' },
    },
    blockquote: {
      HTMLAttributes: {
        class: 'border-l-4 border-slate-500 pl-4 text-slate-400',
      }
    }
  }),
  UnderlineExtension,
  LinkExtension.configure({
    openOnClick: false, autolink: true, linkOnPaste: true,
    HTMLAttributes: { class: 'text-blue-400 hover:text-blue-300 underline' }
  }),
  TextAlign.configure({ types: ['heading', 'paragraph', 'listItem'], alignments: ['left', 'center', 'right', 'justify'] }),
  Highlight.configure({ multicolor: true, HTMLAttributes: { class: 'text-black rounded-sm px-1 py-0.5' } }),
  TextStyle,
  Color,
  History.configure({ depth: 20 }),
  Placeholder.configure({
    placeholder: ({ node }) => {
      if (node.type.name === 'heading') {
        return 'What’s the title?';
      }
      return 'Write something amazing...';
    },
    emptyEditorClass: 'is-editor-empty',
  }),
  FontFamily,
  ImageExtension.configure({ inline: false, allowBase64: true }),
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
        <Palette className="h-4 w-4" />
      </Button>
    </PopoverTrigger>
    <Popover.Portal>
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
            <button onClick={() => editor.chain().focus().unsetColor().run()} className="text-xs px-2 text-white">Reset</button>
        </div>
        </PopoverContent>
    </Popover.Portal>
  </Popover>
);

const HighlightPicker = ({ editor }: { editor: Editor }) => (
  <Popover>
    <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" title="Highlight Color" className="h-8 w-8 text-slate-400">
            <Highlighter className="h-4 w-4" />
        </Button>
    </PopoverTrigger>
    <Popover.Portal>
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
                <button onClick={() => editor.chain().focus().unsetHighlight().run()} className="text-xs px-2 text-white">None</button>
            </div>
        </PopoverContent>
    </Popover.Portal>
  </Popover>
);

const FontPicker = ({ editor }: { editor: Editor }) => {
    const currentFont = editor.getAttributes('textStyle').fontFamily || '';
    const currentFontName = FONT_FAMILIES.find(f => f.value === currentFont)?.name || 'Default';
    return (
    <Popover>
        <PopoverTrigger asChild>
            <Button variant="ghost" className="h-8 w-28 justify-between text-slate-300">
                <span className="truncate">{currentFontName}</span>
                <ChevronDown className="h-4 w-4" />
            </Button>
        </PopoverTrigger>
        <Popover.Portal>
            <PopoverContent className="w-56 p-1 bg-slate-900 border-slate-700">
                <ScrollArea className="h-60">
                    {FONT_FAMILIES.map(({ name, value }) => (
                        <button
                            key={name}
                            onClick={() => value ? editor.chain().focus().setFontFamily(value).run() : editor.chain().focus().unsetFontFamily().run()}
                            className={cn("w-full text-left p-2 text-sm rounded-md hover:bg-slate-800", {
                                'bg-slate-700': editor.isActive('textStyle', { fontFamily: value }) || (!value && !editor.getAttributes('textStyle').fontFamily)
                            })}
                        >
                            <span style={{ fontFamily: value || 'inherit' }} className="text-white">{name}</span>
                        </button>
                    ))}
                </ScrollArea>
            </PopoverContent>
        </Popover.Portal>
    </Popover>
)};

const FontSizeSlider = ({ editor }: { editor: Editor }) => {
    const [size, setSize] = useState(() => {
        const currentSize = editor.getAttributes('textStyle').fontSize;
        if (currentSize && typeof currentSize === 'string') {
            return parseInt(currentSize, 10) || 14;
        }
        return 14;
    });

    const handleSizeChange = (newSize: number) => {
        const clampedSize = Math.max(1, Math.min(newSize, 200));
        setSize(clampedSize);
        editor.chain().focus().setMark('textStyle', { fontSize: `${clampedSize}pt` }).run();
    };
    
    return (
        <div className="flex items-center gap-2 w-64">
            <div className="text-xs font-medium bg-slate-800/80 text-white rounded-md px-2 py-1 w-[60px] text-center">
                {size} pt
            </div>
            <Slider
                min={1}
                max={200}
                step={1}
                value={[size]}
                onValueChange={(value) => handleSizeChange(value[0])}
                className="flex-1"
            />
             <div className="flex items-center gap-0.5 bg-slate-800/80 rounded-md p-0.5">
                <Button variant="ghost" size="icon" className="h-6 w-6 text-white" onClick={() => handleSizeChange(size - 1)}><Minus size={14} /></Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-white" onClick={() => handleSizeChange(size + 1)}><Plus size={14} /></Button>
            </div>
        </div>
    );
};


const EmojiSelector = ({ editor }: { editor: Editor }) => (
    <Popover>
        <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" title="Insert Emoji" className="h-8 w-8 text-slate-400">
                <Smile className="h-4 w-4" />
            </Button>
        </PopoverTrigger>
        <Popover.Portal>
            <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-700 overflow-hidden rounded-2xl">
                <ScrollArea className="h-[300px]">
                    <EmojiPicker 
                        onEmojiClick={(emojiData: EmojiClickData) => editor.chain().focus().insertContent(emojiData.emoji).run()}
                        theme="dark"
                        lazyLoadEmojis={true}
                        skinTonesDisabled
                    />
                </ScrollArea>
            </PopoverContent>
        </Popover.Portal>
    </Popover>
);

type NoteEditorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: Note | null;
  onSave: (note: Note) => void;
};


export const NoteEditorDialog = ({ open, onOpenChange, note: initialNote, onSave }: NoteEditorDialogProps) => {
  const [note, setNote] = useState<Note | null>(initialNote);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [isToolbarOpen, setIsToolbarOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<NotePage | null>(null);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const newTabInputRef = useRef<HTMLInputElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const tabsContainerRef = useRef<HTMLDivElement | null>(null);
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const dialogContentRef = useRef<HTMLDivElement | null>(null);

  const editor = useEditor({
    extensions: editorExtensions,
    content: '',
    editorProps: {
      attributes: { class: 'prose prose-sm prose-invert focus:outline-none max-w-full p-2 h-full' },
    },
    onUpdate: ({ editor }) => {
        if (!note || !activePageId) return;
        const updatedContent = editor.getHTML();
        const updatedPages = note.pages.map(page => 
            page.id === activePageId ? { ...page, content: updatedContent } : page
        );
        setNote(prevNote => prevNote ? { ...prevNote, pages: updatedPages } : null);
    }
  });

  useEffect(() => {
    if (open && initialNote) {
      setNote(initialNote);
      if (initialNote.pages && initialNote.pages.length > 0) {
        setActivePageId(initialNote.pages[0].id);
      } else { 
        const newPageId = nanoid();
        const newPages = [{ id: newPageId, title: 'Page 1', content: (initialNote as any).content || '' }];
        setNote({ ...initialNote, pages: newPages });
        setActivePageId(newPageId);
      }
    } else if (!open) {
      setNote(null);
      setActivePageId(null);
      setIsFullscreen(false);
    }
  }, [initialNote, open]);

  useEffect(() => {
    if (editor && note && activePageId) {
      const activePage = note.pages.find(p => p.id === activePageId);
      if (activePage && !editor.isDestroyed && editor.getHTML() !== activePage.content) {
        editor.commands.setContent(activePage.content, false);
      }
    }
  }, [activePageId, note, editor]);
  
  const checkScroll = useCallback(() => {
    if (tabsContainerRef.current) {
        const { scrollWidth, clientWidth } = tabsContainerRef.current;
        setShowScrollButtons(scrollWidth > clientWidth);
    }
  }, []);

  useEffect(() => {
      checkScroll();
      const resizeObserver = new ResizeObserver(checkScroll);
      if (tabsContainerRef.current) {
          resizeObserver.observe(tabsContainerRef.current);
      }
      return () => resizeObserver.disconnect();
  }, [note?.pages.length, checkScroll]);
  
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!dialogContentRef.current) return;
    if (isFullscreen) {
      document.exitFullscreen();
    } else {
      dialogContentRef.current.requestFullscreen();
    }
  };

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsContainerRef.current) {
        const scrollAmount = direction === 'left' ? -150 : 150;
        tabsContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };


  useEffect(() => {
      if (editingTabId && newTabInputRef.current) {
          newTabInputRef.current.focus();
          newTabInputRef.current.select();
      }
  }, [editingTabId]);

  const handleSave = () => {
    if (note && editor) {
      onSave(note);
    }
  };

  const addPage = () => {
    if (!note) return;
    const newPage: NotePage = {
      id: nanoid(),
      title: `Page ${note.pages.length + 1}`,
      content: ''
    };
    const updatedPages = [...note.pages, newPage];
    setNote({ ...note, pages: updatedPages });
    setActivePageId(newPage.id);
    setEditingTabId(newPage.id);
  };

  const deletePage = () => {
    if (!note || !pageToDelete || note.pages.length <= 1) {
      setPageToDelete(null);
      return;
    }

    const updatedPages = note.pages.filter(p => p.id !== pageToDelete.id);
    let newActivePageId = activePageId;
    if (activePageId === pageToDelete.id) {
        const deletedIndex = note.pages.findIndex(p => p.id === pageToDelete.id);
        newActivePageId = updatedPages[Math.max(0, deletedIndex - 1)]?.id || updatedPages[0]?.id;
    }
    
    setNote({ ...note, pages: updatedPages });
    setActivePageId(newActivePageId);
    setPageToDelete(null);
  };

  const renamePage = (pageId: string, newTitle: string) => {
    if (!note || !newTitle.trim()) { setEditingTabId(null); return; }
    const updatedPages = note.pages.map(p => p.id === pageId ? { ...p, title: newTitle.trim() } : p);
    setNote({ ...note, pages: updatedPages });
    setEditingTabId(null);
  }

  const handleTabTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, page: NotePage) => {
    if (e.key === 'Enter') {
      renamePage(page.id, e.currentTarget.value);
    } else if (e.key === 'Escape') {
      setEditingTabId(null);
    }
  };
  
  const handleTabClick = (pageId: string) => {
    if (activePageId !== pageId) {
        setActivePageId(pageId);
    }
  }

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    if (url === null) return;
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!editor) return;
    try {
        const url = await contentService.uploadNoteImage(file);
        editor.chain().focus().setImage({ src: url }).run();
    } catch (error) {
        console.error("Image upload failed:", error);
    }
  }, [editor]);
  
  if (!editor || !note) return null;

  const ToolbarContent = () => (
      <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-900/50 rounded-lg border border-slate-700">
        <EditorToolbarButton icon={Undo} onClick={() => editor.chain().focus().undo().run()} tip="Undo" />
        <EditorToolbarButton icon={Redo} onClick={() => editor.chain().focus().redo().run()} tip="Redo" />
        <div className="w-px h-6 bg-slate-700 mx-1" />
        <FontPicker editor={editor} />
        <FontSizeSlider editor={editor} />
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
        <div className="w-px h-6 bg-slate-700 mx-1" />
        <EditorToolbarButton icon={List} onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} tip="Bullet List" />
        <EditorToolbarButton icon={ListOrdered} onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} tip="Ordered List" />
        <EditorToolbarButton icon={TextQuote} onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} tip="Quote" />
        <EditorToolbarButton icon={Pilcrow} onClick={() => editor.chain().focus().setHorizontalRule().run()} tip="Horizontal Rule" />
        <div className="w-px h-6 bg-slate-700 mx-1" />
        <EditorToolbarButton icon={LinkIcon} onClick={setLink} isActive={editor.isActive('link')} tip="Insert Link" />
        <EditorToolbarButton icon={ImageIcon} onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) handleImageUpload(file);
            };
            input.click();
        }} tip="Insert Image" />
        <EmojiSelector editor={editor} />
      </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
          ref={dialogContentRef}
          hideCloseButton={true}
          className={cn(
              "max-w-3xl w-[90vw] h-[80vh] flex flex-col glass-card p-0 z-[60]",
              isFullscreen && "max-w-full w-screen h-screen rounded-none max-h-screen"
          )}
          style={{ backgroundColor: note.color, borderColor: 'rgba(255, 255, 255, 0.1)' }}
      >
        <DialogHeader className="p-4 flex-shrink-0 flex-row items-center justify-between">
          <Input 
              ref={titleInputRef}
              defaultValue={note.title}
              onChange={(e) => setNote({ ...note, title: e.target.value })}
              className="text-lg font-bold bg-transparent border-0 text-white focus-visible:ring-1 focus-visible:ring-blue-500 w-auto flex-grow"
              placeholder="Note Title"
          />
          <div className="flex items-center">
              <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="h-9 w-9 text-white">
                {isFullscreen ? <Shrink size={18} /> : <Maximize size={18} />}
              </Button>
              <DialogClose asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-white"><X size={20}/></Button>
              </DialogClose>
          </div>
        </DialogHeader>
        <div className="p-4 pt-0 flex-shrink-0">
          <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                  <div className="flex-1 flex items-center gap-1 border-b border-white/10 overflow-hidden">
                      <div ref={tabsContainerRef} className="flex items-center gap-1 flex-grow overflow-x-auto no-scrollbar">
                          {note.pages.map(page => (
                              <div 
                              key={page.id} 
                              onDoubleClick={() => setEditingTabId(page.id)}
                              onClick={() => handleTabClick(page.id)}
                              className={cn("flex items-center gap-1 py-2 px-3 border-b-2 transition-colors flex-shrink-0", activePageId === page.id ? "border-blue-400 text-white" : "border-transparent text-slate-400 hover:bg-white/5")}
                              >
                                  {editingTabId === page.id ? (
                                      <input
                                          ref={newTabInputRef}
                                          type="text"
                                          defaultValue={page.title}
                                          onBlur={(e) => renamePage(page.id, e.target.value)}
                                          onKeyDown={(e) => handleTabTitleKeyDown(e, page)}
                                          className="bg-transparent outline-none w-24 text-sm"
                                      />
                                  ) : (
                                  <span className="text-sm cursor-pointer truncate">{page.title}</span>
                                  )}
                                  {note.pages.length > 1 && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <button onClick={(e) => {e.stopPropagation(); setPageToDelete(page)}} className="p-0.5 rounded-full hover:bg-red-500/20 text-slate-500 hover:text-red-400"><X size={12} /></button>
                                      </AlertDialogTrigger>
                                      <AlertDialogPortal>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete Page?</AlertDialogTitle>
                                                <AlertDialogDescription>Are you sure you want to delete the page "{page.title}"? This cannot be undone.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel onClick={(e)=>e.stopPropagation()}>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={(e)=>{e.stopPropagation(); deletePage()}} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialogPortal>
                                    </AlertDialog>
                                  )}
                              </div>
                          ))}
                      </div>
                      <button onClick={addPage} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-t-lg flex-shrink-0"><Plus size={16} /></button>
                      {showScrollButtons && (
                          <>
                              <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => scrollTabs('left')}><ChevronLeft size={16}/></Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => scrollTabs('right')}><ChevronRight size={16}/></Button>
                          </>
                      )}
                  </div>
              <div className="flex items-center gap-1 pl-4 flex-shrink-0">
                  <Popover>
                      <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" title="Change color"><Palette className="h-4 w-4" /></Button>
                      </PopoverTrigger>
                       <Popover.Portal>
                          <PopoverContent className="w-auto p-2 bg-slate-900 border-slate-700">
                              <div className="flex gap-2">
                                  {NOTE_COLORS.map(c => (
                                      <button
                                          key={c}
                                          className="h-8 w-8 rounded-full border-2 transition-transform transform hover:scale-110"
                                          style={{ backgroundColor: c, borderColor: note.color === c ? 'white' : 'transparent' }}
                                          onClick={() => setNote({ ...note, color: c })}
                                      />
                                  ))}
                              </div>
                          </PopoverContent>
                      </Popover.Portal>
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
          
          <EditorContent editor={editor} className="h-full overflow-y-auto p-2 rounded-lg bg-black/10" dir="auto" />
        </div>
        
        <DialogFooter className="p-4 border-t border-white/10 flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Note</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
