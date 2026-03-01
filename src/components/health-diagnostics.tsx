
'use client';

import { useState } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { doc, collection, serverTimestamp } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Beaker, Brain, Heart, Moon, Loader2, Save } from 'lucide-react';

export function HealthDiagnostics() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [healthData, setHealthData] = useState({
    healthPerception: 5,
    qualityOfLife: 5,
    sleep: 5,
    alcohol: '',
    tobacco: '',
    redSeries: '',
    hormones: '',
    liverIndicators: ''
  });

  const handleSave = async () => {
    if (!user || !firestore) return;
    setLoading(true);
    const healthRef = doc(collection(firestore, 'users', user.uid, 'healthData'));
    setDocumentNonBlocking(healthRef, {
      ...healthData,
      id: healthRef.id,
      userId: user.uid,
      date: new Date().toISOString(),
      createdAt: serverTimestamp(),
    }, { merge: true });
    toast({ title: "Dados de saúde salvos!" });
    setLoading(false);
  };

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
        <TabsList className="grid w-full grid-cols-2 h-auto p-1 bg-muted rounded-2xl mb-8">
          <TabsTrigger value="questionnaires" className="rounded-xl py-2"><Brain className="h-4 w-4 mr-2" /> Questionários</TabsTrigger>
          <TabsTrigger value="blood" className="rounded-xl py-2"><Beaker className="h-4 w-4 mr-2" /> Exames de Sangue</TabsTrigger>
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
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2"><Label>Consumo de Álcool</Label><Textarea value={healthData.alcohol} onChange={e => setHealthData(p => ({...p, alcohol: e.target.value}))} placeholder="Frequência e tipo..." /></div>
              <div className="space-y-2"><Label>Tabagismo</Label><Textarea value={healthData.tobacco} onChange={e => setHealthData(p => ({...p, tobacco: e.target.value}))} placeholder="Cigarros por dia, tempo de hábito..." /></div>
            </CardContent>
          </Card>
        </TabsContent>

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
      </Tabs>
    </div>
  );
}
