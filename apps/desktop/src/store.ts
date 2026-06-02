import { create } from "zustand";

type AppState = {
  activeProjectId: string | null;
  commandPaletteOpen: boolean;
  selectedTaskId: string | null;
  setActiveProjectId: (id: string) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setSelectedTaskId: (id: string | null) => void;
};

export const useAppStore = create<AppState>((set) => ({
  activeProjectId: null,
  commandPaletteOpen: false,
  selectedTaskId: null,
  setActiveProjectId: (id) => set({ activeProjectId: id }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),
}));
