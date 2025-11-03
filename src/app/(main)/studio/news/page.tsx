'use client';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Editor, EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Download, Pilcrow, ChevronDown, Trash2, Edit, Loader2 } from 'lucide-react';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { toPng } from 'html-to-image';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const FONT_FAMILIES = [
    { name: 'Default', value: 'Inter, sans-serif' },
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

type SavedImage = {
    id: string;
    dataUrl: string;
    editorContent: string;
    createdAt: string;
};

// Function to fetch and embed Google Fonts
async function embedGoogleFonts(): Promise<string> {
    const googleFonts = FONT_FAMILIES.filter(f => f.value.includes(', sans-serif') || f.value.includes(', serif')).map(f => f.name.replace(' ', '+'));
    if(googleFonts.length === 0) return '';
    
    const fontUrl = `https://fonts.googleapis.com/css2?family=${googleFonts.join('&family=')}&display=swap`;

    try {
        const cssText = await fetch(fontUrl).then(res => res.text());
        const resourceUrls = cssText.match(/url\(.+?\)/g) || [];

        const fontPromises = resourceUrls.map(async (url) => {
            const fontUrl = url.replace(/url\((['"]?)(.*?)\1\)/g, '$2');
            const response = await fetch(fontUrl);
            if (!response.ok) throw new Error('Failed to fetch font');
            const blob = await response.blob();
            return new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        });

        const base64Fonts = await Promise.all(fontPromises);
        let embeddedCss = cssText;
        resourceUrls.forEach((url, i) => {
            embeddedCss = embeddedCss.replace(url, `url(${base64Fonts[i]})`);
        });

        return embeddedCss;
    } catch (error) {
        console.error('Error embedding fonts:', error);
        return ''; // Return empty string on failure
    }
}


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
    const [savedImages, setSavedImages] = useState<SavedImage[]>([]);
    const [imageToDelete, setImageToDelete] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        try {
            const storedImages = localStorage.getItem('savedStudioImages');
            if (storedImages) {
                setSavedImages(JSON.parse(storedImages));
            }
        } catch (error) {
            console.error("Failed to load saved images from localStorage", error);
        }
    }, []);

    const saveImagesToStorage = (images: SavedImage[]) => {
        try {
            localStorage.setItem('savedStudioImages', JSON.stringify(images));
        } catch (error) {
            console.error("Failed to save images to localStorage", error);
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
          Underline,
          TextStyle,
          Color,
          FontFamily.configure({
            types: ['textStyle'],
          }),
          TextAlign.configure({
            types: ['heading', 'paragraph', 'list_item'],
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
          // Add direction attribute based on alignment
          transformPastedHTML(html) {
            const container = document.createElement('div');
            container.innerHTML = html;
            container.querySelectorAll('[style*="text-align: right"]').forEach(el => {
              (el as HTMLElement).setAttribute('dir', 'rtl');
            });
            return container.innerHTML;
          },
        },
    });

    const handleDownload = async () => {
        const node = canvasRef.current;
        if (!node || !editor) return;

        setIsLoading(true);
        try {
            const fontCSS = await embedGoogleFonts();
            const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 2.5, fontEmbedCSS: fontCSS });
            
            // Save to state and localStorage
            const newImage: SavedImage = {
                id: `img_${Date.now()}`,
                dataUrl,
                editorContent: editor.getHTML(),
                createdAt: new Date().toISOString(),
            };
            const updatedImages = [newImage, ...savedImages];
            setSavedImages(updatedImages);
            saveImagesToStorage(updatedImages);

            // Trigger download
            const link = document.createElement('a');
            link.download = 'medsphere-announcement.png';
            link.href = dataUrl;
            link.click();

        } catch (err) {
            console.error('Oops, something went wrong!', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteImage = () => {
        if (!imageToDelete) return;
        const updatedImages = savedImages.filter(img => img.id !== imageToDelete);
        setSavedImages(updatedImages);
        saveImagesToStorage(updatedImages);
        setImageToDelete(null);
    };

    const handleEditImage = (image: SavedImage) => {
        if(editor) {
            editor.commands.setContent(image.editorContent);
        }
        // Switch to editor tab
        const editorTrigger = document.querySelector('[data-radix-collection-item][value="editor"]') as HTMLElement | null;
        editorTrigger?.click();
    };


  return (
    <div className="flex h-full w-full flex-col items-center">
        <Tabs defaultValue="editor" className="w-full flex-1 flex flex-col">
            <TabsList className="mx-auto mt-4">
                <TabsTrigger value="editor">Editor</TabsTrigger>
                <TabsTrigger value="saved">Saved Images</TabsTrigger>
            </TabsList>
            <TabsContent value="editor" className="flex-1 flex flex-col overflow-hidden">
                <div className="flex h-full w-full flex-col items-center justify-start overflow-y-auto no-scrollbar">
                    <div className="flex-shrink-0 flex items-center gap-4 py-4 z-20 sticky top-0 w-full justify-center">
                        <TiptapToolbar editor={editor} />
                        <Button onClick={handleDownload} disabled={isLoading} className="h-12 rounded-lg bg-blue-600 hover:bg-blue-700">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            Download PNG
                        </Button>
                    </div>

                    <div className="w-full flex-grow flex justify-center py-4">
                        <div
                            ref={canvasRef}
                            className={cn(
                                "relative flex flex-col items-center text-center",
                                "bg-gradient-to-br from-slate-900 to-emerald-950 text-white",
                                "py-2 px-3 w-[550px]",
                                "shadow-2xl"
                            )}>
                            <header className="flex-shrink-0 flex items-center justify-center gap-2 w-full mb-2 pb-2 border-b border-slate-700">
                                <Logo className="h-10 w-10 md:h-12 md:w-12" />
                                 <h1 className="text-2xl md:text-3xl font-bold">
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
            </TabsContent>
            <TabsContent value="saved" className="flex-1 overflow-y-auto p-6">
                 <h2 className="text-2xl font-bold text-white text-center mb-6">Saved Images</h2>
                 {savedImages.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {savedImages.map(image => (
                            <div key={image.id} className="group relative glass-card rounded-lg overflow-hidden">
                                <img src={image.dataUrl} alt={`Saved design from ${new Date(image.createdAt).toLocaleString()}`} className="w-full h-auto object-cover" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                     <a href={image.dataUrl} download={`medsphere-${image.id}.png`}>
                                        <Button variant="outline" size="icon"><Download size={18}/></Button>
                                    </a>
                                     <Button variant="outline" size="icon" onClick={() => handleEditImage(image)}><Edit size={18} /></Button>
                                     <Button variant="destructive" size="icon" onClick={() => setImageToDelete(image.id)}><Trash2 size={18} /></Button>
                                </div>
                            </div>
                        ))}
                    </div>
                 ) : (
                    <div className="text-center text-slate-400 mt-16">
                        <p>No saved images yet.</p>
                        <p className="text-sm">Downloaded images will appear here.</p>
                    </div>
                 )}
            </TabsContent>
        </Tabs>

        <AlertDialog open={!!imageToDelete} onOpenChange={() => setImageToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the saved image. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteImage} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
