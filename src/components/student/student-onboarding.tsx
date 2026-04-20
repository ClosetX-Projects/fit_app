
'use client';

import { useState } from 'react';
import { useUser } from '@/contexts/auth-provider';
import { fetchApi } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Logo } from '@/components/icons';
import { ChevronRight, Ruler, Scale, Camera, Activity, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AssessmentForm } from '@/components/assessment-form';

export function StudentOnboarding() {
  const { user } = useUser();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [basicInfo, setBasicInfo] = useState({
    name: (user as any)?.nome || '',
    birthDate: '',
    gender: 'masculino',
  });

  const [method, setSelectedMethod] = useState<'manual' | 'bio' | 'scan' | null>(null);

  const handleNextStep = async () => {
    if (step === 1) {
      if (!basicInfo.name || !basicInfo.birthDate) {
        toast({ variant: 'destructive', title: "Campos obrigatórios", description: "Preencha seus dados básicos." });
        return;
      }
      if (user) {
        try {
          await fetchApi(`/users/alunos/${user.id}`, {
            method: 'PUT',
            data: {
              nome: basicInfo.name,
              data_nascimento: basicInfo.birthDate,
              biotipo: basicInfo.gender,
            }
          });
        } catch (e) {
          console.error(e);
        }
      }
      setStep(2);
    }
  };

  if (step === 3 && method) {
    // Renderiza a ficha de avaliação completa filtrada pelo método no futuro,
    // ou apenas mostramos o formulário completo que já temos.
    return (
      <div className="animate-in fade-in slide-in-from-right-4 duration-500">
        <div className="max-w-4xl mx-auto p-4 md:p-8">
          <header className="mb-10 text-center">
            <h2 className="text-3xl font-black text-primary uppercase">Sua Primeira Avaliação</h2>
            <p className="text-muted-foreground">Complete seu perfil para que seu professor prescreva seu treino.</p>
          </header>
          <AssessmentForm />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-lg space-y-8">
        <div className="flex justify-center mb-8">
          <Logo className="scale-150" />
        </div>

        {step === 1 && (
          <Card className="rounded-[2.5rem] border-primary/20 shadow-2xl animate-in zoom-in-95 duration-500">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-black text-primary uppercase">Bem-vindo!</CardTitle>
              <CardDescription>Vamos começar configurando seu perfil técnico.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                <Input 
                  value={basicInfo.name} 
                  onChange={e => setBasicInfo(p => ({...p, name: e.target.value}))} 
                  className="h-12 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nascimento</Label>
                  <Input 
                    type="date" 
                    value={basicInfo.birthDate} 
                    onChange={e => setBasicInfo(p => ({...p, birthDate: e.target.value}))} 
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gênero</Label>
                  <Select value={basicInfo.gender} onValueChange={v => setBasicInfo(p => ({...p, gender: v}))}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="feminino">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleNextStep} className="w-full h-16 rounded-full text-lg font-black bg-primary">
                PRÓXIMO PASSO <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-black text-primary uppercase">Método de Avaliação</h2>
              <p className="text-muted-foreground">Como você prefere registrar seus dados iniciais?</p>
            </div>

            <div className="grid gap-4">
              <button 
                onClick={() => { setSelectedMethod('manual'); setStep(3); }}
                className="nubank-card flex items-center gap-6 p-8 text-left hover:border-primary group"
              >
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <Ruler className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-black uppercase text-primary">Opção A: Manual</h3>
                  <p className="text-xs text-muted-foreground font-bold">Dobras cutâneas e circunferências corporais.</p>
                </div>
              </button>

              <button 
                onClick={() => { setSelectedMethod('bio'); setStep(3); }}
                className="nubank-card flex items-center gap-6 p-8 text-left hover:border-primary group"
              >
                <div className="h-16 w-16 rounded-2xl bg-accent/20 flex items-center justify-center text-accent-foreground group-hover:bg-accent transition-colors">
                  <Scale className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-black uppercase text-accent-foreground">Opção B: Bioimpedância</h3>
                  <p className="text-xs text-muted-foreground font-bold">Dados diretos de balança inteligente (TMB, Gordura %, Água).</p>
                </div>
              </button>

              <button 
                onClick={() => { setSelectedMethod('scan'); setStep(3); }}
                className="nubank-card flex items-center gap-6 p-8 text-left hover:border-primary group"
              >
                <div className="h-16 w-16 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <Camera className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-black uppercase text-foreground">Opção C: Escaneamento</h3>
                  <p className="text-xs text-muted-foreground font-bold">Captura visual assistida por IA via câmera do celular.</p>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
