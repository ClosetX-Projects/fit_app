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

  const refreshProfile = async () => {
    try {
      const res = await fetchApi('/users/me');
      
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

      // Lógica de Redirecionamento baseada no Guia Técnico
      const searchParams = new URLSearchParams(window.location.search);
      const isInvited = !!searchParams.get('invitedBy');

      if (isInvited) {
        // Se há convite, ignora status do backend e força completar perfil de Aluno
        if (window.location.pathname !== '/complete-profile') {
          router.push(`/complete-profile${window.location.search}`);
        }
      } else if (res.role === 'professor') {
        // Professor automático: vai direto para a Home
        if (window.location.pathname === '/login' || window.location.pathname === '/complete-profile') {
          router.push('/');
        }
      } else if (!res.is_profile_complete && window.location.pathname !== '/complete-profile') {
        // Outros casos de perfil incompleto
        router.push('/complete-profile');
      }
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      logout();
    } finally {
      setIsUserLoading(false);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      if (!supabase) {
        setIsUserLoading(false);
        return;
      }
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          localStorage.setItem('fitassist_token', session.access_token);
          await refreshProfile();
        } else {
          const token = localStorage.getItem('fitassist_token');
          if (token) {
            await refreshProfile();
          } else {
            setIsUserLoading(false);
          }
        }
      } catch (e) {
        setIsUserLoading(false);
      }
    };

    initAuth();

    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        localStorage.setItem('fitassist_token', session.access_token);
        refreshProfile();
      } else if (event === 'SIGNED_OUT') {
        logout();
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
