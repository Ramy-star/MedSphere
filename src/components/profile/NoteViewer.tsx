'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Note } from './ProfileNotesSection';

export const NoteViewer = ({ note }: { note: Note }) => {
    const [activePageId, setActivePageId] = useState(note.pages[0]?.id);

    // Helper function to convert hex to rgba
    const hexToRgba = (hex: string, alpha: number): string => {
        if (!hex || !/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
            return `rgba(40, 40, 40, ${alpha})`; // Default dark grey
        }
        let c: any = hex.substring(1).split('');
        if (c.length === 3) {
            c = [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c = '0x' + c.join('');
        return `rgba(${[(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',')},${alpha})`;
    };

    return (
        <div 
            className="flex flex-col h-full rounded-lg overflow-hidden"
            style={{ backgroundColor: hexToRgba(note.color, 0.9), borderColor: 'rgba(255, 255, 255, 0.1)' }}
        >
            <div className="flex items-center border-b border-white/10 px-2 flex-shrink-0">
                {note.pages.map(page => (
                    <button
                        key={page.id}
                        onClick={() => setActivePageId(page.id)}
                        className={cn(
                            "py-2 px-3 border-b-2 text-sm transition-colors", 
                            activePageId === page.id 
                                ? "border-blue-400 text-white" 
                                : "border-transparent text-slate-400 hover:bg-white/5"
                        )}
                    >
                        {page.title}
                    </button>
                ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
                <AnimatePresence mode="wait">
                    {note.pages.map(page =>
                        activePageId === page.id && (
                            <motion.div
                                key={page.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="prose prose-sm prose-invert max-w-none"
                                // Render the HTML content safely
                                dangerouslySetInnerHTML={{ __html: page.content }}
                            />
                        )
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
