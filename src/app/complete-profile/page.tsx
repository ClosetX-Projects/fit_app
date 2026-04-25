'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/auth-provider';
import { fetchApi } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { Loader2, UserRound, GraduationCap, ChevronRight, Check } from 'lucide-react';
import { Logo } from '@/components/icons';

const professorSchema = z.object({
  nome: z.string().min(3, 'Nome muito curto'),
  biotipo: z.enum(['masculino', 'feminino']),
});

const alunoSchema = z.object({
  nome: z.string().min(3, 'Nome muito curto'),
  biotipo: z.enum(['masculino', 'feminino']),
  data_nascimento: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Data de nascimento inválida',
  }),
  professor_id: z.string().uuid('Selecione um professor'),
});

type ProfessorValues = z.infer<typeof professorSchema>;
type AlunoValues = z.infer<typeof alunoSchema>;

export default function CompleteProfilePage() {
  const { user, refreshProfile } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<'professor' | 'aluno' | null>(null);
  const [professors, setProfessors] = useState<{ id: string; nome: string }[]>([]);

  useEffect(() => {
    if (user?.is_profile_complete) {
      router.push('/');
    }
  }, [user, router]);

  useEffect(() => {
    if (role === 'aluno') {
      fetchApi('/users/professores')
        .then((data) => setProfessors(data))
        .catch((err) => console.error('Erro ao carregar professores:', err));
    }
  }, [role]);

  const professorForm = useForm<ProfessorValues>({
    resolver: zodResolver(professorSchema),
    defaultValues: { nome: user?.nome || '', biotipo: 'masculino' },
  });

  const alunoForm = useForm<AlunoValues>({
    resolver: zodResolver(alunoSchema),
    defaultValues: { nome: user?.nome || '', biotipo: 'masculino', data_nascimento: '', professor_id: '' },
  });

  async function onProfessorSubmit(values: ProfessorValues) {
    setLoading(true);
    try {
      await fetchApi('/users/complete-profile/professor', {
        method: 'POST',
        data: values,
      });
      toast({ title: 'Perfil atualizado!', description: 'Bem-vindo, Professor.' });
      await refreshProfile();
      router.push('/');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setLoading(false);
    }
  }

  async function onAlunoSubmit(values: AlunoValues) {
    setLoading(true);
    try {
      await fetchApi('/users/complete-profile/aluno', {
        method: 'POST',
        data: values,
      });
      toast({ title: 'Perfil atualizado!', description: 'Bem-vindo ao time.' });
      await refreshProfile();
      router.push('/');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
    } finally {
      setLoading(false);
    }
  }

  if (!role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="text-center space-y-2">
            <Logo className="mx-auto mb-6 scale-150" />
            <h1 className="text-4xl font-black text-primary tracking-tight">Quase lá!</h1>
            <p className="text-muted-foreground text-lg">Como você pretende utilizar o FitAssist?</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card 
              className="cursor-pointer border-2 hover:border-primary transition-all group overflow-hidden"
              onClick={() => setRole('professor')}
            >
              <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary group-hover:text-white transition-colors">
                  <GraduationCap size={48} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold">Professor</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Vou prescrever treinos, gerenciar alunos e realizar avaliações físicas.
                  </p>
                </div>
                <div className="pt-4">
                  <Button variant="ghost" className="group-hover:translate-x-1 transition-transform">
                    Selecionar <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer border-2 hover:border-primary transition-all group overflow-hidden"
              onClick={() => setRole('aluno')}
            >
              <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary group-hover:text-white transition-colors">
                  <UserRound size={48} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold">Aluno</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Vou visualizar meus treinos, acompanhar meu progresso e histórico.
                  </p>
                </div>
                <div className="pt-4">
                  <Button variant="ghost" className="group-hover:translate-x-1 transition-transform">
                    Selecionar <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 py-12">
      <Card className="w-full max-w-md border-primary/20 shadow-2xl animate-in zoom-in-95 duration-500">
        <CardHeader className="text-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className="absolute left-4 top-4"
            onClick={() => setRole(null)}
          >
            Voltar
          </Button>
          <CardTitle className="text-2xl font-black text-primary">
            {role === 'professor' ? 'Perfil do Professor' : 'Perfil do Aluno'}
          </CardTitle>
          <CardDescription>Preencha os dados abaixo para finalizar seu acesso</CardDescription>
        </CardHeader>
        <CardContent>
          {role === 'professor' ? (
            <Form {...professorForm}>
              <form onSubmit={professorForm.handleSubmit(onProfessorSubmit)} className="space-y-6">
                <FormField
                  control={professorForm.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Seu nome" className="h-12 rounded-xl" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={professorForm.control}
                  name="biotipo"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Biotipo (Sexo Biológico)</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex gap-4"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="masculino" />
                            </FormControl>
                            <FormLabel className="font-normal">Masculino</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="feminino" />
                            </FormControl>
                            <FormLabel className="font-normal">Feminino</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full h-14 text-lg font-black rounded-full bg-primary" disabled={loading}>
                  {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Check className="h-5 w-5 mr-2" />}
                  Concluir Cadastro
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...alunoForm}>
              <form onSubmit={alunoForm.handleSubmit(onAlunoSubmit)} className="space-y-6">
                <FormField
                  control={alunoForm.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Seu nome" className="h-12 rounded-xl" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={alunoForm.control}
                  name="biotipo"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Biotipo (Sexo Biológico)</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex gap-4"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="masculino" />
                            </FormControl>
                            <FormLabel className="font-normal">Masculino</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="feminino" />
                            </FormControl>
                            <FormLabel className="font-normal">Feminino</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={alunoForm.control}
                  name="data_nascimento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Nascimento</FormLabel>
                      <FormControl>
                        <Input type="date" className="h-12 rounded-xl" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={alunoForm.control}
                  name="professor_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Professor Responsável</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 rounded-xl">
                            <SelectValue placeholder="Selecione seu professor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {professors.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full h-14 text-lg font-black rounded-full bg-primary" disabled={loading}>
                  {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Check className="h-5 w-5 mr-2" />}
                  Concluir Cadastro
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
