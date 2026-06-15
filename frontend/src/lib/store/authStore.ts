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
  setUser: (user: UserProfile) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: true }),
      clearAuth: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: "sia-hms-auth",
    }
  )
);
