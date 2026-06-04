import { create } from "zustand";
import { persist } from "zustand/middleware";

type ThemeMode = "dark" | "light";
type BoardDensity = "comfortable" | "compact";
type SidebarWidth = "narrow" | "standard" | "wide";
type DetailPanelWidth = "standard" | "wide";

type AppState = {
  activeProjectId: string | null;
  commandPaletteOpen: boolean;
  selectedTaskId: string | null;
  themeMode: ThemeMode;
  boardDensity: BoardDensity;
  sidebarWidth: SidebarWidth;
  detailPanelWidth: DetailPanelWidth;
  expandedProjects: Record<string, boolean>;
  setActiveProjectId: (id: string) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setSelectedTaskId: (id: string | null) => void;
  setThemeMode: (themeMode: ThemeMode) => void;
  setBoardDensity: (boardDensity: BoardDensity) => void;
  setSidebarWidth: (sidebarWidth: SidebarWidth) => void;
  setDetailPanelWidth: (detailPanelWidth: DetailPanelWidth) => void;
  setProjectExpanded: (projectId: string, expanded: boolean) => void;
  toggleProjectExpanded: (projectId: string) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeProjectId: null,
      commandPaletteOpen: false,
      selectedTaskId: null,
      themeMode: "dark",
      boardDensity: "comfortable",
      sidebarWidth: "standard",
      detailPanelWidth: "standard",
      expandedProjects: {},
      setActiveProjectId: (id) => set({ activeProjectId: id }),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      setSelectedTaskId: (id) => set({ selectedTaskId: id }),
      setThemeMode: (themeMode) => set({ themeMode }),
      setBoardDensity: (boardDensity) => set({ boardDensity }),
      setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
      setDetailPanelWidth: (detailPanelWidth) => set({ detailPanelWidth }),
      setProjectExpanded: (projectId, expanded) =>
        set((state) => ({
          expandedProjects: { ...state.expandedProjects, [projectId]: expanded },
        })),
      toggleProjectExpanded: (projectId) =>
        set((state) => ({
          expandedProjects: {
            ...state.expandedProjects,
            [projectId]: !(state.expandedProjects[projectId] ?? false),
          },
        })),
    }),
    {
      name: "agentboard-ui-preferences",
      partialize: (state) => ({
        activeProjectId: state.activeProjectId,
        selectedTaskId: state.selectedTaskId,
        themeMode: state.themeMode,
        boardDensity: state.boardDensity,
        sidebarWidth: state.sidebarWidth,
        detailPanelWidth: state.detailPanelWidth,
        expandedProjects: state.expandedProjects,
      }),
    },
  ),
);
