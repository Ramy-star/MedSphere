'use client'
import React from 'react';
import dynamic from 'next/dynamic';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// Dynamically import Excalidraw with SSR turned off
const Excalidraw = dynamic(
  async () => (await import('@excalidraw/excalidraw')).Excalidraw,
  { ssr: false }
);

export function ExcalidrawDialog({ onSave, onClose }: { onSave: (dataUrl: string) => void; onClose: () => void }) {
    let excalidrawAPI: any = null;

    const handleSave = async () => {
        if (!excalidrawAPI) return;
        try {
            const { exportToBlob } = await import('@excalidraw/excalidraw');
            const blob = await exportToBlob({
                elements: excalidrawAPI.getSceneElements(),
                appState: excalidrawAPI.getAppState(),
                files: excalidrawAPI.getFiles(),
                exportPadding: 10,
            });
            
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64data = reader.result;
                onSave(base64data as string);
                onClose();
            };
            reader.readAsDataURL(blob);

        } catch (error) {
            console.error("Error exporting from Excalidraw:", error);
        }
    };

    return (
        <Dialog open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-4xl w-[90vw] h-[85vh] flex flex-col p-0 glass-card">
                <DialogHeader className="p-4 border-b border-slate-700">
                    <DialogTitle>Excalidraw Pad</DialogTitle>
                </DialogHeader>
                <div className="flex-1 relative">
                    <Excalidraw 
                        excalidrawAPI={(api) => (excalidrawAPI = api)}
                        theme="dark"
                    />
                </div>
                 <DialogFooter className="p-4 border-t border-slate-700">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>Insert Drawing</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
