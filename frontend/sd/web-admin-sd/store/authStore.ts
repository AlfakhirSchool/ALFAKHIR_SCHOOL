import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SchoolLevel = 'SD' | 'SMP' | 'SMA' | null;

interface User {
  id: string;
  email?: string | null;
  username?: string;
  nama: string;
  role: string;
  school_level: SchoolLevel;
  profile_pic?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  originalToken: string | null; // set when switched to another account
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  updateUser: (partial: Partial<User>) => void;
  switchAccount: (user: User, accessToken: string) => void;
  restoreOriginal: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      originalToken: null,
      login: (user, accessToken, refreshToken) => {
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        set({ user, accessToken, refreshToken, isAuthenticated: true, originalToken: null });
      },
      logout: () => {
        const rt = get().refreshToken || localStorage.getItem('refresh_token');
        if (rt) {
          fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/auth/logout`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: rt }),
          }).catch(() => {});
        }
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, originalToken: null });
      },
      updateUser: (partial) => {
        const current = get().user;
        if (current) set({ user: { ...current, ...partial } });
      },
      switchAccount: (user, accessToken) => {
        const prev = get().accessToken;
        localStorage.setItem('access_token', accessToken);
        set({ user, accessToken, isAuthenticated: true, originalToken: get().originalToken ?? prev });
      },
      restoreOriginal: () => {
        const orig = get().originalToken;
        if (!orig) return;
        localStorage.setItem('access_token', orig);
        // reload page to re-fetch profile with original token
        set({ originalToken: null, accessToken: orig });
        window.location.reload();
      },
    }),
    { name: 'alfakhir-admin-auth' }
  )
);
