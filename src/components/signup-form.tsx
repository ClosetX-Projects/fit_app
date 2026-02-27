
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Logo } from './icons';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Loader2, ShieldCheck, ArrowLeft, MailCheck, Info } from 'lucide-react';
import { sendLoginCode } from '@/lib/actions';

const signupFormSchema = z.object({
  name: z.string().min(2, { message: 'O nome é obrigatório.' }),
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
  userType: z.enum(['student', 'professor'], { required_error: 'Selecione o tipo de usuário.' }),
  age: z.coerce.number().min(1, { message: 'Idade inválida.' }).optional(),
  gender: z.string().optional(),
  whatsapp: z.string().optional(),
});

const otpFormSchema = z.object({
  code: z.string().length(6, { message: 'O código deve ter 6 dígitos.' }),
});

type SignupFormValues = z.infer<typeof signupFormSchema>;
type OtpFormValues = z.infer<typeof otpFormSchema>;

export function SignUpForm() {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'signup' | 'otp'>('signup');
  const [tempData, setTempData] = useState<SignupFormValues | null>(null);
  const { toast } = useToast();
  const { auth, firestore } = useFirebase();
  const router = useRouter();
  const defaultAvatar = PlaceHolderImages.find(img => img.id === 'user-avatar')?.imageUrl || '';

  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      userType: 'student',
      age: 18,
      gender: '',
      whatsapp: '',
    },
  });

  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpFormSchema),
    defaultValues: { code: '' },
  });

  async function onSignupSubmit(values: SignupFormValues) {
    setLoading(true);
    try {
      const res = await sendLoginCode(values.email);
      if (res.success && res.code) {
        await setDoc(doc(firestore, 'auth_codes', values.email), {
          code: res.code,
          expiresAt: res.expiresAt,
        });

        setTempData(values);
        setStep('otp');
        
        toast({
          title: 'Código de Validação!',
          description: `SIMULAÇÃO: O código de cadastro é ${res.code}`,
          duration: 15000,
        });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro no processo',
        description: 'Não foi possível gerar seu código de validação.',
      });
    } finally {
      setLoading(false);
    }
  }

  async function onOtpSubmit(values: OtpFormValues) {
    if (!tempData) return;
    setLoading(true);

    try {
      const codeDoc = await getDoc(doc(firestore, 'auth_codes', tempData.email));
      
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

      const userCredential = await createUserWithEmailAndPassword(auth, tempData.email, tempData.password);
      const user = userCredential.user;

      await updateProfile(user, { 
        displayName: tempData.name,
        photoURL: defaultAvatar
      });

      const userDocRef = doc(firestore, 'users', user.uid);
      await setDoc(userDocRef, {
        id: user.uid,
        name: tempData.name,
        email: tempData.email,
        userType: tempData.userType,
        photoUrl: defaultAvatar,
        age: tempData.age || null,
        gender: tempData.gender || null,
        whatsapp: tempData.whatsapp || null,
        createdAt: new Date().toISOString(),
      });

      await deleteDoc(doc(firestore, 'auth_codes', tempData.email));

      toast({
        title: 'Bem-vindo ao FitAssist!',
        description: 'Cadastro validado com sucesso.',
      });
      router.push('/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Falha na validação',
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
          <CardTitle className="text-2xl font-black text-primary">Validar Cadastro</CardTitle>
          <CardDescription>
            Insira o código de 6 dígitos que enviamos para <br />
            <span className="font-bold text-foreground">{tempData?.email}</span>
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
                    <FormLabel>Código de 6 Dígitos</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="000000" 
                        className="text-center text-2xl tracking-[0.5em] font-black h-14" 
                        maxLength={6}
                        autoComplete="one-time-code"
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
                  <strong>Simulação:</strong> O código para o cadastro foi exibido na notificação. Copie e cole aqui para finalizar.
                </p>
              </div>

              <div className="space-y-3">
                <Button type="submit" className="w-full h-12 text-lg font-bold rounded-full bg-primary" disabled={loading}>
                  {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <MailCheck className="h-5 w-5 mr-2" />}
                  Confirmar Cadastro
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full text-muted-foreground" 
                  onClick={() => setStep('signup')}
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
    <Card className="w-full max-w-md border-primary/20 shadow-xl">
      <CardHeader className="items-center text-center">
        <Logo className="mb-4" />
        <CardTitle className="text-2xl font-black text-primary">Criar Conta</CardTitle>
        <CardDescription>Sua jornada começa aqui</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...signupForm}>
          <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
            <FormField
              control={signupForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu nome" {...field} />
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
                      <Input placeholder="seu@email.com" {...field} />
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
                      <Input type="password" placeholder="Mín. 6 chars" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={signupForm.control}
              name="userType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Eu sou</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um perfil" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="student">Aluno</SelectItem>
                      <SelectItem value="professor">Professor</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={signupForm.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Idade</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={signupForm.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gênero</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Gênero" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="feminino">Feminino</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={signupForm.control}
              name="whatsapp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp</FormLabel>
                  <FormControl>
                    <Input placeholder="(00) 00000-0000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full h-12 text-lg font-bold rounded-full bg-primary" disabled={loading}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : 'Cadastrar e Validar'}
            </Button>
          </form>
        </Form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Já tem uma conta?{' '}
          <Link href="/login" className="text-primary font-bold hover:underline">
            Entrar
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
