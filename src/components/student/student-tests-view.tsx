'use client';

import { useState } from 'react';
import { useFirebase, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, collection, serverTimestamp } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlayCircle, Zap, Dumbbell, Activity, Timer, Ruler, Loader2, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

const TEST_PROTOCOLS = [
  { id: '10rm', name: 'Teste de 10RM', icon: Dumbbell, desc: 'Predição de força máxima dinâmica.', instruction: 'Realize o máximo de repetições com uma carga submáxima.' },
  { id: 'cooper', name: 'Cooper 12 Min', icon: Activity, desc: 'Estimativa de VO2máx por distância.', instruction: 'Corra a maior distância possível em 12 minutos.' },
  { id: 'bruce', name: 'Teste de Bruce', icon: Timer, desc: 'Capacidade aeróbia em esteira.', instruction: 'Protocolo de rampa com incrementos de inclinação e velocidade.' },
  { id: 'wells', name: 'Banco de Wells', icon: Ruler, desc: 'Flexibilidade de cadeia posterior.', instruction: 'Alcançar a maior distância possível no banco de madeira.' },
];

export function StudentTestsView() {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [activeTest, setActiveTest] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [testData, setTestData] = useState<any>({});

  const handleSaveTest = async () => {
    if (!user || !activeTest) return;
    setLoading(true);
    
    const testRef = doc(collection(firestore, 'users', user.uid, 'physicalTests'));
    setDocumentNonBlocking(testRef, {
      ...testData,
      testId: activeTest,
      userId: user.uid,
      date: new Date().toISOString(),
      createdAt: serverTimestamp(),
    }, { merge: true });

    toast({ title: "Teste registrado!", description: "Seu professor já pode analisar o resultado." });
    setLoading(false);
    setActiveTest(null);
  };

  const selectedProtocol = TEST_PROTOCOLS.find(t => t.id === activeTest);

  if (activeTest && selectedProtocol) {
    const Icon = selectedProtocol.icon;
    return (
      <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
        <header className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setActiveTest(null)} className="rounded-full">Voltar</Button>
          <h2 className="text-xl font-black text-primary uppercase">{selectedProtocol.name}</h2>
          <div />
        </header>

        <div className="aspect-video bg-black rounded-[2.5rem] relative flex items-center justify-center group cursor-pointer overflow-hidden border-4 border-primary/10">
          <div className="absolute inset-0 bg-primary/20 group-hover:bg-primary/40 transition-colors flex items-center justify-center">
            <PlayCircle className="h-16 w-16 text-white shadow-2xl" />
          </div>
          <p className="absolute bottom-4 text-[10px] font-black text-white uppercase tracking-widest bg-black/40 px-4 py-1 rounded-full">Assistir Tutorial Técnico</p>
        </div>

        <Alert className="bg-primary/5 border-primary/20 rounded-2xl">
          <Zap className="h-4 w-4 text-primary" />
          <AlertTitle className="text-xs font-black uppercase text-primary">Instrução</AlertTitle>
          <AlertDescription className="text-sm font-medium">{selectedProtocol.instruction}</AlertDescription>
        </Alert>

        <Card className="rounded-[2rem] border-primary/10 shadow-lg">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase text-muted-foreground">Coleta de Dados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {activeTest === '10rm' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Carga (kg)</Label><Input type="number" onChange={e => setTestData({...testData, weight: e.target.value})} /></div>
                <div className="space-y-2"><Label>Reps Realizadas</Label><Input type="number" onChange={e => setTestData({...testData, reps: e.target.value})} /></div>
              </div>
            )}
            {activeTest === 'cooper' && (
              <div className="space-y-2"><Label>Distância Total (metros)</Label><Input type="number" onChange={e => setTestData({...testData, distance: e.target.value})} /></div>
            )}
            {activeTest === 'wells' && (
              <div className="space-y-2"><Label>Alcance Alcançado (cm)</Label><Input type="number" onChange={e => setTestData({...testData, reach: e.target.value})} /></div>
            )}
            
            <Button onClick={handleSaveTest} disabled={loading} className="w-full h-16 rounded-full text-lg font-black bg-primary">
              {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 className="mr-2 h-6 w-6" />} SALVAR RESULTADO
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black text-primary uppercase tracking-tighter italic">Protocolos de Teste</h2>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-[0.2em]">Valide sua performance com base em ciência</p>
        </div>
        <Badge variant="outline" className="bg-primary/10 text-primary border-none px-4 py-1 h-8 rounded-full font-black text-[10px] uppercase">Acompanhamento Técnico</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TEST_PROTOCOLS.map((test) => {
          const Icon = test.icon;
          return (
            <Card key={test.id} onClick={() => setActiveTest(test.id)} className="nubank-card cursor-pointer group flex items-center gap-6 p-8 hover:border-primary">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                <Icon className="h-8 w-8" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black uppercase text-primary mb-1">{test.name}</h3>
                <p className="text-xs text-muted-foreground font-bold">{test.desc}</p>
              </div>
              <ChevronRight className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-all" />
            </Card>
          );
        })}
      </div>

      <div className="p-10 rounded-[3rem] bg-accent/5 border-2 border-dashed border-accent/20 text-center">
         <Sparkles className="h-10 w-10 text-accent mx-auto mb-4" />
         <h4 className="text-lg font-black text-accent-foreground uppercase">Solicitação do Professor</h4>
         <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2">Os testes que aparecem aqui são as referências padrão. Seu professor pode te notificar para realizar um teste específico conforme seu período de treino.</p>
      </div>
    </div>
  );
}
