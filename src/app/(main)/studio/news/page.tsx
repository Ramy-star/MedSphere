'use client';
import React, { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import Paragraph from '@tiptap/extension-paragraph';
import Heading from '@tiptap/extension-heading';
import ListItem from '@tiptap/extension-list-item';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Download,
  Pilcrow,
  ChevronDown,
  ArrowRightLeft,
  Edit,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { toPng } from 'html-to-image';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type SavedImage = {
  id: string;
  dataUrl: string;
  editorContent: string;
  createdAt: string;
};

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

/* ---------- Helpers for selection/block ---------- */
function getSelectedBlock(editor: Editor | null) {
  if (!editor) return null;
  const { state, view } = editor;
  const { $from } = state.selection;
  const depth = $from.depth;

  try {
    const pos = $from.before(depth);
    const dom = view.nodeDOM(pos) as HTMLElement | null;
    if (dom) return { dom, pos, node: $from.node(depth), $from };
  } catch {
    // fallback
  }

  try {
    const head = view.domAtPos($from.pos);
    if (head && head.node instanceof HTMLElement) {
      const pos = $from.before(depth);
      return { dom: head.node as HTMLElement, pos, node: $from.node(depth), $from };
    }
  } catch { /* ignore */ }

  return null;
}

function computeDirForSelection(editor: Editor | null): 'ltr' | 'rtl' {
  if (!editor) return 'ltr';
  const sel = getSelectedBlock(editor);
  if (!sel) return 'ltr';
  const { dom, node } = sel;

  const nodeDir = node?.attrs?.dir;
  if (nodeDir === 'rtl' || nodeDir === 'ltr') return nodeDir;

  const domDir = dom.getAttribute('dir') || dom.style.direction;
  if (domDir) return domDir.toLowerCase() === 'rtl' ? 'rtl' : 'ltr';

  const computed = window.getComputedStyle(dom).direction;
  return (computed && computed.toLowerCase() === 'rtl') ? 'rtl' : 'ltr';
}

function getSelectedTextStyleAttrs(editor: Editor | null) {
  if (!editor) return {};
  try {
    return editor.getAttributes('textStyle') || {};
  } catch {
    return {};
  }
}

/* ---------- Robust apply of textStyle mark (removes old then adds new) ---------- */
function applyTextStyleMark(editor: Editor | null, attrs: Record<string, any>) {
  if (!editor) return;
  const state = editor.state;
  const view = editor.view;
  const markType = state.schema.marks.textStyle;
  if (!markType) return;

  const { from, to, empty } = state.selection;
  let tr = state.tr;

  // remove existing textStyle marks in selection range (avoid conflicting stacked marks)
  tr = tr.removeMark(from, to, markType);

  // create new mark
  try {
    const newMark = markType.create(attrs);
    if (empty) {
      tr = tr.setStoredMarks([newMark]);
    } else {
      tr = tr.addMark(from, to, newMark);
    }
    view.dispatch(tr);
    view.focus();
  } catch {
    // fallback - do nothing
  }
}

/* ---------- Toolbar component ---------- */
const TiptapToolbar = ({ editor, onDownload, onSave }: { editor: Editor | null; onDownload: () => void; onSave: () => Promise<void> }) => {
  const [dirState, setDirState] = useState<'ltr' | 'rtl' | null>(null);
  const [fontSizePt, setFontSizePt] = useState<number>(12);
  const [colorState, setColorState] = useState<string>('#FFFFFF');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!editor) return;
    const updateUi = () => {
      const sel = getSelectedBlock(editor);
      if (!sel) setDirState(null);
      else setDirState(computeDirForSelection(editor));

      const textAttrs = getSelectedTextStyleAttrs(editor);
      if (textAttrs?.fontSize) {
        const m = String(textAttrs.fontSize).match(/([\d.]+)\s*(pt|px)?/i);
        if (m) {
          let val = parseFloat(m[1]);
          const unit = (m[2] || 'pt').toLowerCase();
          if (unit === 'px') val = Math.round((val / 1.333) * 10) / 10;
          setFontSizePt(Number(val));
        }
      } else setFontSizePt(12);

      if (textAttrs?.color) setColorState(textAttrs.color);
      else setColorState('#FFFFFF');
    };

    updateUi();
    editor.on('selectionUpdate', updateUi);
    editor.on('transaction', updateUi);
    return () => {
      editor.off('selectionUpdate', updateUi);
      editor.off('transaction', updateUi);
    };
  }, [editor]);

  if (!editor) return null;

  const toggleDirection = () => {
    const sel = getSelectedBlock(editor);
    if (!sel) return;
    const { node, pos, $from } = sel;
    const state = editor.view.state;
    const tr = state.tr;
    const curDir = (node.attrs && node.attrs.dir) ? node.attrs.dir : computeDirForSelection(editor);
    const newDir = curDir === 'rtl' ? 'ltr' : 'rtl';
    const newAttrs = { ...node.attrs, dir: newDir };
    tr.setNodeMarkup(pos, node.type, newAttrs);
    if (node.type.name === 'list_item') {
      const parentPos = $from.before($from.depth - 1);
      const parentNode = state.doc.nodeAt(parentPos);
      if (parentNode) {
        const parentAttrs = { ...parentNode.attrs, dir: newDir };
        tr.setNodeMarkup(parentPos, parentNode.type, parentAttrs);
      }
    }
    editor.view.dispatch(tr);
    editor.view.focus();
    setDirState(newDir as 'ltr' | 'rtl');
  };

  const handleToggleBulletList = () => {
    (editor.chain() as any).focus().toggleBulletList().run();
    const state = editor.view.state;
    const { $from } = state.selection;
    const parentPos = $from.before($from.depth - 1);
    const parentNode = state.doc.nodeAt(parentPos);
    if (parentNode && parentNode.type.name === 'bullet_list') {
      const dir = computeDirForSelection(editor);
      const tr = state.tr.setNodeMarkup(parentPos, parentNode.type, { ...parentNode.attrs, dir });
      editor.view.dispatch(tr);
      editor.view.focus();
    }
  };

  const handleToggleOrderedList = () => {
    (editor.chain() as any).focus().toggleOrderedList().run();
    const state = editor.view.state;
    const { $from } = state.selection;
    const parentPos = $from.before($from.depth - 1);
    const parentNode = state.doc.nodeAt(parentPos);
    if (parentNode && parentNode.type.name === 'ordered_list') {
      const dir = computeDirForSelection(editor);
      const tr = state.tr.setNodeMarkup(parentPos, parentNode.type, { ...parentNode.attrs, dir });
      editor.view.dispatch(tr);
      editor.view.focus();
    }
  };

  const ColorPicker = () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300" title="Text Color">
          <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: colorState || '#FFFFFF' }} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2 bg-slate-900 border-slate-700">
        <div className="flex gap-1 items-center">
          {['#000000', '#FFFFFF', '#EF4444', '#F97316', '#84CC16', '#22C55E', '#14B8A6', '#0EA5E9', '#6366F1', '#EC4899'].map(color => (
            <button
              key={color}
              onClick={() => {
                try {
                  (editor.chain() as any).focus().setColor(color).run();
                } catch {
                  applyTextStyleMark(editor, { color });
                }
                setColorState(color);
              }}
              className="w-6 h-6 rounded-full border-2"
              style={{ backgroundColor: color, borderColor: colorState === color ? 'white' : 'transparent' }}
            />
          ))}
          <button
            onClick={() => {
              try {
                (editor.chain() as any).focus().unsetColor().run();
              } catch {
                applyTextStyleMark(editor, { color: null });
              }
              setColorState('#FFFFFF');
            }}
            className="text-xs px-2 text-white"
          >
            Reset
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );

  const FontPicker = () => {
    const currentFont = editor.getAttributes('textStyle').fontFamily || '';
    const currentFontName = FONT_FAMILIES.find(f => f.value === currentFont)?.name || 'Default';
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" className="h-6 w-28 md:w-36 justify-between text-slate-300 text-xs md:text-sm">
            <span className="truncate">{currentFontName}</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-1 bg-slate-900 border-slate-700 max-h-60 overflow-y-auto no-scrollbar">
          {FONT_FAMILIES.map(({ name, value }) => (
            <button
              key={name}
              onClick={() => value ? (editor.chain() as any).focus().setFontFamily(value).run() : (editor.chain() as any).focus().unsetFontFamily().run()}
              className={cn("w-full text-left p-2 text-sm rounded-md hover:bg-slate-800 text-white", {
                'bg-slate-700': editor.isActive('textStyle', { fontFamily: value }) || (!value && !editor.getAttributes('textStyle').fontFamily)
              })}
            >
              <span style={{ fontFamily: value || 'inherit' }}>{name}</span>
            </button>
          ))}
        </PopoverContent>
      </Popover>
    );
  };

  const onFontSizeChange = (valuePt: number) => {
    setFontSizePt(valuePt);
    applyTextStyleMark(editor, { fontSize: `${valuePt}pt` });
  };

  const handleSaveClick = async () => {
    try {
      setIsSaving(true);
      await onSave();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full flex items-stretch justify-center sticky top-0 z-50">
      <div className="relative w-full max-w-4xl">
        <div className="bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-md p-2 overflow-hidden">
          <div className="flex items-center">
            <div className="flex-1 min-w-0">
              <div className="overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-2 min-w-max px-1">
                  <FontPicker />
                  <div className="hidden md:block w-px h-6 bg-slate-700 mx-1" />
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300" onClick={() => (editor.chain() as any).focus().toggleBold().run()} data-active={editor.isActive('bold')}><Bold size={16} /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300" onClick={() => (editor.chain() as any).focus().toggleItalic().run()} data-active={editor.isActive('italic')}><Italic size={16} /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300" onClick={() => (editor.chain() as any).focus().toggleUnderline().run()} data-active={editor.isActive('underline')}><UnderlineIcon size={16} /></Button>

                  <div className="w-px h-6 bg-slate-700 mx-1" />

                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300" onClick={() => (editor.chain() as any).focus().setTextAlign('left').run()} data-active={editor.isActive({ textAlign: 'left' })}><AlignLeft size={16} /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300" onClick={() => (editor.chain() as any).focus().setTextAlign('center').run()} data-active={editor.isActive({ textAlign: 'center' })}><AlignCenter size={16} /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300" onClick={() => (editor.chain() as any).focus().setTextAlign('right').run()} data-active={editor.isActive({ textAlign: 'right' })}><AlignRight size={16} /></Button>

                  <div className="w-px h-6 bg-slate-700 mx-1" />

                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300" onClick={handleToggleBulletList} data-active={editor.isActive('bulletList')}><List size={16} /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300" onClick={handleToggleOrderedList} data-active={editor.isActive('orderedList')}><ListOrdered size={16} /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300" onClick={() => (editor.chain() as any).focus().setHorizontalRule().run()}><Pilcrow size={16} /></Button>

                  <ColorPicker />

                  <div className="flex items-center gap-2 px-2 bg-slate-800 rounded-md ml-1">
                    <div className="text-xs text-slate-300 px-1 hidden sm:block">{Math.round(fontSizePt)} pt</div>
                    <input
                      aria-label="Font size"
                      type="range"
                      min={6}
                      max={72}
                      value={fontSizePt}
                      onChange={(e) => onFontSizeChange(Number(e.target.value))}
                      onInput={(e) => onFontSizeChange(Number((e.target as HTMLInputElement).value))}
                      className="h-1 w-36"
                    />
                    <div className="hidden sm:flex gap-1">
                      <button onClick={() => onFontSizeChange(Math.max(6, Math.round(fontSizePt) - 1))} className="w-6 h-6 rounded bg-slate-700 text-white">−</button>
                      <button onClick={() => onFontSizeChange(Math.min(72, Math.round(fontSizePt) + 1))} className="w-6 h-6 rounded bg-slate-700 text-white">+</button>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-8 w-8 text-slate-300 ml-1", { 'bg-slate-700': dirState === 'rtl' })}
                    onClick={toggleDirection}
                    title="Toggle RTL / LTR for selected line"
                    data-active={dirState === 'rtl'}
                  >
                    <ArrowRightLeft size={16} />
                  </Button>
                </div>
              </div>
            </div>

            {/* download + save buttons ثابتين على اليمين (ضمن نفس الcontainer) */}
            <div className="flex-none ml-3 flex items-center gap-2">
              <Button
                onClick={onDownload}
                className="h-9 px-3 rounded-md bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                title="Download PNG"
                style={{ borderRadius: 8 }}
              >
                <Download className="h-5 w-5 text-white" />
                <span className="hidden md:inline text-white">Download</span>
              </Button>

              <Button
                onClick={async () => {
                  await handleSaveClick();
                }}
                className="h-9 px-3 rounded-md bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2"
                title="Save image"
                style={{ borderRadius: 10 }}
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Edit className="h-4 w-4 text-white" />}
                <span className="hidden md:inline text-white">Save</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------- Editor content ---------- */
const TiptapEditor = ({ editor }: { editor: any }) => {
  return (
    <EditorContent
      editor={editor}
      className="w-full p-3 prose prose-lg dark:prose-invert focus:outline-none max-w-none"
      style={{ minHeight: 28, padding: '10px 12px' }}
    />
  );
};

/* ---------- Main page with tabs and saved images ---------- */
export default function NewsComposerPage() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [savedImages, setSavedImages] = useState<SavedImage[]>([]);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'saved'>('editor');
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('savedStudioImages');
      if (stored) setSavedImages(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const saveImagesToStorage = (images: SavedImage[]) => {
    try {
      localStorage.setItem('savedStudioImages', JSON.stringify(images));
    } catch {
      // ignore
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        horizontalRule: {
          HTMLAttributes: {
            class: 'my-4 border-slate-600',
          },
        },
      }),

      Paragraph.extend({
        addAttributes() {
          return {
            dir: {
              default: null,
              parseHTML: (el: HTMLElement) => el.getAttribute('dir') || null,
              renderHTML: (attrs: any) => {
                if (!attrs.dir) return {};
                return { dir: attrs.dir, style: `direction:${attrs.dir};text-align:${attrs.dir === 'rtl' ? 'right' : 'left'}` };
              },
            },
            ...this.parent?.(),
          };
        },
      }),
      Heading.extend({
        addAttributes() {
          return {
            dir: {
              default: null,
              parseHTML: (el: HTMLElement) => el.getAttribute('dir') || null,
              renderHTML: (attrs: any) => {
                if (!attrs.dir) return {};
                return { dir: attrs.dir, style: `direction:${attrs.dir};text-align:${attrs.dir === 'rtl' ? 'right' : 'left'}` };
              },
            },
            ...this.parent?.(),
          };
        },
      }),
      ListItem.extend({
        addAttributes() {
          return {
            dir: {
              default: null,
              parseHTML: (el: HTMLElement) => el.getAttribute('dir') || null,
              renderHTML: (attrs: any) => {
                if (!attrs.dir) return {};
                return { dir: attrs.dir, style: `direction:${attrs.dir};text-align:${attrs.dir === 'rtl' ? 'right' : 'left'}` };
              },
            },
            ...this.parent?.(),
          };
        },
      }),
      BulletList.extend({
        addAttributes() {
          return {
            dir: {
              default: null,
              parseHTML: (el: HTMLElement) => el.getAttribute('dir') || null,
              renderHTML: (attrs: any) => {
                if (!attrs.dir) return {};
                return { dir: attrs.dir, style: `direction:${attrs.dir};` };
              },
            },
            ...this.parent?.(),
          };
        },
      }),
      OrderedList.extend({
        addAttributes() {
          return {
            dir: {
              default: null,
              parseHTML: (el: HTMLElement) => el.getAttribute('dir') || null,
              renderHTML: (attrs: any) => {
                if (!attrs.dir) return {};
                return { dir: attrs.dir, style: `direction:${attrs.dir};` };
              },
            },
            ...this.parent?.(),
          };
        },
      }),

      Underline,
      TextStyle,
      (Color as any).configure({ types: ['textStyle'] }),
      FontFamily.configure({ types: ['textStyle'] }),
      TextAlign.configure({
        types: ['heading', 'paragraph', 'list_item'],
        defaultAlignment: 'left',
      }),
    ],

    content: `
          <h2>Major Update!</h2>
          <p>We're excited to announce a new feature that will revolutionize your study workflow.</p>
          <ul>
            <li>Feature A</li>
            <li>Feature B</li>
            <li>Feature C</li>
          </ul>
          <p>Stay tuned for more details!</p>
        `,

    editorProps: {
      attributes: {
        class: 'focus:outline-none',
      },
    },
  });

  /* Download handler (higher quality) */
  const handleDownload = async () => {
    const node = canvasRef.current;
    if (!node) return;
    setIsDownloading(true);
    try {
      const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 4 });
      const link = document.createElement('a');
      link.download = 'medsphere-announcement.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('download error', err);
    } finally {
      setIsDownloading(false);
    }
  };

  /* Save handler: captures PNG and pushes to savedImages */
  const handleSave = async () => {
    const node = canvasRef.current;
    if (!node || !editor) return;
    try {
      const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 4 });
      const newImg: SavedImage = {
        id: `img_${Date.now()}`,
        dataUrl,
        editorContent: editor.getHTML(),
        createdAt: new Date().toISOString(),
      };
      const updated = [newImg, ...savedImages];
      setSavedImages(updated);
      saveImagesToStorage(updated);
      setActiveTab('saved');
    } catch (err) {
      console.error('save error', err);
      throw err;
    }
  };

  const handleDeleteImage = (id: string) => {
    const updated = savedImages.filter(i => i.id !== id);
    setSavedImages(updated);
    saveImagesToStorage(updated);
  };

  const handleEditImage = (image: SavedImage) => {
    if (editor) {
      editor.commands.setContent(image.editorContent);
      setActiveTab('editor');
    }
  };

  return (
    <div className="h-screen w-full overflow-y-auto bg-slate-900/10 p-4">
      <div className="mx-auto max-w-4xl">
        {/* tabs */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setActiveTab('editor')}
            className={cn("px-4 py-2 rounded-t-md border-b-2", { 'bg-slate-800 text-white border-slate-600': activeTab === 'editor', 'bg-transparent text-slate-400 border-transparent': activeTab !== 'editor' })}
          >
            Editor
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={cn("px-4 py-2 rounded-t-md border-b-2", { 'bg-slate-800 text-white border-slate-600': activeTab === 'saved', 'bg-transparent text-slate-400 border-transparent': activeTab !== 'saved' })}
          >
            Saved Images ({savedImages.length})
          </button>
        </div>

        {/* toolbar (visible in both tabs, but we can hide if desired) */}
        <TiptapToolbar editor={editor} onDownload={handleDownload} onSave={handleSave} />

        {/* content area */}
        <div className="w-full flex justify-center py-6">
          {activeTab === 'editor' ? (
            <div
              ref={canvasRef}
              className={cn(
                "relative flex flex-col items-center text-center",
                "bg-gradient-to-br from-slate-800 to-emerald-950 text-white",
                "py-2 px-2 w-full max-w-[550px]",
                "shadow-2xl"
              )}
              style={{ borderRadius: 0 }} // sharp 90deg corners
            >
              <header className="flex items-center justify-center gap-1 w-full mb-0 pb-2 border-b border-slate-700">
                <Logo className="h-10 w-10 md:h-12 md:w-12" />
                <h1 className="text-2xl md:text-3xl font-bold">
                  <span className="font-extrabold text-white">Med</span><span className="text-[#00D309] font-normal">Sphere</span>
                </h1>
              </header>

              <div className="w-full">
                <TiptapEditor editor={editor} />
              </div>

              <footer className="flex-shrink-0 text-center text-xs text-slate-300/80 z-10 w-full mt-4 pt-2 border-t border-slate-700">
                © 2025 MedSphere. All rights reserved.
              </footer>
            </div>
          ) : (
            <div className="w-full max-w-[960px]">
              {savedImages.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {savedImages.map(img => (
                    <div key={img.id} className="relative bg-slate-800 rounded-md overflow-hidden">
                      <img src={img.dataUrl} alt={img.createdAt} className="w-full h-48 object-cover" />
                      <div className="p-2 flex items-center justify-between bg-black/40">
                        <div className="text-xs text-slate-100">{new Date(img.createdAt).toLocaleString()}</div>
                        <div className="flex items-center gap-2">
                          <a href={img.dataUrl} download={`medsphere-${img.id}.png`} className="text-slate-100">
                            <Button variant="outline" size="icon"><Download size={16} /></Button>
                          </a>
                          <Button variant="outline" size="icon" onClick={() => handleEditImage(img)}><Edit size={16} /></Button>
                          <Button variant="destructive" size="icon" onClick={() => handleDeleteImage(img.id)}><Trash2 size={16} /></Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-slate-400 mt-8">
                  <p>No saved images yet.</p>
                  <p className="text-sm">Use <strong>Save</strong> to store designs here.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
