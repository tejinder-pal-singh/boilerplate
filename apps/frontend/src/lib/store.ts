import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
}

interface UIState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    timestamp: number;
  }>;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  accessToken: string | null;
}

interface AppState {
  ui: UIState;
  auth: AuthState;
  settings: Record<string, any>;
  
  // UI Actions
  setTheme: (theme: 'light' | 'dark') => void;
  toggleSidebar: () => void;
  addNotification: (notification: Omit<UIState['notifications'][0], 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  
  // Auth Actions
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  logout: () => void;
  
  // Settings Actions
  updateSettings: (settings: Record<string, any>) => void;
}

export const useStore = create<AppState>()(
  persist(
    immer((set) => ({
      ui: {
        theme: 'light',
        sidebarOpen: true,
        notifications: [],
      },
      auth: {
        user: null,
        isAuthenticated: false,
        accessToken: null,
      },
      settings: {},

      // UI Actions
      setTheme: (theme) =>
        set((state) => {
          state.ui.theme = theme;
        }),

      toggleSidebar: () =>
        set((state) => {
          state.ui.sidebarOpen = !state.ui.sidebarOpen;
        }),

      addNotification: (notification) =>
        set((state) => {
          state.ui.notifications.push({
            ...notification,
            id: Math.random().toString(36).substr(2, 9),
            timestamp: Date.now(),
          });
        }),

      removeNotification: (id) =>
        set((state) => {
          state.ui.notifications = state.ui.notifications.filter(
            (n) => n.id !== id
          );
        }),

      // Auth Actions
      setUser: (user) =>
        set((state) => {
          state.auth.user = user;
          state.auth.isAuthenticated = !!user;
        }),

      setAccessToken: (token) =>
        set((state) => {
          state.auth.accessToken = token;
        }),

      logout: () =>
        set((state) => {
          state.auth.user = null;
          state.auth.isAuthenticated = false;
          state.auth.accessToken = null;
        }),

      // Settings Actions
      updateSettings: (newSettings) =>
        set((state) => {
          state.settings = {
            ...state.settings,
            ...newSettings,
          };
        }),
    })),
    {
      name: 'app-storage',
      partialize: (state) => ({
        ui: {
          theme: state.ui.theme,
        },
        settings: state.settings,
      }),
    }
  )
);

// Selectors
export const useTheme = () => useStore((state) => state.ui.theme);
export const useSidebarOpen = () => useStore((state) => state.ui.sidebarOpen);
export const useNotifications = () => useStore((state) => state.ui.notifications);
export const useUser = () => useStore((state) => state.auth.user);
export const useIsAuthenticated = () => useStore((state) => state.auth.isAuthenticated);
export const useSettings = () => useStore((state) => state.settings);
