'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
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
  const isSigningOutRef = useRef(false);
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

      // Redireciona para a home após login, mantendo o fluxo simples
      if (window.location.pathname === '/login' || window.location.pathname === '/complete-profile') {
        router.push('/');
      }
    } catch (error) {
      console.warn('Erro ao buscar perfil no backend:', error);

      const { data: { user: supabaseUser }, error: supabaseUserError } = await supabase.auth.getUser();
      if (supabaseUser && !supabaseUserError) {
        const fallbackUser: User = {
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          role: null,
          is_profile_complete: false,
          nome: (supabaseUser.user_metadata as any)?.name || (supabaseUser.user_metadata as any)?.full_name,
        };

        setUser(fallbackUser);
        localStorage.setItem('fitassist_user', JSON.stringify(fallbackUser));

        if (window.location.pathname === '/login' || window.location.pathname === '/complete-profile') {
          router.push('/');
        }
      } else {
        console.error('Não foi possível recuperar o usuário do Supabase após falha no backend.', supabaseUserError);
        logout();
      }
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
        if (!isSigningOutRef.current) {
          localStorage.removeItem('fitassist_token');
          localStorage.removeItem('fitassist_user');
          setUser(null);
          setIsUserLoading(false);
          router.push('/login');
        }
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
    if (isSigningOutRef.current) return;
    isSigningOutRef.current = true;

    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error('Erro ao sair:', error);
    } finally {
      isSigningOutRef.current = false;
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
