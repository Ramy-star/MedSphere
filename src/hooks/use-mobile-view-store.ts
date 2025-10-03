
'use client';

import { create } from 'zustand';

type MobileViewState = {
  isHeaderFixed: boolean;
  chatInputOffset: number;
  setHeaderFixed: (isFixed: boolean) => void;
  setChatInputOffset: (offset: number) => void;
};

export const useMobileViewStore = create<MobileViewState>((set) => ({
  isHeaderFixed: false,
  chatInputOffset: 0,
  setHeaderFixed: (isFixed) => set({ isHeaderFixed: isFixed }),
  setChatInputOffset: (offset) => set({ chatInputOffset: offset }),
}));
