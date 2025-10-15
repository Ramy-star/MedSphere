
'use client';

import { create } from 'zustand';

type MobileViewState = {
  // This store is no longer used for sidebar state,
  // but can be kept for other mobile-specific states in the future.
};

export const useMobileViewStore = create<MobileViewState>((set) => ({
  // No state needed here for this specific feature anymore.
}));
