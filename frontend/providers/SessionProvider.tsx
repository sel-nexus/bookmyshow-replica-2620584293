'use client';

import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthUser } from '../lib/api';

interface SessionContextValue {
  token: string | null;
  user: AuthUser | null;
  isHydrated: boolean;
  establishSession: (token: string, user: AuthUser) => void;
  clearSession: () => void;
}

interface StoredSession {
  token: string;
  user: AuthUser;
}

const SESSION_STORAGE_KEY = 'identity-demo-session';
const SessionContext = createContext<SessionContextValue | undefined>(undefined);

/** Restore and retain the authenticated identity for this browser tab without exposing it in a URL. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const storedSession = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (storedSession) {
        const parsedSession = JSON.parse(storedSession) as StoredSession;
        if (typeof parsedSession.token === 'string' && parsedSession.token && parsedSession.user) {
          setToken(parsedSession.token);
          setUser(parsedSession.user);
        } else {
          window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
        }
      }
    } catch {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  const value = useMemo(() => ({
    token,
    user,
    isHydrated,
    establishSession: (nextToken: string, nextUser: AuthUser) => {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ token: nextToken, user: nextUser }));
      setToken(nextToken);
      setUser(nextUser);
    },
    clearSession: () => {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      setToken(null);
      setUser(null);
    },
  }), [isHydrated, token, user]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/** Read the transient identity session from the nearest provider. */
export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used inside SessionProvider');
  return context;
}
