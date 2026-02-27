
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
import { Loader2, ShieldCheck, ArrowLeft, Info, LockKeyhole } from 'lucide-react';
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
  const [tempEmail, setTempEmail] = useState('');
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

  async function onLoginSubmit(values: LoginFormValues) {
    setLoading(true);
    const normalizedEmail = values.email.toLowerCase().trim();
    try {
      // PASSO 1: Validar as credenciais ANTES de enviar o código
      // Se o e-mail ou senha estiverem errados, o Firebase lançará um erro aqui
      await signInWithEmailAndPassword(auth, normalizedEmail, values.password);
      
      // Se chegou aqui, as credenciais estão corretas. Agora geramos o código.
      const res = await sendLoginCode(normalizedEmail);
      if (res.success && res.code) {
        await setDoc(doc(firestore, 'auth_codes', normalizedEmail), {
          code: res.code,
          expiresAt: res.expiresAt,
        });

        setTempEmail(normalizedEmail);
        setStep('otp');
        otpForm.reset();
        
        toast({
          title: 'Código gerado!',
          description: `SIMULAÇÃO: O código de segurança é ${res.code}`,
          duration: 15000,
        });
      }
    } catch (error: any) {
      let message = 'E-mail ou senha incorretos.';
      if (error.code === 'auth/user-not-found') message = 'Usuário não encontrado.';
      
      toast({
        variant: 'destructive',
        title: 'Falha no login',
        description: message,
      });
    } finally {
      setLoading(false);
    }
  }

  async function onOtpSubmit(values: OtpFormValues) {
    if (!tempEmail) return;
    setLoading(true);

    const cleanCode = values.code.trim();

    try {
      const codeDoc = await getDoc(doc(firestore, 'auth_codes', tempEmail));
      
      if (!codeDoc.exists()) {
        throw new Error('Código expirado ou não encontrado.');
      }

      const data = codeDoc.data();
      if (data.code !== cleanCode) {
        throw new Error('Código incorreto. Verifique a notificação no topo.');
      }

      if (new Date(data.expiresAt) < new Date()) {
        throw new Error('O código expirou. Volte e solicite um novo.');
      }

      // Código OK, usuário já está autenticado no Firebase (feito no Passo 1)
      await deleteDoc(doc(firestore, 'auth_codes', tempEmail));

      toast({
        title: 'Acesso liberado!',
        description: 'Bem-vindo ao seu painel.',
      });
      router.push('/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Verificação falhou',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }

  if (step === 'otp') {
    return (
      <Card key="otp-auth-card" className="w-full max-w-md border-primary/20 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <CardHeader className="items-center text-center">
          <div className="bg-primary/10 p-4 rounded-full mb-4">
            <ShieldCheck className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-black text-primary">Segurança</CardTitle>
          <CardDescription>
            Confirmamos sua senha. Agora insira o código enviado para <br />
            <span className="font-bold text-foreground">{tempEmail}</span>
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
                    <FormLabel className="text-center block w-full text-xs font-bold uppercase tracking-widest mb-4">Código de 6 dígitos</FormLabel>
                    <FormControl>
                      <Input 
                        id="otp_input_field"
                        key="otp_input_key"
                        placeholder="000000" 
                        className="text-center text-3xl tracking-[0.4em] font-black h-16 bg-muted/30 border-primary/20 focus:border-primary" 
                        maxLength={6}
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-center" />
                  </FormItem>
                )}
              />
              
              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex gap-3 items-start">
                <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <p className="text-[11px] text-muted-foreground leading-tight">
                  <strong>Nota do Protótipo:</strong> O código está visível na notificação (Toast) que apareceu no topo da tela.
                </p>
              </div>

              <div className="space-y-3">
                <Button type="submit" className="w-full h-14 text-lg font-black rounded-full bg-primary shadow-lg shadow-primary/20" disabled={loading}>
                  {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                  Verificar e Entrar
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full text-muted-foreground hover:text-primary" 
                  onClick={() => setStep('login')}
                  disabled={loading}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" /> Voltar e corrigir dados
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card key="login-base-card" className="w-full max-w-md border-primary/20 shadow-2xl">
      <CardHeader className="items-center text-center">
        <Logo className="mb-6 scale-125" />
        <CardTitle className="text-3xl font-black text-primary">Entrar</CardTitle>
        <CardDescription>Acesse sua plataforma FitAssist</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...loginForm}>
          <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-6">
            <FormField
              control={loginForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input id="email_login" placeholder="seu@email.com" className="h-12 rounded-xl" {...field} />
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
                    <Input id="password_login" type="password" placeholder="Sua senha" className="h-12 rounded-xl" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full h-14 text-lg font-black rounded-full bg-primary shadow-lg shadow-primary/20" disabled={loading}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <LockKeyhole className="h-5 w-5 mr-2" />}
              Acessar com Segurança
            </Button>
          </form>
        </Form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Novo por aqui?{' '}
          <Link href="/signup" className="text-primary font-bold hover:underline">
            Crie sua conta
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
