'use client'
import { Tldraw, useEditor } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function DrawingPadDialog({ onSave, onClose }: { onSave: (dataUrl: string) => void; onClose: () => void }) {
    
    return (
        <Dialog open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-4xl w-[90vw] h-[85vh] flex flex-col p-0 glass-card">
                <DialogHeader className="p-4 border-b border-slate-700">
                    <DialogTitle>Drawing Pad</DialogTitle>
                </DialogHeader>
                <div className="flex-1 relative">
                   <TldrawEditor onSave={onSave} />
                </div>
            </DialogContent>
        </Dialog>
    )
}

function TldrawEditor({ onSave }: { onSave: (dataUrl: string) => void }) {
    const editor = useEditor()
    
    const handleSave = async () => {
        if (!editor) return;

        try {
            const svg = await editor.getSvg(Array.from(editor.currentPageShapeIds), {
                scale: 2,
                background: false, // Transparent background
            });
            if (!svg) {
                console.error("Failed to get SVG from tldraw");
                return;
            }

            // To convert SVG to PNG, we need to render it on a canvas
            const image = new Image();
            const svgBlob = new Blob([svg.outerHTML], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);
            
            image.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = svg.width.baseVal.value * 2;
                canvas.height = svg.height.baseVal.value * 2;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
                    const pngUrl = canvas.toDataURL('image/png');
                    onSave(pngUrl);
                }
                URL.revokeObjectURL(url);
            };

            image.onerror = (e) => {
                console.error("Error loading SVG image for conversion", e);
                URL.revokeObjectURL(url);
            }

            image.src = url;

        } catch (e) {
            console.error("Error saving drawing:", e);
        }
    }

    return (
        <div className='w-full h-full'>
            <Tldraw />
            <div className="absolute bottom-4 right-4 z-[9999]">
                 <Button onClick={handleSave}>Insert Drawing</Button>
            </div>
        </div>
    )
}
