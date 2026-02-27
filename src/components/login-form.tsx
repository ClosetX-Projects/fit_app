
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
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Logo } from './icons';
import { Loader2, ShieldCheck, ArrowLeft, Info, LockKeyhole } from 'lucide-react';
import { sendLoginCode } from '@/lib/actions';
import { Separator } from '@/components/ui/separator';

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

  const handleGoogleLogin = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Verificar se o perfil já existe no Firestore, se não, criar como aluno por padrão
      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(firestore, 'users', user.uid), {
          id: user.uid,
          name: user.displayName,
          email: user.email,
          userType: 'student', // Padrão inicial para login social
          photoUrl: user.photoURL,
          createdAt: new Date().toISOString(),
        });
      }

      toast({
        title: 'Bem-vindo!',
        description: `Olá, ${user.displayName}. Acesso realizado com Google.`,
      });
      router.push('/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro no Google Login',
        description: 'Não foi possível autenticar com o Google.',
      });
    } finally {
      setLoading(false);
    }
  };

  async function onLoginSubmit(values: LoginFormValues) {
    setLoading(true);
    const normalizedEmail = values.email.toLowerCase().trim();
    try {
      await signInWithEmailAndPassword(auth, normalizedEmail, values.password);
      
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
      if (!codeDoc.exists()) throw new Error('Código expirado ou não encontrado.');

      const data = codeDoc.data();
      if (data.code !== cleanCode) throw new Error('Código incorreto.');
      if (new Date(data.expiresAt) < new Date()) throw new Error('O código expirou.');

      await deleteDoc(doc(firestore, 'auth_codes', tempEmail));
      toast({ title: 'Acesso liberado!', description: 'Bem-vindo ao seu painel.' });
      router.push('/');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Verificação falhou', description: error.message });
    } finally {
      setLoading(false);
    }
  }

  if (step === 'otp') {
    return (
      <Card className="w-full max-w-md border-primary/20 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <CardHeader className="items-center text-center">
          <div className="bg-primary/10 p-4 rounded-full mb-4">
            <ShieldCheck className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-black text-primary">Segurança</CardTitle>
          <CardDescription>
            Insira o código enviado para <br />
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
                        id="otp_code_input"
                        placeholder="000000" 
                        className="text-center text-3xl tracking-[0.4em] font-black h-16 bg-muted/30 border-primary/20" 
                        maxLength={6}
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
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
                  Nota: O código está no Toast no topo da tela.
                </p>
              </div>
              <div className="space-y-3">
                <Button type="submit" className="w-full h-14 text-lg font-black rounded-full bg-primary" disabled={loading}>
                  {loading && <Loader2 className="h-5 w-5 animate-spin mr-2" />}
                  Verificar e Entrar
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => setStep('login')} disabled={loading}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md border-primary/20 shadow-2xl">
      <CardHeader className="items-center text-center">
        <Logo className="mb-6 scale-125" />
        <CardTitle className="text-3xl font-black text-primary">Entrar</CardTitle>
        <CardDescription>Acesse sua plataforma FitAssist</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Button 
          variant="outline" 
          className="w-full h-12 rounded-xl font-bold flex items-center justify-center gap-3 border-primary/20 hover:bg-primary/5"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          Entrar com Google
        </Button>

        <div className="flex items-center gap-4">
          <Separator className="flex-1" />
          <span className="text-[10px] uppercase font-bold text-muted-foreground">ou e-mail</span>
          <Separator className="flex-1" />
        </div>

        <Form {...loginForm}>
          <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
            <FormField
              control={loginForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input id="email_login_field" placeholder="seu@email.com" className="h-12 rounded-xl" {...field} />
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
                    <Input id="pass_login_field" type="password" placeholder="Sua senha" className="h-12 rounded-xl" {...field} />
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
        <p className="text-center text-sm text-muted-foreground">
          Novo por aqui?{' '}
          <Link href="/signup" className="text-primary font-bold hover:underline">
            Crie sua conta
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
