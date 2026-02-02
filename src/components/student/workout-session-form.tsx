
'use client';

import { useState } from 'react';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ClipboardPen, Loader2, Save, Smile, Gauge, Timer, Repeat, History } from 'lucide-react';

export function WorkoutSessionForm() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Estados do formulário de sessão
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [preTraining, setPreTraining] = useState('');
  const [pleasure, setPleasure] = useState(7);
  const [pse, setPse] = useState(7);
  const [duration, setDuration] = useState('');
  const [recovery, setRecovery] = useState('');
  const [repeat, setRepeat] = useState(true);

  const programsRef = useMemoFirebase(() => 
    user ? collection(firestore, 'users', user.uid, 'trainingPrograms') : null
  , [firestore, user]);
  const { data: programs } = useCollection(programsRef);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedProgramId) {
      toast({ variant: "destructive", title: "Atenção", description: "Selecione um programa de treino." });
      return;
    }
    setLoading(true);

    const sessionRef = doc(collection(firestore, 'users', user.uid, 'trainingPrograms', selectedProgramId, 'workoutSessions'));
    const sessionId = sessionRef.id;

    setDocumentNonBlocking(sessionRef, {
      id: sessionId,
      trainingProgramId: selectedProgramId,
      date: new Date().toISOString(),
      preTrainingAssessment: preTraining,
      pleasureScale: pleasure,
      pseSession: pse,
      intentionToRepeat: repeat ? 1 : 0,
      duration: Number(duration),
      recoveryPerception: recovery,
      createdAt: serverTimestamp(),
    }, { merge: true });

    toast({
      title: "Treino Registrado!",
      description: "Sua percepção de treino foi salva com sucesso.",
    });
    
    // Resetar campos
    setPreTraining('');
    setDuration('');
    setRecovery('');
    setLoading(false);
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <Card className="border-primary/20 shadow-lg">
        <CardHeader className="bg-primary/5">
          <CardTitle className="flex items-center gap-2">
            <ClipboardPen className="h-6 w-6 text-primary" />
            Log da Sessão de Treino
          </CardTitle>
          <CardDescription>Registre sua percepção e detalhes da atividade realizada.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Programa de Treino</Label>
                <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o programa atual" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs?.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                    {!programs?.length && <SelectItem value="none" disabled>Nenhum programa prescrito</SelectItem>}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Timer className="h-4 w-4" /> Duração Total (min)
                </Label>
                <Input type="number" placeholder="Ex: 60" value={duration} onChange={(e) => setDuration(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Avaliação Pré-Treino / Observações</Label>
              <Textarea 
                placeholder="Como você está se sentindo antes de começar? (Dores, cansaço, etc)" 
                value={preTraining}
                onChange={(e) => setPreTraining(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="flex items-center gap-2">
                    <Smile className="h-4 w-4" /> Escala de Prazer (1-10)
                  </Label>
                  <span className="font-bold text-lg text-primary">{pleasure}</span>
                </div>
                <Slider value={[pleasure]} onValueChange={(v) => setPleasure(v[0])} min={1} max={10} step={1} />
                <div className="flex justify-between text-[10px] text-muted-foreground uppercase">
                  <span>Desagradável</span>
                  <span>Muito Agradável</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="flex items-center gap-2">
                    <Gauge className="h-4 w-4" /> PSE da Sessão (1-10)
                  </Label>
                  <span className="font-bold text-lg text-accent">{pse}</span>
                </div>
                <Slider value={[pse]} onValueChange={(v) => setPse(v[0])} min={1} max={10} step={1} />
                <div className="flex justify-between text-[10px] text-muted-foreground uppercase">
                  <span>Muito Leve</span>
                  <span>Máximo</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <History className="h-4 w-4" /> Percepção de Recuperação
              </Label>
              <Input placeholder="Como foi sua recuperação desde o último treino?" value={recovery} onChange={(e) => setRecovery(e.target.value)} />
            </div>

            <div className="flex items-center space-x-2 p-4 bg-muted/50 rounded-lg">
              <Switch id="repeat" checked={repeat} onCheckedChange={setRepeat} />
              <Label htmlFor="repeat" className="flex items-center gap-2 cursor-pointer">
                <Repeat className="h-4 w-4" /> Pretendo repetir este treino na próxima sessão
              </Label>
            </div>

            <Button type="submit" className="w-full flex items-center gap-2" disabled={loading || !selectedProgramId}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Log de Sessão
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
