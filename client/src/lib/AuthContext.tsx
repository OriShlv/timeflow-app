import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';

import { setUnauthorizedHandler } from './apiClient';
import * as authLib from './auth';
import type { AuthUser } from './types';

export interface AuthContextValue {
  user: AuthUser | null;
  isLoggedIn: () => boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (email: string, password: string, name: string | undefined) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider(props: AuthProviderProps): ReactElement {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(() => authLib.getCurrentUser());

  const syncUser = useCallback((): void => {
    if (authLib.isLoggedIn()) {
      setUser(authLib.getCurrentUser());
      return;
    }
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      navigate('/login', { replace: true });
    });
    return () => {
      setUnauthorizedHandler(null);
    };
  }, [navigate]);

  const login = useCallback(async (email: string, password: string): Promise<AuthUser> => {
    const loggedInUser = await authLib.login(email, password);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const register = useCallback(
    async (email: string, password: string, name: string | undefined): Promise<AuthUser> => {
      const loggedInUser = await authLib.register(email, password, name);
      setUser(loggedInUser);
      return loggedInUser;
    },
    [],
  );

  const logout = useCallback((): void => {
    authLib.logout();
    setUser(null);
  }, []);

  const isLoggedIn = useCallback((): boolean => {
    return user !== null;
  }, [user]);

  const value = useMemo(
    (): AuthContextValue => ({
      user,
      isLoggedIn,
      login,
      register,
      logout,
    }),
    [user, isLoggedIn, login, register, logout],
  );

  useEffect(() => {
    syncUser();
  }, [syncUser]);

  return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
