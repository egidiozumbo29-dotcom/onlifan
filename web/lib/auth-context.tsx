'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from './api';

type User = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  status: string;
  roles: { role: string }[];
  creatorProfile?: unknown;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<{ emailVerificationToken?: string }>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = async () => {
    try {
      const me = await api.get<User>('/auth/me', true);
      setUser(me);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    refreshMe().finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const result = await api.post<{ accessToken: string; refreshToken: string }>(
      '/auth/login',
      { email, password },
    );
    api.setTokens(result);
    await refreshMe();
  };

  const register = async (email: string, password: string, displayName: string) => {
    return api.post<{ userId: string; email: string; emailVerificationToken?: string }>(
      '/auth/register',
      { email, password, displayName },
    );
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout', {}, true);
    } catch {
      // ignore
    }
    api.clearTokens();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
