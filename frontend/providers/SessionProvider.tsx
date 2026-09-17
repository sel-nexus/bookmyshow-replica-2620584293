'use client';

import React, { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { AuthUser } from '../lib/api';

interface SessionContextValue {
  token: string | null;
  user: AuthUser | null;
  establishSession: (token: string, user: AuthUser) => void;
  clearSession: () => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

/** Hold an authenticated identity in memory for the current browser session only. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const value = useMemo(() => ({
    token,
    user,
    establishSession: (nextToken: string, nextUser: AuthUser) => { setToken(nextToken); setUser(nextUser); },
    clearSession: () => { setToken(null); setUser(null); },
  }), [token, user]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/** Read the transient identity session from the nearest provider. */
export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used inside SessionProvider');
  return context;
}
