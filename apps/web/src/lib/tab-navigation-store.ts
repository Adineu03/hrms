import { create } from 'zustand';

interface TabNavigationState {
  requestedTab: string | null;
  setRequestedTab: (tab: string | null) => void;
  consumeRequestedTab: () => string | null;
}

/**
 * Global store for cross-component tab navigation.
 * The AI chat sets `requestedTab` when navigating to a module + tab.
 * Dashboard components consume it on mount to set their initial active tab.
 */
export const useTabNavigationStore = create<TabNavigationState>((set, get) => ({
  requestedTab: null,

  setRequestedTab: (tab) => set({ requestedTab: tab }),

  consumeRequestedTab: () => {
    const tab = get().requestedTab;
    if (tab) set({ requestedTab: null });
    return tab;
  },
}));
