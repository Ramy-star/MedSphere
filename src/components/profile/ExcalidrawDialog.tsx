'use client'
import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import dynamic from 'next/dynamic';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// --- Step 1: Create an inner component that holds the Excalidraw logic ---

// This type defines the methods we want to expose via the ref.
export interface ExcalidrawAPIRef {
  getSceneElements: () => any[];
  getAppState: () => any;
  getFiles: () => any;
}

// The component itself, which receives a ref that will be populated with the Excalidraw API.
const ExcalidrawInner = forwardRef<ExcalidrawAPIRef>((props, ref) => {
  const Excalidraw = dynamic(
    async () => (await import('@excalidraw/excalidraw')).Excalidraw,
    { ssr: false }
  );

  // This hook exposes the Excalidraw API through the ref.
  useImperativeHandle(ref, () => excalidrawRef.current);

  const excalidrawRef = useRef<any>(null);

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <Excalidraw
        excalidrawAPI={(api) => (excalidrawRef.current = api)}
        theme="dark"
      />
    </div>
  );
});
ExcalidrawInner.displayName = "ExcalidrawInner";


// --- Step 2: The main dialog component ---

export function ExcalidrawDialog({ onSave, onClose }: { onSave: (dataUrl: string) => void; onClose: () => void }) {
    const excalidrawApiRef = useRef<ExcalidrawAPIRef | null>(null);

    const handleSave = async () => {
        if (!excalidrawApiRef.current) {
            console.error("Excalidraw API not available.");
            return;
        }

        try {
            const { exportToBlob } = await import('@excalidraw/excalidraw');
            
            const elements = excalidrawApiRef.current.getSceneElements();
            
            // If there are no shapes, just close the dialog.
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
            // Still close the dialog on error to avoid getting stuck.
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
                    <ExcalidrawInner ref={excalidrawApiRef} />
                </div>
                 <DialogFooter className="p-4 border-t border-slate-700">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>Insert Drawing</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
