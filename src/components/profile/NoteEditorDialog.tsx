'use client';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Note, NotePage } from './ProfileNotesSection';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Bold, Italic, Underline, Strikethrough, Link as LinkIcon, List, ListOrdered,
    Minus, Palette, Heading1, Heading2, Heading3, Undo, Redo, ChevronDown, AlignLeft, AlignCenter, AlignRight, Highlighter, TextQuote, Pilcrow, Image as ImageIcon, X, Plus, ChevronLeft, ChevronRight,
    Maximize, Shrink, Trash2, Check, Paperclip, FileText, Eraser, PenLine
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
import { contentService, Content } from '@/lib/contentService';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { Smile } from 'lucide-react';
import { nanoid } from 'nanoid';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogFooter as AlertDialogFooterComponent,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from '../ui/scroll-area';
import { Input } from '../ui/input';
import { Slider } from '../ui/slider';
import { AiAssistantIcon } from '../icons/AiAssistantIcon';
import { FilePreviewModal } from '../FilePreviewModal';
import { useCollection } from '@/firebase/firestore/use-collection';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
    { name: 'Forte', value: 'Forte, cursive' },
    { name: 'Cooper Black', value: 'Cooper Black, serif' },
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
    history: false, // We're using a separate History extension
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
  ImageExtension.configure({ inline: true, allowBase64: true }),
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


const ColorPicker = ({ editor, container }: { editor: Editor, container: HTMLElement | null }) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="ghost" size="icon" title="Text Color" className="h-8 w-8 text-slate-400">
        <Palette className="h-4 w-4" />
      </Button>
    </PopoverTrigger>
    <PopoverContent container={container} className="w-auto p-2 bg-slate-900 border-slate-700">
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
  </Popover>
);

const HighlightPicker = ({ editor, container }: { editor: Editor, container: HTMLElement | null }) => (
  <Popover>
    <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" title="Highlight Color" className="h-8 w-8 text-slate-400">
            <Highlighter className="h-4 w-4" />
        </Button>
    </PopoverTrigger>
    <PopoverContent container={container} className="w-auto p-2 bg-slate-900 border-slate-700">
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
  </Popover>
);

const FontPicker = ({ editor, container }: { editor: Editor, container: HTMLElement | null }) => {
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
        <PopoverContent container={container} className="w-56 p-1 bg-slate-900 border-slate-700">
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
    </Popover>
)};


const FontSizeSlider = ({ editor }: { editor: Editor | null }) => {
    const [sliderValue, setSliderValue] = useState(14);
    const [interactiveSliderValue, setInteractiveSliderValue] = useState<number | null>(null);

    useEffect(() => {
        if (!editor || editor.isDestroyed) return;
        const handleUpdate = () => {
            if (editor.isDestroyed) return;
            const attrs = editor.getAttributes('textStyle');
            const currentSize = attrs.fontSize;
            if (typeof currentSize === 'string') {
                const sizeNumber = parseInt(currentSize, 10);
                if (!isNaN(sizeNumber)) {
                    setSliderValue(sizeNumber);
                    return;
                }
            }
            setSliderValue(14); // Default if no size is set
        };
        editor.on('transaction', handleUpdate);
        editor.on('selectionUpdate', handleUpdate);
        handleUpdate();
        return () => {
            if (!editor.isDestroyed) {
                editor.off('transaction', handleUpdate);
                editor.off('selectionUpdate', handleUpdate);
            }
        };
    }, [editor]);
   
    const handleSizeCommit = (value: number[]) => {
        const newSize = value[0];
        if (editor) {
            editor.chain().focus().setMark('textStyle', { fontSize: `${newSize}pt` }).run();
        }
        setInteractiveSliderValue(null);
    };

    const handleSliderChange = (value: number[]) => {
        const newSize = value[0];
        setInteractiveSliderValue(newSize);
    };
   
    const handleButtonClick = (increment: number) => {
        const newSize = Math.max(8, Math.min(96, sliderValue + increment));
        setSliderValue(newSize);
        if (editor) {
            editor.chain().focus().setMark('textStyle', { fontSize: `${newSize}pt` }).run();
        }
    };
    
    const displayValue = interactiveSliderValue ?? sliderValue;
   
    return (
        <div className="flex items-center gap-2 w-64">
            <div className="text-xs font-medium bg-slate-800/80 text-white rounded-md px-2 py-1 w-[60px] text-center">
                {displayValue} pt
            </div>
            <Slider
                min={8}
                max={96}
                step={1}
                value={[displayValue]}
                onValueChange={handleSliderChange}
                onValueCommit={handleSizeCommit}
                className="flex-1"
            />
            <div className="flex items-center gap-0.5 bg-slate-800/80 rounded-md p-0.5">
                <Button variant="ghost" size="icon" className="h-6 w-6 text-white active:scale-95" onClick={() => handleButtonClick(-1)} disabled={sliderValue <= 8}>
                    <Minus size={14} />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-white active:scale-95" onClick={() => handleButtonClick(1)} disabled={sliderValue >= 96}>
                    <Plus size={14} />
                </Button>
            </div>
        </div>
    );
};

