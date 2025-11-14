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
import { exportToBlob } from '@excalidraw/excalidraw';

// Dynamically import Excalidraw with SSR turned off
const Excalidraw = dynamic(
  async () => (await import('@excalidraw/excalidraw')).Excalidraw,
  { ssr: false }
);

export function ExcalidrawDialog({ onSave, onClose }: { onSave: (dataUrl: string) => void; onClose: () => void }) {
    const excalidrawRef = useRef<any>(null);

    const handleSave = async () => {
        if (!excalidrawRef.current) {
            console.error("Excalidraw API not available.");
            return;
        }

        try {
            const blob = await exportToBlob({
                elements: excalidrawRef.current.getSceneElements(),
                appState: excalidrawRef.current.getAppState(),
                files: excalidrawRef.current.getFiles(),
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
                        excalidrawAPI={(api) => (excalidrawRef.current = api)}
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
