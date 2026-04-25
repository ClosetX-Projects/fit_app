'use client';

import { Suspense, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { fetchApi } from '@/lib/api-client';
import { useUser } from '@/contexts/auth-provider';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Logo } from './icons';
import { Loader2, Lock, UserRound, GraduationCap } from 'lucide-react';

const signupFormSchema = z.object({
  name: z.string().min(2, { message: 'O nome é obrigatório.' }),
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  password: z.string().min(8, { message: 'A senha deve ter pelo menos 8 caracteres.' }),
  userType: z.enum(['student', 'professor'], { required_error: 'Selecione o tipo de usuário.' }),
  biotipo: z.enum(['masculino', 'feminino'], { required_error: 'Selecione o biotipo.' }),
  birthDate: z.string().min(1, { message: 'Data de nascimento é obrigatória.' }).optional(),
});

type SignupFormValues = z.infer<typeof signupFormSchema>;

function SignUpFormContent() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useUser();
  
  const roleParam = searchParams.get('role');
  const invitedBy = searchParams.get('invitedBy');
  
  const isStudentInvite = roleParam === 'student' && !!invitedBy;
  const isDirectProfessor = roleParam === 'professor';
  const isBlocked = roleParam === 'student' && !invitedBy;

  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: { 
      name: '', 
      email: '', 
      password: '', 
      userType: (roleParam === 'professor' ? 'professor' : 'student') as 'student' | 'professor',
      biotipo: 'masculino',
      birthDate: '',
    },
  });

  useEffect(() => {
    if (roleParam === 'professor' || roleParam === 'student') {
      signupForm.setValue('userType', roleParam as any);
    }
  }, [roleParam, signupForm]);

  async function onSignupSubmit(values: SignupFormValues) {
    if (isBlocked) return;
    setLoading(true);
    const normalizedEmail = values.email.toLowerCase().trim();
    
    try {
      const isProf = values.userType === 'professor';
      const endpoint = isProf ? '/users/register/professor' : '/users/register/aluno';
      
      const payload: any = {
        nome: values.name,
        email: normalizedEmail,
        senha: values.password,
        biotipo: values.biotipo,
      };

      if (!isProf) {
        payload.professor_id = invitedBy;
        payload.data_nascimento = values.birthDate;
      }

      // Registra o usuário no backend
      await fetchApi(endpoint, {
        method: 'POST',
        data: payload
      });

      // Se der sucesso, faz o login para obter o token e entrar na plataforma
      const loginRes = await fetchApi('/users/login', {
        method: 'POST',
        data: {
          email: normalizedEmail,
          senha: values.password
        }
      });

      login(loginRes.access_token, loginRes.user);

      toast({ title: 'Bem-vindo!', description: 'Cadastro realizado com sucesso.' });
      router.push('/');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Falha', description: error.message || 'Ocorreu um erro.' });
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
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}`,
          queryParams: {
            prompt: 'select_account'
          }
        }
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

  if (isBlocked) {
    return (
      <div className="w-full max-w-md">
        <Card className="border-destructive/20 shadow-2xl text-center">
          <CardHeader className="items-center">
            <div className="bg-destructive/10 p-4 rounded-full mb-4">
              <Lock className="h-10 w-10 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-black text-destructive">Convite Necessário</CardTitle>
            <CardDescription>
              Para garantir o acompanhamento profissional, o cadastro de alunos é feito através de um link enviado pelo seu Personal Trainer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild variant="outline" className="w-full rounded-full">
              <Link href="/">Voltar para Início</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <Card className="border-primary/20 shadow-2xl">
        <CardHeader className="items-center text-center">
          <Logo className="mb-6 scale-125" />
          <CardTitle className="text-3xl font-black text-primary">
            {isStudentInvite ? 'Finalizar Cadastro' : 'Novo Personal'}
          </CardTitle>
          <CardDescription>
            {isStudentInvite ? 'Vincule-se agora ao seu professor' : 'Crie sua conta profissional'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...signupForm}>
            <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
              <FormField
                control={signupForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Seu nome" className="h-11 rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={signupForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="seu@email.com" className="h-11 rounded-xl" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signupForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Mín. 6 chars" className="h-11 rounded-xl" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={signupForm.control}
                  name="biotipo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sexo / Biotipo</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-xl">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="masculino">Masculino</SelectItem>
                          <SelectItem value="feminino">Feminino</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signupForm.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nascimento</FormLabel>
                      <FormControl>
                        <Input type="date" className="h-11 rounded-xl" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-full">
                  {isStudentInvite ? (
                    <UserRound className="h-5 w-5 text-primary" />
                  ) : (
                    <GraduationCap className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-primary/60 tracking-wider">Perfil Identificado</p>
                  <p className="text-sm font-black text-primary uppercase">
                    {isStudentInvite ? 'Aluno' : 'Personal Trainer'}
                  </p>
                </div>
              </div>

              <Button type="submit" className="w-full h-14 text-lg font-black rounded-full bg-primary" disabled={loading}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : 'Criar minha conta'}
              </Button>
            </form>
          </Form>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-primary/10"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Ou cadastre-se com</span>
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
            Criar conta com Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function SignUpForm() {
  return (
    <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary h-8 w-8" /></div>}>
      <SignUpFormContent />
    </Suspense>
  );
}
