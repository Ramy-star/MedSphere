
'use client';

import { create } from 'zustand';

type MobileViewState = {
  // These states are no longer needed as the logic is handled within the modal.
};

export const useMobileViewStore = create<MobileViewState>((set) => ({
  // No state needed here for this specific feature anymore.
}));
