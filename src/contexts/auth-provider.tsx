'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchApi } from '@/lib/api-client';
import { useRouter } from 'next/navigation';

export interface User {
  id: string;
  email: string;
  role: 'professor' | 'aluno' | null;
  is_profile_complete: boolean;
  nome?: string;
  biotipo?: string;
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
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const router = useRouter();

  const isRefreshing = React.useRef(false);

  const refreshProfile = async () => {
    if (isRefreshing.current) return;
    isRefreshing.current = true;
    
    console.log('Iniciando refreshProfile...');
    try {
      const res = await fetchApi('/users/me');
      console.log('Perfil recebido:', res);
      
      const userData: User = {
        id: res.user_id,
        email: res.email,
        role: res.role,
        is_profile_complete: res.is_profile_complete,
        ...(res.profile || {}),
        professor_responsavel_id: res.profile?.professor_id || res.profile?.professor_responsavel_id
      };

      setUser(userData);
      localStorage.setItem('fitassist_user', JSON.stringify(userData));

      if (!userData.is_profile_complete) {
        console.log('Perfil incompleto, redirecionando...');
        if (window.location.pathname !== '/complete-profile') {
          router.push('/complete-profile');
        }
      } else {
        console.log('Perfil completo, indo para dashboard.');
        if (window.location.pathname === '/login') {
          router.push('/');
        }
      }
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      // Só desloga se for um erro de autenticação explícito (401)
      if (error instanceof Error && error.message.includes('401')) {
        logout();
      }
    } finally {
      isRefreshing.current = false;
      setIsUserLoading(false);
    }
  };

  useEffect(() => {
    // 1. Verificar sessão atual do Supabase
    const initAuth = async () => {
      console.log('Checando sessão inicial...');
      if (!supabase) {
        console.warn('Supabase não inicializado.');
        setIsUserLoading(false);
        return;
      }
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          console.log('Sessão encontrada no Supabase');
          localStorage.setItem('fitassist_token', session.access_token);
          await refreshProfile();
        } else {
          console.log('Nenhuma sessão no Supabase, checando localStorage...');
          const token = localStorage.getItem('fitassist_token');
          if (token) {
            await refreshProfile();
          }
        }
      } catch (e) {
        console.error('Erro durante initAuth:', e);
      } finally {
        setIsUserLoading(false);
      }
    };

    initAuth();

    // 2. Ouvir mudanças na autenticação do Supabase
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        localStorage.setItem('fitassist_token', session.access_token);
        await refreshProfile();
      } else if (event === 'SIGNED_OUT') {
        logout();
      } else if (event === 'TOKEN_REFRESHED' && session) {
        localStorage.setItem('fitassist_token', session.access_token);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem('fitassist_token', token);
    localStorage.setItem('fitassist_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('fitassist_token');
    localStorage.removeItem('fitassist_user');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, isUserLoading, login, logout, refreshProfile }}>
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
