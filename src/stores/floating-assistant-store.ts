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
    set(state => {
        const newIsOpen = !state.isOpen;
        // If we are closing, always reset expanded state.
        // If we are opening, it should not be expanded initially.
        return {
            isOpen: newIsOpen,
            isExpanded: newIsOpen ? state.isExpanded : false,
            context: newIsOpen ? state.context : null,
        };
    });
  },
  toggleExpand: () => set(state => ({ isExpanded: state.isOpen ? !state.isExpanded : state.isExpanded })),
  openWithContext: (context: AssistantContext) => {
    set({ isOpen: true, context, isExpanded: false });
  },
  close: () => set({ isOpen: false, isExpanded: false, context: null }),
}));
