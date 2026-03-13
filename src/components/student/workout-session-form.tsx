
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Timer, Smile, CheckCircle2, Loader2, Repeat, Play, Square } from 'lucide-react';
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
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showPleasureDialog, setShowPleasureDialog] = useState(false);

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
    let interval: any;
    if (isStarted) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - (startTime || Date.now())) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isStarted, startTime]);

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
    setElapsedTime(0);
  };

  const handleOpenFinish = () => {
    setShowPleasureDialog(true);
  };

  const handleSubmit = async () => {
    if (!user || !firestore || !startTime) return;
    setLoading(true);
    const durationMin = Math.round(elapsedTime / 60);

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
        const flatExRef = doc(firestore, 'users', user.uid, 'exerciseHistory_flat', exerciseId);
        setDocumentNonBlocking(flatExRef, {
          id: exerciseId,
          userId: user.uid,
          workoutSessionId: sessionId,
          name: prescribedEx?.name || 'Exercício',
          sets: Number(log.sets),
          reps: log.reps,
          weight: Number(log.weight),
          pseExercise: log.pse,
          createdAt: serverTimestamp(),
        }, { merge: true });
      });

      toast({ title: "Treino Finalizado!", description: "Dados registrados." });
      setIsStarted(false);
      setStartTime(null);
      setShowPleasureDialog(false);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!isStarted) {
    return (
      <Card className="rounded-3xl border-primary/20 bg-primary/5 p-8 max-w-2xl mx-auto shadow-xl">
        <CardHeader className="p-0 mb-8">
          <CardTitle className="text-3xl font-black text-primary uppercase">INICIAR TREINO</CardTitle>
          <CardDescription>Escolha seu plano e avalie sua recuperação.</CardDescription>
        </CardHeader>
        <div className="space-y-8">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-primary">Selecione o Plano</Label>
            <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
              <SelectTrigger className="h-14 rounded-2xl shadow-sm"><SelectValue placeholder="Escolha..." /></SelectTrigger>
              <SelectContent>{programs?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-6">
            <div className="flex justify-between items-center"><Label className="font-bold">Recuperação (ESR)</Label><span className="text-2xl font-black text-primary">{recovery}</span></div>
            <Slider value={[recovery]} onValueChange={v => setRecovery(v[0])} min={1} max={10} step={1} />
            <p className="text-[10px] text-center font-bold p-4 bg-primary/10 rounded-2xl uppercase">"{RECOVERY_MESSAGES[recovery]}"</p>
          </div>
          <Button onClick={handleStartWorkout} className="w-full h-16 rounded-full text-xl font-black bg-primary gap-3 shadow-lg">
            <Play className="h-6 w-6" /> COMEÇAR SESSÃO
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      <div className="bg-primary p-6 rounded-3xl text-white flex justify-between items-center shadow-xl">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center animate-pulse"><Timer className="h-6 w-6" /></div>
          <div><h2 className="text-2xl font-black">{formatTime(elapsedTime)}</h2><p className="text-[10px] font-bold uppercase opacity-80">Tempo Decorrido</p></div>
        </div>
        <Button onClick={handleOpenFinish} className="rounded-full bg-accent text-accent-foreground font-black px-8 h-12 shadow-lg hover:bg-accent/90">
          <Square className="h-4 w-4 mr-2" /> FINALIZAR
        </Button>
      </div>

      <div className="grid gap-4">
        {prescribedExercises?.map(ex => (
          <Card key={ex.id} className="rounded-2xl border-l-4 border-l-primary shadow-md">
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><p className="font-black text-lg text-primary">{ex.name}</p><p className="text-[10px] uppercase font-bold text-muted-foreground">{ex.sets}x {ex.reps} | {ex.weight}kg</p></div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1"><Label className="text-[10px]">Peso</Label><Input type="number" className="h-10 font-bold" value={exerciseLogs[ex.id]?.weight ?? 0} onChange={e => setExerciseLogs(p => ({...p, [ex.id]: {...p[ex.id], weight: Number(e.target.value)}}))} /></div>
                <div className="space-y-1"><Label className="text-[10px]">Séries</Label><Input type="number" className="h-10 font-bold" value={exerciseLogs[ex.id]?.sets ?? 0} onChange={e => setExerciseLogs(p => ({...p, [ex.id]: {...p[ex.id], sets: Number(e.target.value)}}))} /></div>
                <div className="space-y-1"><Label className="text-[10px]">PSE</Label><Input type="number" className="h-10 font-bold" value={exerciseLogs[ex.id]?.pse ?? 7} onChange={e => setExerciseLogs(p => ({...p, [ex.id]: {...p[ex.id], pse: Number(e.target.value)}}))} /></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showPleasureDialog} onOpenChange={setShowPleasureDialog}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] p-10 text-center">
          <DialogHeader><DialogTitle className="text-3xl font-black text-primary mb-2 uppercase">Como foi o treino?</DialogTitle></DialogHeader>
          <div className="space-y-10 py-6">
            <div className="space-y-6">
              <div className="flex justify-between items-center"><Label className="font-black uppercase text-xs">Escala de Prazer (Feeling)</Label><span className="text-4xl font-black text-primary">{pleasure}</span></div>
              <Slider value={[pleasure]} onValueChange={v => setPleasure(v[0])} min={-5} max={5} step={1} />
              <div className="flex justify-between text-[10px] font-bold text-muted-foreground"><span>MUITO RUIM</span><span>EXCELENTE</span></div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-2xl border border-primary/5">
              <Switch checked={intentionToRepeat} onCheckedChange={setIntentionToRepeat} />
              <Label className="flex items-center gap-2 font-bold text-xs"><Repeat className="h-4 w-4" /> PRETENDO REPETIR NA PRÓXIMA</Label>
            </div>
            <Button onClick={handleSubmit} disabled={loading} className="w-full h-16 rounded-full text-xl font-black bg-primary shadow-xl">
              {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 className="mr-2 h-6 w-6" />} FINALIZAR AGORA
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
