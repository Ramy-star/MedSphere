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

        const isModifier = e.ctrlKey || e.metaKey;

        // Ctrl/Cmd + K = Open Search
        if (isModifier && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            onSearch?.();
        }

        // Ctrl/Cmd + M = Take Screenshot
        if (isModifier && e.key.toLowerCase() === 'm') {
            e.preventDefault();
            onScreenshot?.();
        }

        // Ctrl/Cmd + / = Toggle AI Assistant
        if (isModifier && e.key === '/') {
            e.preventDefault();
            toggleAI();
        }

        // Ctrl/Cmd + N = New Note
        if (isModifier && e.key.toLowerCase() === 'n') {
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
