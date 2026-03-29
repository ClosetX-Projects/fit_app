
'use client';

import { useState, useEffect, Suspense, useId } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, setDocumentNonBlocking } from '@/firebase';
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Logo } from './icons';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Loader2, ShieldCheck, ArrowLeft, Info, UserRound, GraduationCap, Lock } from 'lucide-react';
import { sendLoginCode } from '@/lib/actions';
import { Separator } from '@/components/ui/separator';
import { linkExistingProfile } from '@/lib/auth-utils';

const signupFormSchema = z.object({
  name: z.string().min(2, { message: 'O nome é obrigatório.' }),
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
  userType: z.enum(['student', 'professor'], { required_error: 'Selecione o tipo de usuário.' }),
  age: z.coerce.number().min(1).optional(),
  gender: z.string().optional(),
  whatsapp: z.string().optional(),
});

const otpFormSchema = z.object({
  code: z.string().length(6, { message: 'O código deve ter 6 dígitos.' }),
});

type SignupFormValues = z.infer<typeof signupFormSchema>;
type OtpFormValues = z.infer<typeof otpFormSchema>;

function SignUpFormContent() {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'signup' | 'otp'>('signup');
  const [tempData, setTempData] = useState<SignupFormValues | null>(null);
  const { toast } = useToast();
  const { auth, firestore } = useFirebase();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const roleParam = searchParams.get('role');
  const invitedBy = searchParams.get('invitedBy');
  
  const defaultAvatar = PlaceHolderImages.find(img => img.id === 'user-avatar')?.imageUrl || '';
  const otpInputId = useId();

  const isStudentInvite = roleParam === 'student' && invitedBy;
  const isDirectProfessor = roleParam === 'professor';
  const isBlocked = roleParam === 'student' && !invitedBy;

  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: { 
      name: '', 
      email: '', 
      password: '', 
      userType: (roleParam === 'professor' ? 'professor' : 'student') as 'student' | 'professor',
      age: 18, 
      gender: '', 
      whatsapp: '' 
    },
  });

  useEffect(() => {
    if (roleParam === 'professor' || roleParam === 'student') {
      signupForm.setValue('userType', roleParam as any);
    }
  }, [roleParam, signupForm]);

  const linkProfessor = (studentId: string, studentName: string, studentEmail: string) => {
    if (invitedBy && firestore) {
      const professorStudentRef = doc(firestore, 'professors', invitedBy, 'students', studentId);
      setDocumentNonBlocking(professorStudentRef, {
        id: studentId,
        name: studentName,
        email: studentEmail,
        linkedAt: new Date().toISOString()
      }, { merge: true });
    }
  };

  const handleGoogleSignup = async () => {
    if (isBlocked) return;
    setLoading(true);
    const provider = new GoogleAuthProvider();
    const finalRole = roleParam === 'professor' ? 'professor' : 'student';

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Se for aluno, tentar vincular perfil pré-criado pelo Personal
      if (finalRole === 'student') {
        await linkExistingProfile(firestore, user.uid, user.email || '');
      }

      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(firestore, 'users', user.uid), {
          id: user.uid,
          name: user.displayName,
          email: user.email,
          userType: finalRole,
          photoUrl: user.photoURL,
          createdAt: new Date().toISOString(),
        });

        if (finalRole === 'student' && invitedBy) {
          linkProfessor(user.uid, user.displayName || '', user.email || '');
        }
      }

      toast({ 
        title: 'Bem-vindo!', 
        description: `Cadastro como ${finalRole === 'professor' ? 'Professor' : 'Aluno'} realizado.` 
      });
      router.push('/');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: "Falha no cadastro com Google." });
    } finally {
      setLoading(false);
    }
  };

  async function onSignupSubmit(values: SignupFormValues) {
    if (isBlocked) return;
    setLoading(true);
    const normalizedEmail = values.email.toLowerCase().trim();
    try {
      const res = await sendLoginCode(normalizedEmail);
      if (res.success && res.code) {
        await setDoc(doc(firestore, 'auth_codes', normalizedEmail), { code: res.code, expiresAt: res.expiresAt });
        setTempData({ ...values, email: normalizedEmail });
        setStep('otp');
        otpForm.reset();
        toast({ title: 'Código Enviado!', description: `Código: ${res.code}`, duration: 15000 });
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao gerar código.' });
    } finally {
      setLoading(false);
    }
  }

  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpFormSchema),
    defaultValues: { code: '' },
  });

  async function onOtpSubmit(values: OtpFormValues) {
    if (!tempData) return;
    setLoading(true);
    const normalizedEmail = tempData.email.toLowerCase().trim();
    try {
      const codeDoc = await getDoc(doc(firestore, 'auth_codes', normalizedEmail));
      if (!codeDoc.exists()) throw new Error('Código não encontrado.');
      const data = codeDoc.data();
      if (data.code !== values.code.trim()) throw new Error('Código incorreto.');

      const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, tempData.password);
      const user = userCredential.user;
      
      // Tentar migrar dados se o professor já tiver criado o perfil
      if (tempData.userType === 'student') {
        await linkExistingProfile(firestore, user.uid, normalizedEmail);
      }

      await updateProfile(user, { displayName: tempData.name, photoURL: defaultAvatar });
      
      await setDoc(doc(firestore, 'users', user.uid), {
        id: user.uid,
        name: tempData.name,
        email: normalizedEmail,
        userType: tempData.userType,
        photoUrl: defaultAvatar,
        age: tempData.age || null,
        gender: tempData.gender || null,
        whatsapp: tempData.whatsapp || null,
        createdAt: new Date().toISOString(),
      }, { merge: true });

      if (tempData.userType === 'student' && invitedBy) {
        linkProfessor(user.uid, tempData.name, normalizedEmail);
      }

      await deleteDoc(doc(firestore, 'auth_codes', normalizedEmail));
      toast({ title: 'Bem-vindo!', description: `Cadastro validado.` });
      router.push('/');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Falha', description: error.message });
    } finally {
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
              Para garantir o acompanhamento profissional, o cadastro de alunos é feito exclusivamente através de um link enviado pelo seu Personal Trainer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Solicite o link de convite ao seu professor para vincular sua conta automaticamente.
            </p>
            <Button asChild variant="outline" className="w-full rounded-full">
              <Link href="/">Voltar para Início</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div key={step} className="w-full max-w-md">
      {step === 'otp' ? (
        <Card className="border-primary/20 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
          <CardHeader className="items-center text-center">
            <div className="bg-primary/10 p-4 rounded-full mb-4">
              <ShieldCheck className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-2xl font-black text-primary">Validar Cadastro</CardTitle>
            <CardDescription>
              Enviamos um código para: <br />
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
                      <FormLabel htmlFor={otpInputId} className="text-center block w-full text-xs font-bold uppercase tracking-widest mb-4">Código</FormLabel>
                      <FormControl>
                        <Input 
                          id={otpInputId}
                          placeholder="000000" 
                          className="text-center text-3xl tracking-[0.4em] font-black h-16 bg-muted/30 border-primary/20" 
                          maxLength={6}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage className="text-center" />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full h-14 text-lg font-black rounded-full bg-primary" disabled={loading}>
                  {loading && <Loader2 className="h-5 w-5 animate-spin mr-2" />}
                  Confirmar Cadastro
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : (
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
            <Button 
              variant="outline" 
              className="w-full h-12 rounded-xl font-bold flex items-center justify-center gap-3 border-primary/20 hover:bg-primary/5"
              onClick={handleGoogleSignup}
              disabled={loading}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Cadastrar com Google
            </Button>

            <div className="flex items-center gap-4">
              <Separator className="flex-1" />
              <span className="text-[10px] uppercase font-bold text-muted-foreground">ou e-mail</span>
              <Separator className="flex-1" />
            </div>

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
                
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    {signupForm.watch('userType') === 'professor' ? (
                      <GraduationCap className="h-5 w-5 text-primary" />
                    ) : (
                      <UserRound className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-primary/60 tracking-wider">Papel</p>
                    <p className="text-sm font-black text-primary uppercase">
                      {signupForm.watch('userType') === 'professor' ? 'Personal Trainer' : 'Aluno'}
                    </p>
                  </div>
                </div>

                <Button type="submit" className="w-full h-14 text-lg font-black rounded-full bg-primary" disabled={loading}>
                  {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : 'Finalizar Cadastro'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
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
