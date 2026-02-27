
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
import { useFirebase } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Logo } from './icons';
import { Loader2, ShieldCheck, Mail, ArrowLeft } from 'lucide-react';
import { sendLoginCode } from '@/lib/actions';

const loginFormSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
});

const otpFormSchema = z.object({
  code: z.string().length(6, { message: 'O código deve ter 6 dígitos.' }),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;
type OtpFormValues = z.infer<typeof otpFormSchema>;

export function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'login' | 'otp'>('login');
  const [tempCredentials, setTempCredentials] = useState<LoginFormValues | null>(null);
  const { toast } = useToast();
  const { auth, firestore } = useFirebase();
  const router = useRouter();

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  });

  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpFormSchema),
    defaultValues: { code: '' },
  });

  // Passo 1: Validar Email/Senha e "Enviar" Código
  async function onLoginSubmit(values: LoginFormValues) {
    setLoading(true);
    try {
      // 1. Primeiro verificamos se as credenciais são válidas no Firebase Auth
      // (Não fazemos o login completo ainda, apenas testamos ou preparamos)
      // Nota: No Firebase, signInWithEmailAndPassword já loga o usuário. 
      // Para MFA real, usaríamos o fluxo de MFA do Firebase. Aqui simulamos o bloqueio.
      
      const res = await sendLoginCode(values.email);
      if (res.success && res.code) {
        // Salvar código no Firestore para validação (Simulando processo seguro de servidor)
        await setDoc(doc(firestore, 'auth_codes', values.email), {
          code: res.code,
          expiresAt: res.expiresAt,
        });

        setTempCredentials(values);
        setStep('otp');
        
        toast({
          title: 'Código enviado!',
          description: `Seu código de acesso é: ${res.code} (Simulação de e-mail)`,
          duration: 10000,
        });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro no login',
        description: 'Verifique seu e-mail e senha.',
      });
    } finally {
      setLoading(false);
    }
  }

  // Passo 2: Validar o Código Numérico
  async function onOtpSubmit(values: OtpFormValues) {
    if (!tempCredentials) return;
    setLoading(true);

    try {
      const codeDoc = await getDoc(doc(firestore, 'auth_codes', tempCredentials.email));
      
      if (!codeDoc.exists()) {
        throw new Error('Código expirado ou não encontrado.');
      }

      const data = codeDoc.data();
      if (data.code !== values.code) {
        throw new Error('Código incorreto.');
      }

      if (new Date(data.expiresAt) < new Date()) {
        throw new Error('Código expirado.');
      }

      // Se código está correto, fazemos o login real
      await signInWithEmailAndPassword(auth, tempCredentials.email, tempCredentials.password);
      
      // Limpar código usado
      await deleteDoc(doc(firestore, 'auth_codes', tempCredentials.email));

      toast({
        title: 'Bem-vindo de volta!',
        description: 'Autenticação confirmada.',
      });
      router.push('/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Falha na verificação',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }

  if (step === 'otp') {
    return (
      <Card className="w-full max-w-md border-primary/20 shadow-xl animate-in fade-in zoom-in-95 duration-300">
        <CardHeader className="items-center text-center">
          <div className="bg-primary/10 p-3 rounded-full mb-4">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-black text-primary">Verificação de Segurança</CardTitle>
          <CardDescription>
            Enviamos um código de 6 dígitos para <br />
            <span className="font-bold text-foreground">{tempCredentials?.email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...otpForm}>
            <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-6">
              <FormField
                control={otpForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código de Acesso</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="000000" 
                        className="text-center text-2xl tracking-[0.5em] font-black h-14" 
                        maxLength={6}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-3">
                <Button type="submit" className="w-full h-12 text-lg font-bold rounded-full bg-primary" disabled={loading}>
                  {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                  Verificar e Entrar
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full text-muted-foreground" 
                  onClick={() => setStep('login')}
                  disabled={loading}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao Login
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md border-primary/20 shadow-xl">
      <CardHeader className="items-center text-center">
        <Logo className="mb-4" />
        <CardTitle className="text-2xl font-black text-primary">Entrar</CardTitle>
        <CardDescription>Acesse sua conta com segurança extra</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...loginForm}>
          <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-6">
            <FormField
              control={loginForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="seu@email.com" {...field} />
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
                    <Input type="password" placeholder="Sua senha" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full h-12 text-lg font-bold rounded-full bg-primary" disabled={loading}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : 'Solicitar Código'}
            </Button>
          </form>
        </Form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Não tem uma conta?{' '}
          <Link href="/signup" className="text-primary font-bold hover:underline">
            Cadastre-se
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
