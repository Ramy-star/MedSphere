
'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type SidebarState = {
  isDesktopSidebarOpen: boolean;
  setDesktopSidebarOpen: (isOpen: boolean) => void;
  isMobileSidebarOpen: boolean;
  setMobileSidebarOpen: (isOpen: boolean) => void;
};

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      isDesktopSidebarOpen: true,
      setDesktopSidebarOpen: (isOpen) => set({ isDesktopSidebarOpen: isOpen }),
      isMobileSidebarOpen: false,
      setMobileSidebarOpen: (isOpen) => set({ isMobileSidebarOpen: isOpen }),
    }),
    {
      name: 'sidebar-storage', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
      // Only persist the desktop state
      partialize: (state) => ({ isDesktopSidebarOpen: state.isDesktopSidebarOpen }),
    }
  )
);
