'use client';
import { useFloatingAssistantStore } from '@/stores/floating-assistant-store';
import { useRouter } from 'next/navigation';
import { useEffect, useCallback } from 'react';

type ShortcutOptions = {
    onSearch?: () => void;
    onNewNote?: () => void;
    onScreenshot?: () => void;
};

export function useKeyboardShortcuts(options: ShortcutOptions = {}) {
    const { onSearch, onNewNote, onScreenshot } = options;
    const { toggle: toggleAI } = useFloatingAssistantStore();
    const router = useRouter();

    const handleKeyPress = useCallback((e: KeyboardEvent) => {
        // Ignore shortcuts if the user is typing in an input, textarea, or contenteditable element
        const target = e.target as HTMLElement;
        if (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
            return;
        }

        // Ctrl/Cmd + K = Open Search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            onSearch?.();
        }

        // Ctrl/Cmd + Shift + S = Take Screenshot
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
            e.preventDefault();
            onScreenshot?.();
        }

        // Ctrl/Cmd + / = Toggle AI Assistant
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            toggleAI();
        }

        // Ctrl/Cmd + N = New Note
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            // If onNewNote is provided, use it, otherwise navigate.
            if (onNewNote) {
                onNewNote();
            } else {
                router.push('/notes?new=true');
            }
        }
    }, [onSearch, onNewNote, onScreenshot, toggleAI, router]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyPress);
        return () => {
            window.removeEventListener('keydown', handleKeyPress);
        };
    }, [handleKeyPress]);
}
