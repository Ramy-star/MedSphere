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

// Define the type for the Excalidraw API reference
type ExcalidrawAPIRef = {
    getSceneElements: () => any[];
    getAppState: () => any;
    getFiles: () => any;
};

// Dynamically import the Excalidraw component, ensuring it's only loaded on the client.
const Excalidraw = dynamic(
  async () => (await import('@excalidraw/excalidraw')).Excalidraw,
  { ssr: false }
);


export function ExcalidrawDialog({ onSave, onClose }: { onSave: (dataUrl: string) => void; onClose: () => void }) {
    // Use useRef to hold a reference to the Excalidraw API instance.
    const excalidrawApiRef = useRef<ExcalidrawAPIRef | null>(null);

    const handleSave = async () => {
        // Ensure the API ref has been set.
        if (!excalidrawApiRef.current) {
            console.error("Excalidraw API not available.");
            return;
        }

        try {
            // Dynamically import the export function only when needed.
            const { exportToBlob } = await import('@excalidraw/excalidraw');
            
            const elements = excalidrawApiRef.current.getSceneElements();
            
            // If the canvas is empty, just close the dialog.
            if (!elements || elements.length === 0) {
              onClose();
              return;
            }

            // Export the scene to a blob.
            const blob = await exportToBlob({
                elements: elements,
                appState: excalidrawApiRef.current.getAppState(),
                files: excalidrawApiRef.current.getFiles(),
                exportPadding: 10,
            });
            
            // Convert the blob to a base64 Data URL.
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64data = reader.result;
                if (base64data) {
                    onSave(base64data as string);
                } else {
                    console.error("Failed to convert Excalidraw blob to data URL");
                }
                onClose(); // Close the dialog after processing.
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
                    {/* The Excalidraw component with the ref to capture its API */}
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
