import { create } from 'zustand';
import { AppState } from '../types';

const useAppStore = create<AppState>((set) => ({
  darkMode: true,
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
}));

export default useAppStore;