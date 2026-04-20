'use client';

import { useState } from 'react';
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
import { Loader2, LockKeyhole } from 'lucide-react';
import { ResetPasswordForm } from './reset-password-form';

const loginFormSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export function LoginForm() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { login } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFirstAccess = searchParams.get('primeiroacesso') === 'true';

  const handleBackToLogin = () => {
    // Remove o parâmetro ?primeiroacesso=true da URL
    router.push('/login');
  };
  
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onLoginSubmit(values: LoginFormValues) {
    setLoading(true);
    const normalizedEmail = values.email.toLowerCase().trim();
    try {
      const res = await fetchApi('/users/login', {
        method: 'POST',
        data: {
          email: normalizedEmail,
          senha: values.password
        }
      });
      
      login(res.access_token, res.user);

      toast({ title: 'Acesso liberado!', description: 'Bem-vindo ao seu painel.' });
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

  if (isFirstAccess) {
    return <ResetPasswordForm onBackToLogin={handleBackToLogin} />;
  }

  return (
    <div className="w-full max-w-md animate-in fade-in duration-500">
      <Card className="border-primary/20 shadow-2xl">
        <CardHeader className="items-center text-center">
          <Logo className="mb-6 scale-125" />
          <CardTitle className="text-3xl font-black text-primary">Entrar</CardTitle>
          <CardDescription>Acesse sua plataforma FitAssist</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
              <FormField
                control={loginForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input placeholder="seu@email.com" autoComplete="email" className="h-12 rounded-xl" {...field} />
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
                {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <LockKeyhole className="h-5 w-5 mr-2" />}
                Acessar com E-mail
              </Button>
            </form>
          </Form>
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
