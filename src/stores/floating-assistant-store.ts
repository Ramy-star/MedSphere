'use client';

import { create } from 'zustand';
import type { Content } from '@/lib/contentService';

type AssistantContext = {
    content: string;
    referencedFiles: Content[];
};

type FloatingAssistantState = {
  isOpen: boolean;
  isExpanded: boolean;
  context: AssistantContext | null;
  toggle: () => void;
  toggleExpand: () => void;
  openWithContext: (context: AssistantContext) => void;
  close: () => void;
};

export const useFloatingAssistantStore = create<FloatingAssistantState>((set, get) => ({
  isOpen: false,
  isExpanded: false,
  context: null,
  toggle: () => {
    const wasOpen = get().isOpen;
    set(state => {
        // If we are opening from a closed state, don't expand.
        // If we are closing, reset expanded state.
        const newIsExpanded = !wasOpen ? false : state.isExpanded;
        return {
            isOpen: !state.isOpen,
            isExpanded: newIsExpanded,
            context: wasOpen ? null : state.context,
        };
    });
  },
  toggleExpand: () => set(state => ({ isExpanded: state.isOpen ? !state.isExpanded : state.isExpanded })),
  openWithContext: (context: AssistantContext) => {
    set({ isOpen: true, context, isExpanded: false });
  },
  close: () => set({ isOpen: false, isExpanded: false, context: null }),
}));
