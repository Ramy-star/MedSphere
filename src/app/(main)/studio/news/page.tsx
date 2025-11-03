'use client';
import React, { useRef } from 'react';
import { Editor, EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Download, Pilcrow } from 'lucide-react';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { toPng } from 'html-to-image';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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

    return (
        <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-700">
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
        
        toPng(node, { cacheBust: true, pixelRatio: 2.5, backgroundColor: '#0c1118' })
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
    <div className="flex h-full w-full flex-col items-center justify-start overflow-y-auto">
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
                    "bg-transparent text-white", // Transparent background
                    "p-8 w-[550px]", // Removed min-height
                    "shadow-2xl"
                )}>
                <header className="flex-shrink-0 flex items-center justify-center gap-2 w-full mb-4 pb-4 border-b border-slate-700">
                    <Logo className="h-12 w-12 md:h-16 md:w-16" />
                     <h1 className="text-3xl md:text-4xl font-bold"
                    >
                      <span className="font-extrabold text-white">Med</span><span className="text-[#00D309] font-normal">Sphere</span>
                    </h1>
                </header>

                <div className="flex-1 w-full flex items-center justify-center my-4 relative overflow-y-auto no-scrollbar">
                     <TiptapEditor editor={editor} />
                </div>

                <footer className="flex-shrink-0 text-center text-xs text-slate-500/80 z-10 w-full mt-auto pt-4 border-t border-slate-700">
                    © 2025 MedSphere. All rights reserved.
                </footer>
            </div>
        </div>
    </div>
  );
}
