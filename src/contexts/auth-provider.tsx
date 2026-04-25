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

      // Lógica de redirecionamento simplificada após login
      if (res.role === 'professor') {
        // Professor automático: vai direto para a Home
        if (window.location.pathname === '/login' || window.location.pathname === '/complete-profile') {
          router.push('/');
        }
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
        const { data: urlData, error: urlError } = await supabase.auth.getSessionFromUrl();
        const sessionFromUrl = urlData?.session ?? null;

        if (urlError) {
          console.warn('Erro ao processar callback de OAuth:', urlError);
        }

        if (sessionFromUrl) {
          localStorage.setItem('fitassist_token', sessionFromUrl.access_token);
          await refreshProfile();
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
          return;
        }

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
        console.error('Erro ao inicializar auth:', e);
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
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error('Erro ao sair:', error);
    } finally {
      localStorage.removeItem('fitassist_token');
      localStorage.removeItem('fitassist_user');
      setUser(null);
      setIsUserLoading(false);
      router.push('/login');
    }
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
