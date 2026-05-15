'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/auth-provider';
import { fetchApi } from '@/lib/api-client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Logo } from './icons';
import { Loader2, LockKeyhole, Mail } from 'lucide-react';
import { ResetPasswordForm } from './reset-password-form';
import { supabase } from '@/lib/supabase';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const loginFormSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<'professor' | 'aluno'>('professor');
  const { toast } = useToast();
  const { login } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFirstAccess = searchParams.get('primeiroacesso') === 'true';

  const handleBackToLogin = () => {
    router.push('/login');
  };
  
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  });

  const { user } = useUser();
  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  async function onLoginSubmit(values: LoginFormValues) {
    setLoading(true);
    const normalizedEmail = values.email.toLowerCase().trim();
    const endpoint = role === 'professor' ? '/users/login/professor' : '/users/login/aluno';
    
    try {
      const res = await fetchApi(endpoint, {
        method: 'POST',
        data: {
          email: normalizedEmail,
          senha: values.password
        }
      });
      
      login(res.access_token, res.user);

      toast({ title: 'Acesso liberado!', description: `Bem-vindo, ${res.user.nome}!` });
      router.push('/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Falha no login',
        description: error.message || 'E-mail ou senha incorretos.',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    if (!supabase) {
      toast({
        variant: 'destructive',
        title: 'Erro de configuração',
        description: 'O serviço de autenticação não foi configurado corretamente.',
      });
      return;
    }
    setLoading(true);
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('fitassist_token');
      localStorage.removeItem('fitassist_user');

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`,
          queryParams: {
            prompt: 'select_account',
          },
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao entrar com Google',
        description: error.message,
      });
      setLoading(false);
    }
  }

  if (isFirstAccess) {
    return <ResetPasswordForm onBackToLogin={handleBackToLogin} />;
  }

  return (
    <div className="w-full max-w-md animate-in fade-in duration-500">
      <Card className="border-primary/20 shadow-2xl overflow-hidden rounded-[2.5rem]">
        <div className="bg-primary/5 p-1 border-b border-primary/10">
          <Tabs value={role} onValueChange={(v) => setRole(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-transparent h-14">
              <TabsTrigger 
                value="professor" 
                className="rounded-2xl data-[state=active]:bg-primary data-[state=active]:text-white font-black uppercase text-[10px] tracking-widest transition-all"
              >
                Sou Professor
              </TabsTrigger>
              <TabsTrigger 
                value="aluno" 
                className="rounded-2xl data-[state=active]:bg-primary data-[state=active]:text-white font-black uppercase text-[10px] tracking-widest transition-all"
              >
                Sou Aluno
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <CardHeader className="items-center text-center pt-8">
          <Logo className="mb-4 scale-110" />
          <CardTitle className="text-3xl font-black text-primary uppercase italic tracking-tighter">Entrar</CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">
            Acesse sua área de {role}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pb-10 px-8">
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
              <FormField
                control={loginForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-70">E-mail</FormLabel>
                    <FormControl>
                      <Input placeholder="seu@email.com" autoComplete="email" className="h-14 rounded-2xl bg-secondary/20 border-none px-6 font-medium" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Sua senha" autoComplete="current-password" className="h-12 rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full h-14 text-lg font-black rounded-full bg-primary" disabled={loading}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Mail className="h-5 w-5 mr-2" />}
                Acessar com E-mail
              </Button>
            </form>
          </Form>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-primary/10"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Ou continue com</span>
            </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full h-14 text-lg font-bold rounded-full border-primary/20 hover:bg-primary/5" 
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg className="mr-2 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
              <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
            </svg>
            Entrar com Google
          </Button>
          <div className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Novo por aqui?{' '}
              <Link href="/signup" className="text-primary font-bold hover:underline">
                Crie sua conta
              </Link>
            </p>
            <div className="pt-2 border-t border-primary/5">
              <Button 
                variant="link" 
                className="w-full text-xs text-muted-foreground hover:text-primary transition-colors"
                onClick={() => router.push('/login?primeiroacesso=true')}
              >
                Recebeu uma senha temporária? Clique aqui.
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
