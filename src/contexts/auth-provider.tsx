'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Ajuste conforme o RegisterUserResponse do OpenAPI
export interface User {
  id: string;
  email: string;
  nome: string;
  role: string;
  biotipo: string;
  professor_responsavel_id?: string;
  data_nascimento?: string;
  idade?: number;
  faixa_etaria?: string;
}

interface AuthContextType {
  user: User | null;
  isUserLoading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    // Restaurar a sessão a partir do token
    const token = localStorage.getItem('fitassist_token');
    const storedUserStr = localStorage.getItem('fitassist_user');
    
    if (token && storedUserStr) {
      try {
        const storedUser = JSON.parse(storedUserStr);
        setUser(storedUser);
      } catch (e) {
        console.error('Falha ao restaurar usuário do localStorage', e);
        logout();
      }
    }
    
    setIsUserLoading(false);
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem('fitassist_token', token);
    localStorage.setItem('fitassist_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('fitassist_token');
    localStorage.removeItem('fitassist_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isUserLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useUser deve ser usado dentro de um AuthProvider');
  }
  return context;
};
