
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
import { Timer, Smile, CheckCircle2, Loader2, Repeat, Activity } from 'lucide-react';
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

  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [recovery, setRecovery] = useState(7);
  const [pleasure, setPleasure] = useState(0);
  const [intentionToRepeat, setIntentionToRepeat] = useState(false);
  const [exerciseLogs, setExerciseLogs] = useState<Record<string, ExerciseLog>>({});

  const programsRef = useMemoFirebase(() => user ? collection(firestore, 'users', user.uid, 'trainingPrograms') : null, [firestore, user]);
  const { data: programs } = useCollection(programsRef);

  const prescribedExercisesRef = useMemoFirebase(() => (user && selectedProgramId) ? collection(firestore, 'users', user.uid, 'trainingPrograms', selectedProgramId, 'prescribedExercises') : null, [firestore, user, selectedProgramId]);
  const { data: prescribedExercises } = useCollection(prescribedExercisesRef);

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

    try {
      const sessionId = doc(collection(firestore, 'dummy')).id;
      const sessionData = {
        id: sessionId,
        userId: user.uid,
        trainingProgramId: selectedProgramId,
        date: new Date().toISOString(),
        recoveryPerception: recovery,
        pleasureScale: pleasure,
        intentionToRepeat: intentionToRepeat ? 1 : 0,
        duration: durationMin,
        createdAt: serverTimestamp(),
      };

      const flatSessionRef = doc(firestore, 'users', user.uid, 'workoutHistory_flat', sessionId);
      setDocumentNonBlocking(flatSessionRef, sessionData, { merge: true });

      Object.entries(exerciseLogs).forEach(([exId, log]) => {
        const prescribedEx = prescribedExercises?.find(p => p.id === exId);
        const exerciseId = doc(collection(firestore, 'dummy')).id;
        const volumeLoad = Number(log.sets) * Number(log.reps.split(/[^0-9]/)[0] || 0) * Number(log.weight);
        
        const exerciseData = {
          id: exerciseId,
          userId: user.uid,
          workoutSessionId: sessionId,
          name: prescribedEx?.name || 'Exercício',
          sets: Number(log.sets),
          reps: log.reps,
          weight: Number(log.weight),
          pseExercise: log.pse,
          volumeLoad,
          createdAt: serverTimestamp(),
        };
        const flatExRef = doc(firestore, 'users', user.uid, 'exerciseHistory_flat', exerciseId);
        setDocumentNonBlocking(flatExRef, exerciseData, { merge: true });
      });

      toast({ title: "Treino Finalizado!", description: "Dados registrados com sucesso." });
      setIsStarted(false);
      setStartTime(null);
    } finally {
      setLoading(false);
    }
  };

  if (!isStarted) {
    return (
      <Card className="rounded-3xl border-primary/20 bg-primary/5 shadow-xl p-8 max-w-2xl mx-auto">
        <CardHeader className="p-0 mb-8">
          <CardTitle className="text-3xl font-black text-primary">Iniciar Sessão</CardTitle>
          <CardDescription>Avalie sua recuperação antes de começar.</CardDescription>
        </CardHeader>
        <div className="space-y-8">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-primary">Programa</Label>
            <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
              <SelectTrigger className="h-14 rounded-2xl"><SelectValue placeholder="Escolha o plano..." /></SelectTrigger>
              <SelectContent>{programs?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-6">
            <div className="flex justify-between items-center"><Label className="font-bold">Recuperação (ESR)</Label><span className="text-2xl font-black text-primary">{recovery}</span></div>
            <Slider value={[recovery]} onValueChange={v => setRecovery(v[0])} min={1} max={10} step={1} />
            <p className="text-xs text-center font-medium p-4 bg-primary/10 rounded-2xl">"{RECOVERY_MESSAGES[recovery]}"</p>
          </div>
          <Button onClick={handleStartWorkout} className="w-full h-16 rounded-full text-xl font-black bg-primary">COMEÇAR AGORA</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      <div className="bg-primary p-6 rounded-3xl text-white flex justify-between items-center">
        <div><h2 className="text-xl font-black">Treino em Andamento</h2><p className="text-xs opacity-80">Finalize ao terminar todos os exercícios.</p></div>
        <Timer className="h-8 w-8 animate-pulse" />
      </div>

      <div className="grid gap-4">
        {prescribedExercises?.map(ex => (
          <Card key={ex.id} className="rounded-2xl border-l-4 border-l-primary">
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="font-bold text-lg">{ex.name}</p>
                <p className="text-xs text-muted-foreground">Prescrito: {ex.sets}x {ex.reps} | {ex.weight}kg</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1"><Label className="text-[10px]">Peso</Label><Input type="number" className="h-8" value={exerciseLogs[ex.id]?.weight} onChange={e => setExerciseLogs(p => ({...p, [ex.id]: {...p[ex.id], weight: Number(e.target.value)}}))} /></div>
                <div className="space-y-1"><Label className="text-[10px]">Séries</Label><Input type="number" className="h-8" value={exerciseLogs[ex.id]?.sets} onChange={e => setExerciseLogs(p => ({...p, [ex.id]: {...p[ex.id], sets: Number(e.target.value)}}))} /></div>
                <div className="space-y-1"><Label className="text-[10px]">PSE</Label><Input type="number" className="h-8" value={exerciseLogs[ex.id]?.pse} onChange={e => setExerciseLogs(p => ({...p, [ex.id]: {...p[ex.id], pse: Number(e.target.value)}}))} /></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-[2.5rem] bg-secondary/30 p-8 space-y-8">
        <h3 className="text-center text-xl font-black text-primary">Finalizar Treino</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center"><Label className="font-bold">Como se sente? (Feeling)</Label><span className="text-2xl font-black">{pleasure}</span></div>
          <Slider value={[pleasure]} onValueChange={v => setPleasure(v[0])} min={-5} max={5} step={1} />
        </div>
        <div className="flex items-center gap-3 p-4 bg-background rounded-2xl">
          <Switch checked={intentionToRepeat} onCheckedChange={setIntentionToRepeat} />
          <Label className="flex items-center gap-2"><Repeat className="h-4 w-4" /> Intenção de repetir o treino</Label>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => setIsStarted(false)} className="flex-1 rounded-full h-14">DESCARTAR</Button>
          <Button onClick={handleSubmit} disabled={loading} className="flex-[2] rounded-full h-14 text-lg font-black bg-primary">FINALIZAR</Button>
        </div>
      </Card>
    </div>
  );
}
