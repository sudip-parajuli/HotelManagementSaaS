import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface UserProfile {
  id: number;
  email: string;
  username: string;
  role: string;
  first_name: string;
  last_name: string;
  phone?: string;
  avatar?: string;
  preferred_language?: string;
}

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  features: string[];
  setUser: (user: UserProfile) => void;
  setFeatures: (features: string[]) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      features: [],
      setUser: (user) => set({ user, isAuthenticated: true }),
      setFeatures: (features) => set({ features }),
      clearAuth: () => set({ user: null, isAuthenticated: false, features: [] }),
    }),
    {
      name: "sia-hms-auth",
    }
  )
);