const EmojiSelector = ({ editor, container }: { editor: Editor, container: HTMLElement | null }) => (
    <Popover>
        <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" title="Insert Emoji" className="h-8 w-8 text-slate-400">
                <Smile className="h-4 w-4" />
            </Button>
        </PopoverTrigger>
        <PopoverContent container={container} className="w-auto p-0 bg-slate-900 border-slate-700 overflow-hidden rounded-2xl">
            <ScrollArea className="h-[300px]">
                <EmojiPicker
                    onEmojiClick={(emojiData: EmojiClickData) => editor.chain().focus().insertContent(emojiData.emoji).run()}
                    theme={Theme.DARK}
                    lazyLoadEmojis={true}
                    skinTonesDisabled
                />
            </ScrollArea>
        </PopoverContent>
    </Popover>
);


const ReferencedFilePill = ({ file, onRemove }: { file: Content, onRemove: () => void }) => (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                 <div className="flex w-full items-center justify-between gap-2 p-2 rounded-md hover:bg-white/10">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="truncate text-sm text-slate-200">{file.name}</span>
                    </div>
                    <button onClick={onRemove} className="p-0.5 rounded-full hover:bg-red-500/20 text-slate-500 hover:text-red-400 shrink-0">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="rounded-lg bg-black text-white">
                <p>{file.name}</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);


