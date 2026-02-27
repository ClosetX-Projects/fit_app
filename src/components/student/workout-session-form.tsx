
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
import { useToast } from '@/hooks/use-toast';
import { Timer, Smile, CheckCircle2, Loader2, ArrowLeft, History } from 'lucide-react';
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
        recoveryScale: recovery,
        pleasureScale: pleasure,
        pseSession: 0, // Será coletado via alerta no dashboard após 15-30 min
        duration: durationMin,
        internalLoad: 0,
        createdAt: serverTimestamp(),
      };

      const flatSessionRef = doc(firestore, 'users', user.uid, 'workoutHistory_flat', sessionId);
      setDocumentNonBlocking(flatSessionRef, sessionData, { merge: true });

      // Registrar histórico de cada exercício
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

      toast({ 
        title: "Treino Finalizado!", 
        description: "Lembre-se de voltar em 15 min para registrar sua percepção de esforço (PSE).",
        duration: 8000
      });
      
      setIsStarted(false);
      setSelectedProgramId('');
      setStartTime(null);
    } finally {
      setLoading(false);
    }
  };

  if (!isStarted) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="rounded-3xl border-primary/20 bg-primary/5 shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-black text-primary flex items-center gap-2">
              <Dumbbell className="h-6 w-6" /> Preparar Treino
            </CardTitle>
            <CardDescription>Escolha seu plano e avalie sua recuperação.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Programa de Treino</Label>
              <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
                <SelectTrigger className="h-14 rounded-2xl border-primary/30 text-lg font-medium shadow-sm"><SelectValue placeholder="Selecione o plano de hoje..." /></SelectTrigger>
                <SelectContent>
                  {programs?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-6 bg-background/60 p-6 rounded-3xl border border-primary/10">
              <div className="flex justify-between items-center">
                <Label className="font-bold flex items-center gap-2 text-primary">
                  <History className="h-4 w-4" /> Recuperação (ESR)
                </Label>
                <span className="text-2xl font-black text-primary">{recovery}</span>
              </div>
              <Slider value={[recovery]} onValueChange={v => setRecovery(v[0])} min={1} max={10} step={1} />
              <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
                <p className="text-sm font-medium text-primary italic text-center">"{RECOVERY_MESSAGES[recovery]}"</p>
              </div>
            </div>
            <Button onClick={handleStartWorkout} className="w-full h-16 rounded-full text-xl font-black shadow-lg hover:shadow-primary/20 active:scale-95 transition-all">
              INICIAR TREINO
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      <div className="bg-primary text-white p-8 rounded-3xl shadow-2xl flex justify-between items-center animate-in slide-in-from-top-4 duration-500">
        <div>
          <h2 className="text-2xl font-black">Sessão Ativa</h2>
          <p className="text-sm opacity-90 font-medium">Foque na técnica e registre suas cargas.</p>
        </div>
        <Timer className="h-10 w-10 animate-pulse text-white/50" />
      </div>

      <div className="grid gap-4">
        {prescribedExercises?.map(ex => (
          <Card key={ex.id} className="rounded-2xl border-l-8 border-l-primary shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="flex-1">
                  <p className="font-black text-xl text-primary">{ex.name}</p>
                  <p className="text-sm text-muted-foreground font-bold mt-1">Prescrito: {ex.sets}x {ex.reps} • {ex.weight}kg</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Séries</Label>
                    <Input className="h-10 text-center font-bold" type="number" value={exerciseLogs[ex.id]?.sets || ''} onChange={e => setExerciseLogs(prev => ({...prev, [ex.id]: {...prev[ex.id], sets: Number(e.target.value)}}))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">Peso (kg)</Label>
                    <Input className="h-10 text-center font-bold" type="number" value={exerciseLogs[ex.id]?.weight || ''} onChange={e => setExerciseLogs(prev => ({...prev, [ex.id]: {...prev[ex.id], weight: Number(e.target.value)}}))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground">PSE (1-10)</Label>
                    <Input className="h-10 text-center font-bold" type="number" value={exerciseLogs[ex.id]?.pse || ''} onChange={e => setExerciseLogs(prev => ({...prev, [ex.id]: {...prev[ex.id], pse: Number(e.target.value)}}))} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-[2.5rem] border-primary/20 bg-secondary/40 p-10 space-y-10 shadow-inner">
         <div className="text-center space-y-2">
           <h3 className="text-2xl font-black text-primary">Finalizar Sessão</h3>
           <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Feedback Imediato</p>
         </div>
         
         <div className="space-y-6">
            <div className="flex justify-between items-center">
               <Label className="flex items-center gap-2 text-lg font-bold"><Smile className="h-6 w-6 text-primary" /> Como você se sente? (Prazer)</Label>
               <span className="text-3xl font-black text-primary">{pleasure > 0 ? `+${pleasure}` : pleasure}</span>
            </div>
            <Slider value={[pleasure]} onValueChange={v => setPleasure(v[0])} min={-5} max={5} step={1} className="py-4" />
            <div className="flex justify-between text-[10px] text-muted-foreground font-black uppercase tracking-wider">
               <span>Muito Ruim (-5)</span>
               <span>Muito Bom (+5)</span>
            </div>
         </div>

         <div className="flex gap-4">
            <Button variant="outline" onClick={() => setIsStarted(false)} className="flex-1 h-16 rounded-full font-bold border-2">DESCARTAR</Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-[2] h-16 rounded-full text-xl font-black bg-primary shadow-xl">
               {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 className="mr-2 h-6 w-6" />}
               FINALIZAR AGORA
            </Button>
         </div>
      </Card>
    </div>
  );
}
