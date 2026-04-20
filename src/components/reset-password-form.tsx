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
import { fetchApi } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { Loader2, KeyRound, ArrowLeft } from 'lucide-react';

const resetSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  senha_temporaria: z.string().min(8, { message: 'A senha temporária tem pelo menos 8 caracteres.' }),
  nova_senha: z.string().min(8, { message: 'A nova senha deve ter pelo menos 8 caracteres.' }),
  confirmar_senha: z.string().min(8, { message: 'Confirme sua nova senha.' }),
}).refine((data) => data.nova_senha === data.confirmar_senha, {
  message: "As senhas não coincidem",
  path: ["confirmar_senha"],
});

type ResetFormValues = z.infer<typeof resetSchema>;

interface ResetPasswordFormProps {
  onBackToLogin: () => void;
}

export function ResetPasswordForm({ onBackToLogin }: ResetPasswordFormProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  
  const form = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: '', senha_temporaria: '', nova_senha: '', confirmar_senha: '' },
  });

  async function onSubmit(values: ResetFormValues) {
    setLoading(true);
    try {
      await fetchApi('/users/reset-temporary-password', {
        method: 'POST',
        data: {
          email: values.email.toLowerCase().trim(),
          senha_temporaria: values.senha_temporaria,
          nova_senha: values.nova_senha
        }
      });
      
      toast({ 
        title: 'Senha atualizada!', 
        description: 'Agora você pode fazer login com sua nova senha.' 
      });
      
      onBackToLogin();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao redefinir',
        description: error.message || 'Verifique seus dados e tente novamente.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-primary/20 shadow-2xl animate-in zoom-in-95 duration-300">
      <CardHeader className="text-center relative">
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute left-4 top-4 rounded-full" 
          onClick={onBackToLogin}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <CardTitle className="text-2xl font-black text-primary mt-4">Primeiro Acesso</CardTitle>
        <CardDescription>Crie sua senha definitiva para começar</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input placeholder="seu@email.com" {...field} className="h-12 rounded-xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="senha_temporaria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha Temporária</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Enviada por e-mail" {...field} className="h-12 rounded-xl" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nova_senha"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Mínimo 8 caracteres" {...field} className="h-12 rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmar_senha"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Repita a nova senha" {...field} className="h-12 rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" className="w-full h-14 text-lg font-black rounded-full bg-primary mt-4" disabled={loading}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <KeyRound className="h-5 w-5 mr-2" />}
              Redefinir Senha
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
