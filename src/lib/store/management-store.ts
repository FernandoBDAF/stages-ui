import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface ManagementState {
  // Selected database (persisted)
  selectedDatabase: string | null;
  setSelectedDatabase: (db: string | null) => void;

  // Active operations being tracked
  activeOperationIds: string[];
  addActiveOperation: (id: string) => void;
  removeActiveOperation: (id: string) => void;

  // Last used values for forms (persisted)
  lastSourceDb: string;
  lastTargetDb: string;
  setLastDbs: (source: string, target: string) => void;
}

export const useManagementStore = create<ManagementState>()(
  devtools(
    persist(
      (set) => ({
        selectedDatabase: null,
        setSelectedDatabase: (db) => set({ selectedDatabase: db }),

        activeOperationIds: [],
        addActiveOperation: (id) =>
          set((state) => ({
            activeOperationIds: [...state.activeOperationIds, id],
          })),
        removeActiveOperation: (id) =>
          set((state) => ({
            activeOperationIds: state.activeOperationIds.filter((opId) => opId !== id),
          })),

        lastSourceDb: '',
        lastTargetDb: '',
        setLastDbs: (source, target) => set({ lastSourceDb: source, lastTargetDb: target }),
      }),
      {
        name: 'stages-management-store',
        partialize: (state) => ({
          selectedDatabase: state.selectedDatabase,
          lastSourceDb: state.lastSourceDb,
          lastTargetDb: state.lastTargetDb,
        }),
      }
    ),
    { name: 'management-store' }
  )
);