const DrawingCanvas = ({ onSave, onCancel }: { onSave: (dataUrl: string) => void, onCancel: () => void }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#FFFFFF');
    const [brushSize, setBrushSize] = useState(5);
    const [isErasing, setIsErasing] = useState(false);
    const [history, setHistory] = useState<ImageData[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const getContext = () => canvasRef.current?.getContext('2d');

    const saveToHistory = useCallback(() => {
        const ctx = getContext();
        if (!ctx || !canvasRef.current) return;
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height));
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [history, historyIndex]);

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const ctx = getContext();
        if (!ctx) return;
        setIsDrawing(true);
        const { offsetX, offsetY } = getCoords(e);
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY);
        saveToHistory();
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const ctx = getContext();
        if (!ctx) return;
        const { offsetX, offsetY } = getCoords(e);
        ctx.strokeStyle = isErasing ? '#000000' : color;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = isErasing ? 'destination-out' : 'source-over';
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
    };

    const stopDrawing = () => {
        const ctx = getContext();
        if (!ctx) return;
        ctx.closePath();
        setIsDrawing(false);
    };

    const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { offsetX: 0, offsetY: 0 };
        const rect = canvas.getBoundingClientRect();
        if ('touches' in e) { // Touch event
            return {
                offsetX: e.touches[0].clientX - rect.left,
                offsetY: e.touches[0].clientY - rect.top
            };
        }
        // Mouse event
        return { offsetX: e.nativeEvent.offsetX, offsetY: e.nativeEvent.offsetY };
    };

    const handleSave = () => {
        if (canvasRef.current) {
            onSave(canvasRef.current.toDataURL('image/png'));
        }
    };
    
    const clearCanvas = () => {
        const ctx = getContext();
        if (!ctx || !canvasRef.current) return;
        saveToHistory();
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    };

    const undo = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            const ctx = getContext();
            if (ctx) {
                ctx.putImageData(history[newIndex], 0, 0);
            }
            setHistoryIndex(newIndex);
        }
    };

    return (
        <Dialog open onOpenChange={(isOpen) => !isOpen && onCancel()}>
            <DialogContent className="max-w-2xl w-[90vw] glass-card p-0">
                <DialogHeader className="p-4 border-b border-slate-700">
                    <DialogTitle>Drawing Pad</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col md:flex-row gap-4 p-4">
                    <div className="flex flex-row md:flex-col items-center gap-4 p-2 bg-slate-800/50 rounded-lg">
                        <Button variant="ghost" size="icon" onClick={() => setIsErasing(false)} className={!isErasing ? 'bg-slate-700' : ''}><PenLine/></Button>
                        <Button variant="ghost" size="icon" onClick={() => setIsErasing(true)} className={isErasing ? 'bg-slate-700' : ''}><Eraser/></Button>
                        <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-8 h-8 p-0 border-none bg-transparent rounded-full cursor-pointer" />
                        <Slider value={[brushSize]} min={1} max={50} step={1} onValueChange={(val) => setBrushSize(val[0])} orientation="vertical" className="w-auto h-24" />
                        <Button variant="ghost" size="icon" onClick={undo} disabled={historyIndex <= 0}><Undo/></Button>
                        <Button variant="ghost" size="icon" onClick={clearCanvas}><Trash2/></Button>
                    </div>
                    <canvas
                        ref={canvasRef}
                        width={500}
                        height={400}
                        className="bg-black rounded-md cursor-crosshair"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                    />
                </div>
                <DialogFooter className="p-4 border-t border-slate-700">
                    <Button variant="outline" onClick={onCancel}>Cancel</Button>
                    <Button onClick={handleSave}>Save Drawing</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


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
  const [chatContext, setChatContext] = useState<Content | null>(null);
  const [showFileSearch, setShowFileSearch] = useState(false);
  const [fileSearchQuery, setFileSearchQuery] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
 
  const { data: allContent } = useCollection<Content>('content');
 
  const fileMap = useMemo(() => {
    if (!allContent) return new Map();
    return new Map(allContent.map(item => [item.id, item]));
  }, [allContent]);

  const filteredFiles = useMemo(() => {
    if (!allContent) return [];
    const items = allContent.filter(f => f.type === 'FILE' || f.type === 'LINK');
    if (!fileSearchQuery) return items.slice(0, 10);
    return items.filter(file => file.name.toLowerCase().includes(fileSearchQuery.toLowerCase())).slice(0, 10);
  }, [allContent, fileSearchQuery]);


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
  }, []);

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

  const toggleFullscreen = async () => {
    if (!dialogContentRef.current) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await dialogContentRef.current.requestFullscreen();
      }
    } catch (error) {
      console.error('Fullscreen toggle failed:', error);
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
      content: '',
      referencedFileIds: []
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
  
  const handleDrawingSave = (dataUrl: string) => {
    if(editor) {
        editor.chain().focus().setImage({ src: dataUrl }).run();
    }
    setIsDrawing(false);
  }

  const handleOpenAiChat = () => {
    if (!note || !activePageId) return;
   
    const activePage = note.pages.find(p => p.id === activePageId);
    if (!activePage) return;

    // Create a synthetic Content item to pass to the modal
    const syntheticContentItem: Content = {
      id: note.id,
      name: note.title,
      type: 'NOTE', // Custom type to signal special handling
      parentId: null,
      metadata: {
        // We serialize the entire note object here for simplicity.
        // The chat panel will receive this and can reconstruct the context.
        quizData: JSON.stringify({
          ...note,
          pages: [activePage] // Only send the active page context for focus
        })
      }
    };
   
    setChatContext(syntheticContentItem);
  };

  const handleFileSelect = (file: Content) => {
    if (!note || !activePageId) return;
    const updatedPages = note.pages.map(page => {
        if (page.id === activePageId) {
            const newRefs = [...(page.referencedFileIds || [])];
            if (!newRefs.includes(file.id)) {
                newRefs.push(file.id);
            }
            return { ...page, referencedFileIds: newRefs };
        }
        return page;
    });
    setNote({ ...note, pages: updatedPages });
    setShowFileSearch(false);
  };
 
  const handleRemoveFileRef = (pageId: string, fileId: string) => {
      if (!note) return;
      const updatedPages = note.pages.map(page => {
          if (page.id === pageId) {
              return { ...page, referencedFileIds: (page.referencedFileIds || []).filter(id => id !== fileId) };
          }
          return page;
      });
      setNote({ ...note, pages: updatedPages });
  };
 
  if (!editor || !note) return null;

  const ToolbarContent = ({ container }: { container: HTMLElement | null }) => (
      <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-900/50 rounded-lg border border-slate-700">
        <EditorToolbarButton icon={Undo} onClick={() => editor.chain().focus().undo().run()} tip="Undo" />
        <EditorToolbarButton icon={Redo} onClick={() => editor.chain().focus().redo().run()} tip="Redo" />
        <div className="w-px h-6 bg-slate-700 mx-1" />
        <FontPicker editor={editor} container={container} />
        <FontSizeSlider editor={editor} />
        <div className="w-px h-6 bg-slate-700 mx-1" />
        <EditorToolbarButton icon={Bold} onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} tip="Bold" />
        <EditorToolbarButton icon={Italic} onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} tip="Italic" />
        <EditorToolbarButton icon={Underline} onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} tip="Underline" />
        <EditorToolbarButton icon={Strikethrough} onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} tip="Strikethrough" />
        <HighlightPicker editor={editor} container={container} />
        <ColorPicker editor={editor} container={container} />
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
        <EditorToolbarButton icon={PenLine} onClick={() => setIsDrawing(true)} tip="Draw" />
        <EmojiSelector editor={editor} container={container} />
      </div>
  );

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
          ref={dialogContentRef}
          className={cn(
              "max-w-3xl w-[90vw] h-[80vh] flex flex-col glass-card p-0",
              isFullscreen && "max-w-full w-screen h-screen rounded-none max-h-screen z-[9999]"
          )}
          style={{ backgroundColor: note.color, borderColor: 'rgba(255, 255, 255, 0.1)' }}
          hideCloseButton={true}
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
              <Button variant="ghost" size="icon" onClick={handleOpenAiChat} className="h-9 w-9 text-white">
                <AiAssistantIcon className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="h-9 w-9 text-white">
                {isFullscreen ? <Shrink size={18} /> : <Maximize size={18} />}
              </Button>
               <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-9 w-9 text-white"><X size={20}/></Button>
          </div>
          <DialogTitle className="sr-only">Edit Note: {note.title}</DialogTitle>
          <DialogDescription className="sr-only">Edit your note content and pages.</DialogDescription>
        </DialogHeader>
        <div className="p-4 pt-0 flex-shrink-0">
          <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                  <div className="flex-1 flex items-center gap-1 border-b border-white/10 overflow-hidden">
                      <div ref={tabsContainerRef} className="flex items-center gap-1 flex-grow overflow-x-auto no-scrollbar">
                          {note.pages.map(page => {
                            const refs = page.referencedFileIds?.map(id => fileMap.get(id)).filter(Boolean) as Content[] || [];
                            return (
                              <div
                                  key={page.id}
                                  className={cn("flex flex-col py-2 border-b-2 transition-colors flex-shrink-0", activePageId === page.id ? "border-blue-400 text-white" : "border-transparent text-slate-400 hover:bg-white/5")}
                              >
                                <div className="flex items-center gap-1 px-3" onClick={() => handleTabClick(page.id)} >
                                  {editingTabId === page.id ? (
                                      <input
                                          ref={newTabInputRef}
                                          type="text"
                                          defaultValue={page.title}
                                          onBlur={(e) => renamePage(page.id, e.target.value)}
                                          onKeyDown={(e) => handleTabTitleKeyDown(e, page)}
                                          className="bg-transparent outline-none w-24 text-sm"
                                          onClick={(e) => e.stopPropagation()}
                                      />
                                  ) : (
                                    <span className="text-sm cursor-pointer truncate" onDoubleClick={() => setEditingTabId(page.id)}>{page.title}</span>
                                  )}
                                  {note.pages.length > 1 && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <button onClick={(e) => {e.stopPropagation(); setPageToDelete(page)}} className="p-0.5 rounded-full hover:bg-red-500/20 text-slate-500 hover:text-red-400"><X size={12} /></button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent container={dialogContentRef.current}>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete Page?</AlertDialogTitle>
                                          <AlertDialogDescription>Are you sure you want to delete the page "{page.title}"? This cannot be undone.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooterComponent>
                                          <AlertDialogCancel onClick={(e)=>e.stopPropagation()}>Cancel</AlertDialogCancel>
                                          <AlertDialogAction onClick={(e)=>{e.stopPropagation(); deletePage()}} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                                        </AlertDialogFooterComponent>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 px-3 mt-1.5 h-5">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <button className="flex items-center gap-1 text-slate-500 hover:text-white transition-colors">
                                                <Paperclip size={14} />
                                            </button>
                                        </PopoverTrigger>
                                        <PopoverContent container={dialogContentRef.current} className="w-64 p-1 bg-slate-800/80 border-slate-700 backdrop-blur-md">
                                            <div className="flex flex-col">
                                                <Popover open={showFileSearch} onOpenChange={setShowFileSearch}>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="ghost" className="w-full justify-start text-sm p-2 h-auto">
                                                            <Plus className="mr-2 h-4 w-4" /> Add Reference
                                                        </Button>
                                                    </PopoverTrigger>
                                                     <PopoverContent container={dialogContentRef.current} className="w-[300px] p-1 bg-slate-900/80 border-slate-700 backdrop-blur-md" side="right" align="start">
                                                        <Input
                                                            placeholder="Search files..."
                                                            value={fileSearchQuery}
                                                            onChange={(e) => setFileSearchQuery(e.target.value)}
                                                            className="mb-1 h-8 bg-slate-800/60 border-slate-600 text-white"
                                                        />
                                                        <ScrollArea className="max-h-60">
                                                            {filteredFiles.map(file => (
                                                                <button
                                                                    key={file.id}
                                                                    onClick={() => handleFileSelect(file)}
                                                                    className="w-full text-left flex items-center gap-2 p-2 rounded-md hover:bg-slate-800 text-sm text-slate-200"
                                                                >
                                                                    <FileText className="w-4 h-4 text-slate-400" />
                                                                    <span className="truncate">{file.name}</span>
                                                                </button>
                                                            ))}
                                                        </ScrollArea>
                                                    </PopoverContent>
                                                </Popover>
                                                {refs.length > 0 && <hr className="border-slate-700 my-1" />}
                                                <ScrollArea className="max-h-40">
                                                    <div className="space-y-1 p-1">
                                                        {refs.map(file => (
                                                            <ReferencedFilePill key={file.id} file={file} onRemove={() => handleRemoveFileRef(page.id, file.id)} />
                                                        ))}
                                                    </div>
                                                </ScrollArea>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                              </div>
                          )})}
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
                      <PopoverContent container={dialogContentRef.current} className="w-auto p-2 bg-slate-900 border-slate-700">
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
                  <ToolbarContent container={dialogContentRef.current} />
                  </motion.div>
              )}
              </AnimatePresence>
          </div>
        </div>
        <div className="relative flex-1 overflow-hidden px-4">
          <BubbleMenu 
            editor={editor} 
            tippyOptions={{ duration: 100, appendTo: () => dialogContentRef.current ?? document.body }} 
            className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl flex gap-1 p-1"
          >
              <EditorToolbarButton icon={Bold} onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} tip="Bold" />
              <EditorToolbarButton icon={Italic} onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} tip="Italic" />
              <EditorToolbarButton icon={Underline} onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} tip="Underline" />
              <EditorToolbarButton icon={Strikethrough} onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} tip="Strikethrough" />
          </BubbleMenu>
         
          <div className="relative h-full overflow-y-auto p-2 rounded-lg bg-black/10">
                 <EditorContent editor={editor} className="h-full" dir="auto" />
          </div>
        </div>
       
        <DialogFooter className="p-4 border-t border-white/10 flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Note</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    {chatContext && (
      <FilePreviewModal
        item={chatContext}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setChatContext(null);
          }
        }}
      />
    )}
    {isDrawing && (
        <DrawingCanvas onSave={handleDrawingSave} onCancel={() => setIsDrawing(false)} />
    )}
   </>
  );
};
