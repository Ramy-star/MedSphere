
'use client';
import { create } from 'zustand';
import type { Content } from '@/lib/contentService';

type FilePreviewState = {
  previewItem: Content | null;
  setPreviewItem: (item: Content | null) => void;
};

export const useFilePreviewStore = create<FilePreviewState>((set) => ({
  previewItem: null,
  setPreviewItem: (item) => set({ previewItem: item }),
}));
