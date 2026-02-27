'use client';

import { useState, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { ClipboardPen, Loader2, Smile, Gauge, Timer, Repeat, History as HistoryIcon, Dumbbell, CheckCircle2, AlertCircle } from 'lucide-react';
import { RECOVERY_MESSAGES } from '@/lib/constants';

interface ExerciseLog {
  sets: number;
  reps: string;
  weight: number;
  pse: number;
}

export function WorkoutSessionForm() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);

  // Estados do formulário
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [recovery, setRecovery] = useState(7);
  const [pleasure, setPleasure] = useState(0); // Feeling Scale -5 a +5
  const [pse, setPse] = useState(7);
  const [duration, setDuration] = useState(0);
  const [exerciseLogs, setExerciseLogs] = useState<Record<string, ExerciseLog>>({});

  const programsRef = useMemoFirebase(() => user ? collection(firestore, 'users', user.uid, 'trainingPrograms') : null, [firestore, user]);
  const { data: programs } = useCollection(programsRef);

  const prescribedExercisesRef = useMemoFirebase(() => (user && selectedProgramId) ? collection(firestore, 'users', user.uid, 'trainingPrograms', selectedProgramId, 'prescribedExercises') : null, [firestore, user, selectedProgramId]);
  const { data: prescribedExercises, isLoading: isLoadingExercises } = useCollection(prescribedExercisesRef);

  useEffect(() => {
    if (prescribedExercises) {
      const initialLogs: Record<string, ExerciseLog> = {};
      prescribedExercises.forEach(ex => {
        initialLogs[ex.id] = { sets: ex.sets || 0, reps: ex.reps || '', weight: ex.weight || 0, pse: 7 };
      });
      setExerciseLogs(initialLogs);
    }
  }, [prescribedExercises]);

  const handleStartWorkout = () => {
    if (!selectedProgramId) return toast({ variant: "destructive", title: "Selecione um programa" });
    setIsStarted(true);
    setStartTime(Date.now());
  };

  const handleSubmit = async () => {
    if (!user || !firestore || !startTime) return;
    setLoading(true);

    const endTime = Date.now();
    const durationMin = Math.round((endTime - startTime) / 60000);
    const internalLoad = pse * durationMin;

    try {
      const sessionId = doc(collection(firestore, 'dummy')).id;
      const sessionData = {
        id: sessionId,
        userId: user.uid,
        trainingProgramId: selectedProgramId,
        date: new Date().toISOString(),
        recoveryScale: recovery,
        pleasureScale: pleasure,
        pseSession: pse,
        duration: durationMin,
        internalLoad,
        createdAt: serverTimestamp(),
      };

      const flatSessionRef = doc(firestore, 'users', user.uid, 'workoutHistory_flat', sessionId);
      setDocumentNonBlocking(flatSessionRef, sessionData, { merge: true });

      Object.entries(exerciseLogs).forEach(([exId, log]) => {
        const prescribedEx = prescribedExercises?.find(p => p.id === exId);
        const exerciseId = doc(collection(firestore, 'dummy')).id;
        const exerciseData = {
          id: exerciseId,
          userId: user.uid,
          workoutSessionId: sessionId,
          name: prescribedEx?.name || 'Exercício',
          sets: Number(log.sets),
          reps: log.reps,
          weight: Number(log.weight),
          pseExercise: log.pse,
          createdAt: serverTimestamp(),
        };
        const flatExRef = doc(firestore, 'users', user.uid, 'exerciseHistory_flat', exerciseId);
        setDocumentNonBlocking(flatExRef, exerciseData, { merge: true });
      });

      toast({ title: "Treino Finalizado!", description: `Duração: ${durationMin}min | Carga Interna: ${internalLoad}` });
      setIsStarted(false);
      setSelectedProgramId('');
    } finally {
      setLoading(false);
    }
  };

  if (!isStarted) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="rounded-3xl border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>Preparar Treino</CardTitle>
            <CardDescription>Avalie sua recuperação antes de começar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Programa de Treino</Label>
              <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
                <SelectTrigger className="h-14 rounded-2xl border-primary/30"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {programs?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Escala de Recuperação (ESR)</Label>
                <span className="font-bold text-primary">{recovery}</span>
              </div>
              <Slider value={[recovery]} onValueChange={v => setRecovery(v[0])} min={1} max={10} step={1} />
              <p className="text-xs italic text-muted-foreground">{RECOVERY_MESSAGES[recovery]}</p>
            </div>
            <Button onClick={handleStartWorkout} className="w-full h-14 rounded-full text-lg font-bold">INICIAR TREINO</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="bg-primary text-white p-6 rounded-3xl shadow-xl flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Treino em Andamento</h2>
          <p className="text-sm opacity-80">Lembre-se de registrar as cargas utilizadas.</p>
        </div>
        <Timer className="h-8 w-8 animate-pulse" />
      </div>

      <div className="grid gap-4">
        {prescribedExercises?.map(ex => (
          <Card key={ex.id} className="rounded-2xl border-l-8 border-l-primary">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex-1">
                  <p className="font-bold text-lg">{ex.name}</p>
                  <p className="text-sm text-muted-foreground">{ex.sets}x {ex.reps} • {ex.weight}kg</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Sets</Label>
                    <Input className="h-9" type="number" value={exerciseLogs[ex.id]?.sets || ''} onChange={e => setExerciseLogs(prev => ({...prev, [ex.id]: {...prev[ex.id], sets: Number(e.target.value)}}))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Carga (kg)</Label>
                    <Input className="h-9" type="number" value={exerciseLogs[ex.id]?.weight || ''} onChange={e => setExerciseLogs(prev => ({...prev, [ex.id]: {...prev[ex.id], weight: Number(e.target.value)}}))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">PSE (1-10)</Label>
                    <Input className="h-9" type="number" value={exerciseLogs[ex.id]?.pse || ''} onChange={e => setExerciseLogs(prev => ({...prev, [ex.id]: {...prev[ex.id], pse: Number(e.target.value)}}))} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-3xl border-primary/20 bg-secondary/30 p-8 space-y-8">
         <h3 className="text-lg font-bold text-center">Finalizar Sessão</h3>
         
         <div className="space-y-4">
            <div className="flex justify-between items-center">
               <Label className="flex items-center gap-2"><Smile className="h-5 w-5" /> Escala de Prazer (Feeling)</Label>
               <span className="font-bold text-primary">{pleasure > 0 ? `+${pleasure}` : pleasure}</span>
            </div>
            <Slider value={[pleasure]} onValueChange={v => setPleasure(v[0])} min={-5} max={5} step={1} />
            <div className="flex justify-between text-[10px] text-muted-foreground font-bold uppercase">
               <span>Muito Ruim (-5)</span>
               <span>Muito Bom (+5)</span>
            </div>
         </div>

         <div className="space-y-4">
            <div className="flex justify-between items-center">
               <Label className="flex items-center gap-2"><Gauge className="h-5 w-5" /> PSE Geral do Treino (1-10)</Label>
               <span className="font-bold text-primary">{pse}</span>
            </div>
            <Slider value={[pse]} onValueChange={v => setPse(v[0])} min={1} max={10} step={1} />
         </div>

         <Button onClick={handleSubmit} disabled={loading} className="w-full h-16 rounded-full text-xl font-bold bg-primary shadow-xl">
            {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 className="mr-2" />}
            FINALIZAR TREINO
         </Button>
      </Card>
    </div>
  );
}