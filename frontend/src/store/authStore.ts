import { create } from "zustand";
import { AuthState, User, UserRole } from "../types/auth";

const USER_STORAGE_KEY = "fleet_auth_user";
const ROLE_STORAGE_KEY = "fleet_auth_role";
const TOKEN_STORAGE_KEY = "fleet_auth_token";

// Retrieve initial state from localStorage if available
const getStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const getStoredRole = (): UserRole | null => {
  try {
    return (localStorage.getItem(ROLE_STORAGE_KEY) as UserRole) || null;
  } catch {
    return null;
  }
};

const getStoredToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

const initialUser = getStoredUser();
const initialRole = getStoredRole();
const initialToken = getStoredToken();

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  role: initialRole || (initialUser ? initialUser.role : null),
  accessToken: initialToken,
  isAuthenticated: Boolean(initialToken || initialUser),
  isInitialized: false,
  isLoading: false,
  error: null,

  setAuth: (user: User, accessToken: string) => {
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      localStorage.setItem(ROLE_STORAGE_KEY, user.role);
      localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
    } catch (e) {
      console.error("Failed to persist auth state to storage", e);
    }
    set({
      user,
      role: user.role,
      accessToken,
      isAuthenticated: true,
      error: null,
      isLoading: false,
    });
  },

  setAccessToken: (accessToken: string) => {
    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
    } catch (e) {
      console.error("Failed to persist access token", e);
    }
    set({ accessToken, isAuthenticated: true });
  },

  setUser: (user: User) => {
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      localStorage.setItem(ROLE_STORAGE_KEY, user.role);
    } catch (e) {
      console.error("Failed to persist user profile", e);
    }
    set({ user, role: user.role });
  },

  clearAuth: () => {
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(ROLE_STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch (e) {
      console.error("Failed to clear auth from storage", e);
    }
    set({
      user: null,
      role: null,
      accessToken: null,
      isAuthenticated: false,
      error: null,
      isLoading: false,
    });
  },

  setLoading: (isLoading: boolean) => set({ isLoading }),
  setError: (error: string | null) => set({ error }),
  setInitialized: (isInitialized: boolean) => set({ isInitialized }),
}));
