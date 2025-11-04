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
    set(state => ({ 
        isOpen: !state.isOpen,
        // If we are closing, reset expanded state and context
        isExpanded: wasOpen ? false : state.isExpanded,
        context: wasOpen ? null : state.context,
    }));
  },
  toggleExpand: () => set(state => ({ isExpanded: !state.isExpanded })),
  openWithContext: (context: AssistantContext) => {
    set({ isOpen: true, context });
  },
  close: () => set({ isOpen: false, isExpanded: false, context: null }),
}));
