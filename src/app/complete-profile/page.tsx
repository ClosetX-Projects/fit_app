'use client';

import { useState, useEffect, Suspense } from 'react';
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
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Check } from 'lucide-react';
import { Logo } from '@/components/icons';

const alunoSchema = z.object({
  nome: z.string().min(3, 'Nome muito curto'),
  biotipo: z.enum(['masculino', 'feminino']),
  data_nascimento: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Data de nascimento inválida',
  }),
  professor_id: z.string().uuid('ID do professor inválido'),
});

type AlunoValues = z.infer<typeof alunoSchema>;

function CompleteProfileContent() {
  const { user, refreshProfile } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [professors, setProfessors] = useState<{ id: string; nome: string }[]>([]);

  const invitedBy = searchParams.get('invitedBy') || '';

  useEffect(() => {
    // Busca a lista de professores para validação/exibição se necessário
    fetchApi('/users/professores')
      .then((data) => setProfessors(data))
      .catch((err) => console.error('Erro ao carregar professores:', err));
  }, []);

  const alunoForm = useForm<AlunoValues>({
    resolver: zodResolver(alunoSchema),
    defaultValues: { 
      nome: user?.nome || '', 
      biotipo: 'masculino', 
      data_nascimento: '', 
      professor_id: invitedBy 
    },
  });

  // Atualiza o professor_id se o parâmetro da URL mudar
  useEffect(() => {
    if (invitedBy) {
      alunoForm.setValue('professor_id', invitedBy);
    }
  }, [invitedBy, alunoForm]);

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 py-12">
      <Card className="w-full max-w-md border-primary/20 shadow-2xl animate-in zoom-in-95 duration-500">
        <CardHeader className="text-center">
          <Logo className="mx-auto mb-4 scale-110" />
          <CardTitle className="text-2xl font-black text-primary">
            Completar Perfil de Aluno
          </CardTitle>
          <CardDescription>Vincule-se ao seu professor para acessar seus treinos</CardDescription>
        </CardHeader>
        <CardContent>
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
                    <FormLabel>Professor Responsável (ID)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="UUID do Professor" 
                        className="h-12 rounded-xl bg-muted/50" 
                        readOnly={!!invitedBy}
                        {...field} 
                      />
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
        </CardContent>
      </Card>
    </div>
  );
}

export default function CompleteProfilePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>}>
      <CompleteProfileContent />
    </Suspense>
  );
}
