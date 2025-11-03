'use client';
import React, { useRef } from 'react';
import { Editor, EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Download, Pilcrow, ChevronDown } from 'lucide-react';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { toPng } from 'html-to-image';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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

const TiptapToolbar = ({ editor }: { editor: Editor | null }) => {
    if (!editor) return null;

    const ColorPicker = () => (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300" title="Text Color">
             <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: editor.getAttributes('textStyle').color || 'white' }} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2 bg-slate-900 border-slate-700">
          <div className="flex gap-1">
            {['#FFFFFF', '#000000', '#EF4444', '#F97316', '#84CC16', '#22C55E', '#14B8A6', '#0EA5E9', '#6366F1', '#EC4899'].map(color => (
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

    const FontPicker = () => {
        const currentFont = editor.getAttributes('textStyle').fontFamily || '';
        const currentFontName = FONT_FAMILIES.find(f => f.value === currentFont)?.name || 'Default';
        return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" className="h-8 w-40 justify-between text-slate-300">
                    <span className="truncate">{currentFontName}</span>
                    <ChevronDown className="h-4 w-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-1 bg-slate-900 border-slate-700 max-h-60 overflow-y-auto no-scrollbar">
                {FONT_FAMILIES.map(({ name, value }) => (
                    <button
                        key={name}
                        onClick={() => value ? editor.chain().focus().setFontFamily(value).run() : editor.chain().focus().unsetFontFamily().run()}
                        className={cn("w-full text-left p-2 text-sm rounded-md hover:bg-slate-800 text-white", {
                            'bg-slate-700': editor.isActive('textStyle', { fontFamily: value }) || (!value && !editor.getAttributes('textStyle').fontFamily)
                        })}
                    >
                        <span style={{ fontFamily: value || 'inherit' }}>{name}</span>
                    </button>
                ))}
            </PopoverContent>
        </Popover>
    )};

    return (
        <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-700">
            <FontPicker />
            <div className="w-px h-6 bg-slate-700 mx-1" />
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 data-[active=true]:bg-slate-700" onClick={() => editor.chain().focus().toggleBold().run()} data-active={editor.isActive('bold')}><Bold size={16}/></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 data-[active=true]:bg-slate-700" onClick={() => editor.chain().focus().toggleItalic().run()} data-active={editor.isActive('italic')}><Italic size={16}/></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 data-[active=true]:bg-slate-700" onClick={() => editor.chain().focus().toggleUnderline().run()} data-active={editor.isActive('underline')}><UnderlineIcon size={16}/></Button>
            <div className="w-px h-6 bg-slate-700 mx-1" />
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 data-[active=true]:bg-slate-700" onClick={() => editor.chain().focus().setTextAlign('left').run()} data-active={editor.isActive({ textAlign: 'left' })}><AlignLeft size={16}/></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 data-[active=true]:bg-slate-700" onClick={() => editor.chain().focus().setTextAlign('center').run()} data-active={editor.isActive({ textAlign: 'center' })}><AlignCenter size={16}/></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 data-[active=true]:bg-slate-700" onClick={() => editor.chain().focus().setTextAlign('right').run()} data-active={editor.isActive({ textAlign: 'right' })}><AlignRight size={16}/></Button>
            <div className="w-px h-6 bg-slate-700 mx-1" />
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 data-[active=true]:bg-slate-700" onClick={() => editor.chain().focus().toggleBulletList().run()} data-active={editor.isActive('bulletList')}><List size={16}/></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 data-[active=true]:bg-slate-700" onClick={() => editor.chain().focus().toggleOrderedList().run()} data-active={editor.isActive('orderedList')}><ListOrdered size={16}/></Button>
             <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Pilcrow size={16}/></Button>
            <ColorPicker />
        </div>
    );
};

const TiptapEditor = ({ editor }: { editor: Editor | null }) => {
  return (
    <EditorContent 
        editor={editor} 
        className="w-full p-4"
    />
  );
};


export default function NewsComposerPage() {
    const canvasRef = useRef<HTMLDivElement>(null);

    const editor = useEditor({
        extensions: [
          StarterKit.configure({
            horizontalRule: {
              HTMLAttributes: {
                class: 'my-4 border-slate-600',
              },
            },
          }),
          Underline,
          TextStyle,
          Color,
          FontFamily,
          TextAlign.configure({
            types: ['heading', 'paragraph'],
            defaultAlignment: 'center',
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
            class: 'prose prose-lg dark:prose-invert focus:outline-none max-w-none text-center',
          },
        },
    });


    const handleDownload = () => {
        const node = canvasRef.current;
        if (!node) return;
        
        toPng(node, { cacheBust: true, pixelRatio: 2.5 })
            .then((dataUrl) => {
                const link = document.createElement('a');
                link.download = 'medsphere-announcement.png';
                link.href = dataUrl;
                link.click();
            })
            .catch((err) => {
                console.error('oops, something went wrong!', err);
            });
    };

  return (
    <div className="flex h-full w-full flex-col items-center justify-start overflow-y-auto no-scrollbar">
        <div className="flex-shrink-0 flex items-center gap-4 py-4 z-20 sticky top-0 w-full justify-center">
            <TiptapToolbar editor={editor} />
            <Button onClick={handleDownload} className="h-12 rounded-lg bg-blue-600 hover:bg-blue-700">
                <Download className="mr-2 h-4 w-4" />
                Download PNG
            </Button>
        </div>

        <div className="w-full flex-grow flex justify-center py-4">
            <div
                ref={canvasRef}
                className={cn(
                    "relative flex flex-col items-center text-center",
                    "bg-gradient-to-br from-slate-800 to-emerald-950 text-white",
                    "py-6 px-8 w-[550px]",
                    "shadow-2xl"
                )}>
                <header className="flex-shrink-0 flex items-center justify-center gap-2 w-full mb-2 pb-2 border-b border-slate-700">
                    <Logo className="h-10 w-10 md:h-12 md:w-12" />
                     <h1 className="text-2xl md:text-3xl font-bold"
                    >
                      <span className="font-extrabold text-white">Med</span><span className="text-[#00D309] font-normal">Sphere</span>
                    </h1>
                </header>

                <div className="flex-1 w-full flex items-center justify-center my-4 relative overflow-y-auto no-scrollbar min-h-[400px]">
                     <TiptapEditor editor={editor} />
                </div>

                <footer className="flex-shrink-0 text-center text-xs text-slate-500/80 z-10 w-full mt-auto pt-2 border-t border-slate-700">
                    © 2025 MedSphere. All rights reserved.
                </footer>
            </div>
        </div>
    </div>
  );
}
