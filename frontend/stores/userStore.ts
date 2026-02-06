import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserStats } from '../types/user';

interface UserState {
  user: User | null;
  stats: UserStats | null;
  setUser: (user: User | null) => void;
  setStats: (stats: UserStats | null) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      stats: null,
      setUser: (user) => set({ user }),
      setStats: (stats) => set({ stats }),
    }),
    { name: 'serene-user', partialize: (s) => ({ user: s.user }) }
  )
);
