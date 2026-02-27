
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
import { Loader2, ShieldCheck, Mail, ArrowLeft, Info } from 'lucide-react';
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

  async function onLoginSubmit(values: LoginFormValues) {
    setLoading(true);
    try {
      const res = await sendLoginCode(values.email);
      if (res.success && res.code) {
        await setDoc(doc(firestore, 'auth_codes', values.email), {
          code: res.code,
          expiresAt: res.expiresAt,
        });

        setTempCredentials(values);
        setStep('otp');
        
        toast({
          title: 'Código gerado!',
          description: `SIMULAÇÃO: O código enviado por e-mail é ${res.code}`,
          duration: 15000,
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

      await signInWithEmailAndPassword(auth, tempCredentials.email, tempCredentials.password);
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
      <Card key="otp-step-card" className="w-full max-w-md border-primary/20 shadow-xl animate-in fade-in zoom-in-95 duration-300">
        <CardHeader className="items-center text-center">
          <div className="bg-primary/10 p-3 rounded-full mb-4">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-black text-primary">Segurança</CardTitle>
          <CardDescription>
            Digite o código enviado para <br />
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
                        key="otp-input-field"
                        placeholder="000000" 
                        className="text-center text-2xl tracking-[0.5em] font-black h-14" 
                        maxLength={6}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="off"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex gap-3 items-start">
                <Info className="h-4 w-4 text-primary mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong>Nota do Protótipo:</strong> O código foi exibido no Toast no topo da tela. Digite-o no campo acima.
                </p>
              </div>

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
    <Card key="login-step-card" className="w-full max-w-md border-primary/20 shadow-xl">
      <CardHeader className="items-center text-center">
        <Logo className="mb-4" />
        <CardTitle className="text-2xl font-black text-primary">Entrar</CardTitle>
        <CardDescription>Acesse sua conta</CardDescription>
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
