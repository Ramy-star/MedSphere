'use client'
import React, { useRef } from 'react';
import dynamic from 'next/dynamic';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ExcalidrawAPIRef } from './DrawingPadDialog'; // Re-use the type definition

// Correctly import the Excalidraw component for Next.js
const Excalidraw = dynamic(
  async () => (await import('@excalidraw/excalidraw-next')).Excalidraw,
  { ssr: false }
);

export function ExcalidrawDialog({ onSave, onClose }: { onSave: (dataUrl: string) => void; onClose: () => void }) {
    const excalidrawApiRef = useRef<ExcalidrawAPIRef | null>(null);

    const handleSave = async () => {
        if (!excalidrawApiRef.current) {
            console.error("Excalidraw API not available.");
            return;
        }

        try {
            // The exportToBlob function must be imported dynamically as well.
            const { exportToBlob } = await import('@excalidraw/excalidraw');
            
            const elements = excalidrawApiRef.current.getSceneElements();
            
            if (!elements || elements.length === 0) {
              onClose();
              return;
            }

            const blob = await exportToBlob({
                elements: elements,
                appState: excalidrawApiRef.current.getAppState(),
                files: excalidrawApiRef.current.getFiles(),
                exportPadding: 10,
            });
            
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64data = reader.result;
                if (base64data) {
                    onSave(base64data as string);
                } else {
                    console.error("Failed to convert Excalidraw blob to data URL");
                }
                onClose();
            };
            reader.readAsDataURL(blob);

        } catch (error) {
            console.error("Error exporting from Excalidraw:", error);
            onClose();
        }
    };

    return (
        <Dialog open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-4xl w-[90vw] h-[85vh] flex flex-col p-0 glass-card">
                <DialogHeader className="p-4 border-b border-slate-700">
                    <DialogTitle>Excalidraw Pad</DialogTitle>
                </DialogHeader>
                <div className="flex-1 relative">
                    <Excalidraw excalidrawAPI={(api) => (excalidrawApiRef.current = api as ExcalidrawAPIRef)} theme="dark" />
                </div>
                 <DialogFooter className="p-4 border-t border-slate-700">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>Insert Drawing</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
