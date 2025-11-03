'use client';
import React, { useRef } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Download } from 'lucide-react';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { toPng } from 'html-to-image';
import { cn } from '@/lib/utils';

const Tiptap = () => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
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

  const floatingMenu = editor && (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-700">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300" onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={16}/></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300" onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={16}/></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300" onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon size={16}/></Button>
        <div className="w-px h-6 bg-slate-700 mx-1" />
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300" onClick={() => editor.chain().focus().setTextAlign('left').run()}><AlignLeft size={16}/></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300" onClick={() => editor.chain().focus().setTextAlign('center').run()}><AlignCenter size={16}/></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300" onClick={() => editor.chain().focus().setTextAlign('right').run()}><AlignRight size={16}/></Button>
        <div className="w-px h-6 bg-slate-700 mx-1" />
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300" onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={16}/></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300" onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={16}/></Button>
        <input
            type="color"
            onInput={(event: React.ChangeEvent<HTMLInputElement>) => editor.chain().focus().setColor(event.target.value).run()}
            value={editor.getAttributes('textStyle').color || '#ffffff'}
            className="w-8 h-8 bg-transparent border-none cursor-pointer"
            title="Text color"
        />
    </div>
  );

  return (
    <>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        {floatingMenu}
      </div>
      <EditorContent editor={editor} />
    </>
  );
};


export default function NewsComposerPage() {
    const canvasRef = useRef<HTMLDivElement>(null);
    const downloadButtonRef = useRef<HTMLButtonElement>(null);

    const handleDownload = () => {
        if (!canvasRef.current) return;

        const downloadButton = downloadButtonRef.current;

        // Hide button before capturing
        if (downloadButton) downloadButton.style.display = 'none';

        toPng(canvasRef.current, { cacheBust: true, pixelRatio: 2 })
            .then((dataUrl) => {
                const link = document.createElement('a');
                link.download = 'medsphere-announcement.png';
                link.href = dataUrl;
                link.click();
                 // Show button again after capture
                if (downloadButton) downloadButton.style.display = 'flex';
            })
            .catch((err) => {
                console.error('oops, something went wrong!', err);
                 // Show button again if there's an error
                if (downloadButton) downloadButton.style.display = 'flex';
            });
    };

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-background p-4 overflow-hidden">
        <div className="absolute top-0 left-0 -translate-x-1/3 -translate-y-1/3 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute bottom-0 right-0 translate-x-1/3 translate-y-1/3 w-96 h-96 bg-green-500/20 rounded-full blur-3xl opacity-50"></div>

        <div className="relative z-10 group" ref={canvasRef}>
            <div className="relative flex flex-col items-center text-center glass-card p-8 md:p-12 rounded-[1.75rem] w-[500px] h-[700px]">
                <div className="flex-shrink-0">
                    <Logo className="h-20 w-20 md:h-24 md:w-24 mb-6" />
                     <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-white to-slate-300 text-transparent bg-clip-text"
                    >
                      <span className="font-extrabold">Med</span><span className="text-[#00D309] font-normal">Sphere</span>
                    </h1>
                </div>

                <div className="flex-1 w-full flex items-center justify-center my-8 relative">
                    <Tiptap />
                </div>

                <footer className="flex-shrink-0 text-center text-xs text-slate-500 z-10 w-full">
                    © 2025 MedSphere. All rights reserved.
                </footer>

                 <Button 
                    ref={downloadButtonRef}
                    onClick={handleDownload}
                    className="absolute bottom-6 right-6 h-12 w-12 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 hover:bg-blue-700"
                    size="icon"
                >
                    <Download />
                </Button>
            </div>
        </div>
    </div>
  );
}
