import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('trivault_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('trivault_token');
      if (storedToken) {
        try {
          const profile = await api.getMe();
          setUser(profile);
          setToken(storedToken);
        } catch {
          // Token expired or invalid, clear local session
          localStorage.removeItem('trivault_token');
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    const authData = await api.login(username, password);
    localStorage.setItem('trivault_token', authData.access_token);
    setToken(authData.access_token);
    setUser(authData.user);
  };

  const register = async (username: string, email: string, password: string) => {
    await api.register(username, email, password);
    // After registration, auto login or require explicit login
    await login(username, password);
  };

  const logout = () => {
    localStorage.removeItem('trivault_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
