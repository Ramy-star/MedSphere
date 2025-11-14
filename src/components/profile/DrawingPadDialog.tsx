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
import { useEffect } from 'react';

// The Tldraw component must have a child component that uses the useEditor hook.
function SaveButton({ onSave, onClose }: { onSave: (dataUrl: string) => void, onClose: () => void }) {
    const editor = useEditor();

    const handleSave = async () => {
        if (!editor) return;

        try {
            // This is safer than `currentPageShapeIds` which can be undefined.
            const shapeIds = editor.shapesArray ? editor.shapesArray.map((shape) => shape.id) : [];

            // If there are no shapes, just close the dialog without saving.
            if (shapeIds.length === 0) {
                onClose();
                return;
            }

            const blob = await editor.exportToBlob({
                ids: shapeIds,
                format: 'png',
                scale: 2,
            });
            
            if (!blob) {
                console.error("Failed to get blob from tldraw");
                return;
            }

            // Convert blob to data URL to insert into the editor
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64data = reader.result;
                if (base64data) {
                    onSave(base64data as string);
                } else {
                     console.error("Failed to convert blob to data URL");
                }
            };
            reader.readAsDataURL(blob);

        } catch (e) {
            console.error("Error saving drawing:", e);
        }
    }

    return (
        <div className="absolute bottom-4 right-4 z-[9999]">
            <Button onClick={handleSave}>Insert Drawing</Button>
        </div>
    )
}

export function DrawingPadDialog({ onSave, onClose }: { onSave: (dataUrl: string) => void; onClose: () => void }) {
    
    return (
        <Dialog open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-4xl w-[90vw] h-[85vh] flex flex-col p-0 glass-card">
                <DialogHeader className="p-4 border-b border-slate-700">
                    <DialogTitle>Drawing Pad</DialogTitle>
                </DialogHeader>
                <div className="flex-1 relative">
                    <Tldraw>
                        <SaveButton onSave={onSave} onClose={onClose} />
                    </Tldraw>
                </div>
            </DialogContent>
        </Dialog>
    )
}
