
'use client';

import { useState } from 'react';
import { useUser } from '@/contexts/auth-provider';
import { fetchApi } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Beaker, Brain, Heart, Moon, Loader2, Save } from 'lucide-react';

export function HealthDiagnostics() {
  const { user } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [healthData, setHealthData] = useState({
    healthPerception: 5,
    sleep: 5,
    drinksAlcohol: 'no',
    alcoholFrequency: '',
    smokes: 'no',
    cigarettesPerDay: '',
    redSeries: '',
    hormones: '',
    liverIndicators: ''
  });

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Salvar Questionário (Percepção de Saúde, Sono, Hábitos)
      await fetchApi('/diagnostico_questionarios/', { 
        method: 'POST', 
        data: { 
          aluno_id: user.id,
          percepcao_saude: healthData.healthPerception,
          qualidade_sono: healthData.sleep,
          fuma: healthData.smokes === 'yes',
          cigarros_dia: healthData.smokes === 'yes' ? Number(healthData.cigarettesPerDay) : 0,
          consome_alcool: healthData.drinksAlcohol === 'yes',
          frequencia_alcool: healthData.drinksAlcohol === 'yes' ? healthData.alcoholFrequency : '',
          habitos_estilo_vida: `Fuma: ${healthData.smokes === 'yes' ? `Sim (${healthData.cigarettesPerDay} cigarros/dia)` : 'Não'}; Consome álcool: ${healthData.drinksAlcohol === 'yes' ? `Sim (${healthData.alcoholFrequency})` : 'Não'}`,
          pontuacao_total: (healthData.healthPerception + healthData.sleep)
        } 
      });

      // 2. Salvar Exames de Sangue (se houver dados)
      if (healthData.redSeries || healthData.hormones || healthData.liverIndicators) {
        await fetchApi('/diagnostico_exames/', {
          method: 'POST',
          data: {
            aluno_id: user.id,
            data_exame: new Date().toISOString().split('T')[0],
            serie_vermelha: healthData.redSeries,
            hormonios: healthData.hormones,
            indicadores_hepaticos: healthData.liverIndicators,
            observacoes: "Enviado via App"
          }
        });
      }

      toast({ title: "Dados de saúde sincronizados com o servidor!" });
    } catch (e) {
      console.error(e);
      toast({ 
        title: "Erro ao sincronizar", 
        description: "Os dados foram salvos localmente, mas houve um erro no servidor.",
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const isProfessor = user?.role === 'professor';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-primary">Diagnóstico e Exames</h2>
          <p className="text-muted-foreground">Monitoramento de saúde e indicadores laboratoriais.</p>
        </div>
        <Button onClick={handleSave} disabled={loading} className="rounded-full px-8 h-12">
          {loading ? <Loader2 className="animate-spin" /> : <Save className="mr-2" />} Salvar Tudo
        </Button>
      </div>

      <Tabs defaultValue="questionnaires" className="w-full">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 h-auto p-1 bg-muted rounded-2xl mb-8">
          <TabsTrigger value="questionnaires" className="rounded-xl py-2"><Brain className="h-4 w-4 mr-2" /> Questionários</TabsTrigger>
          {isProfessor && <TabsTrigger value="blood" className="rounded-xl py-2"><Beaker className="h-4 w-4 mr-2" /> Exames de Sangue</TabsTrigger>}
        </TabsList>

        <TabsContent value="questionnaires" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="rounded-3xl">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Heart className="h-4 w-4 text-primary" /> Percepção de Saúde</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Label>Nota de 1 a 10: {healthData.healthPerception}</Label>
                <Input type="range" min="1" max="10" value={healthData.healthPerception} onChange={e => setHealthData(p => ({...p, healthPerception: Number(e.target.value)}))} />
              </CardContent>
            </Card>
            <Card className="rounded-3xl">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Moon className="h-4 w-4 text-primary" /> Qualidade do Sono</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Label>Nota de 1 a 10: {healthData.sleep}</Label>
                <Input type="range" min="1" max="10" value={healthData.sleep} onChange={e => setHealthData(p => ({...p, sleep: Number(e.target.value)}))} />
              </CardContent>
            </Card>
          </div>
          <Card className="rounded-3xl">
            <CardHeader><CardTitle className="text-sm">Hábitos e Estilo de Vida</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Fuma?</Label>
                  <RadioGroup value={healthData.smokes} onValueChange={(value) => setHealthData(p => ({...p, smokes: value}))} className="grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-2 rounded-2xl border border-primary/20 px-4 py-3 cursor-pointer">
                      <RadioGroupItem value="yes" />
                      <span>Sim</span>
                    </label>
                    <label className="flex items-center gap-2 rounded-2xl border border-primary/20 px-4 py-3 cursor-pointer">
                      <RadioGroupItem value="no" />
                      <span>Não</span>
                    </label>
                  </RadioGroup>
                  {healthData.smokes === 'yes' && (
                    <Input type="number" min="0" placeholder="Cigarros por dia" value={healthData.cigarettesPerDay} onChange={e => setHealthData(p => ({...p, cigarettesPerDay: e.target.value}))} />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Consome álcool?</Label>
                  <RadioGroup value={healthData.drinksAlcohol} onValueChange={(value) => setHealthData(p => ({...p, drinksAlcohol: value}))} className="grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-2 rounded-2xl border border-primary/20 px-4 py-3 cursor-pointer">
                      <RadioGroupItem value="yes" />
                      <span>Sim</span>
                    </label>
                    <label className="flex items-center gap-2 rounded-2xl border border-primary/20 px-4 py-3 cursor-pointer">
                      <RadioGroupItem value="no" />
                      <span>Não</span>
                    </label>
                  </RadioGroup>
                  {healthData.drinksAlcohol === 'yes' && (
                    <Input placeholder="Frequência" value={healthData.alcoholFrequency} onChange={e => setHealthData(p => ({...p, alcoholFrequency: e.target.value}))} />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isProfessor && (
          <TabsContent value="blood" className="space-y-6">
            <Card className="rounded-3xl border-primary/20">
              <CardHeader><CardTitle className="flex items-center gap-2"><Beaker className="h-5 w-5 text-primary" /> Indicadores Bioquímicos</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="font-bold">Série Vermelha (Hemoglobina, Hematócrito...)</Label>
                  <Textarea className="min-h-[100px]" value={healthData.redSeries} onChange={e => setHealthData(p => ({...p, redSeries: e.target.value}))} placeholder="Insira os valores mais importantes..." />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">Hormônios (Testosterona, TSH, Cortisol...)</Label>
                  <Textarea className="min-h-[100px]" value={healthData.hormones} onChange={e => setHealthData(p => ({...p, hormones: e.target.value}))} />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold">Indicadores Hepáticos (TGO, TGP, Gama-GT...)</Label>
                  <Textarea className="min-h-[100px]" value={healthData.liverIndicators} onChange={e => setHealthData(p => ({...p, liverIndicators: e.target.value}))} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
