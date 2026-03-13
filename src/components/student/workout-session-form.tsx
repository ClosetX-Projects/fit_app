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
import { Timer, Smile, CheckCircle2, Loader2, Repeat, Play, Square, Info } from 'lucide-react';
import { RECOVERY_MESSAGES, BORG_SCALE_MESSAGES, BORG_SCALE_COLORS, FEELING_SCALE_MESSAGES } from '@/lib/constants';
import { cn } from '@/lib/utils';

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
  const [recovery, setRecovery] = useState(10);
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

      toast({ title: "Treino Finalizado!", description: "Dados registrados com sucesso." });
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
          <CardDescription>Escolha seu plano e avalie sua recuperação atual.</CardDescription>
        </CardHeader>
        <div className="space-y-8">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-primary tracking-widest">Plano de Treino</Label>
            <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
              <SelectTrigger className="h-14 rounded-2xl shadow-sm border-primary/20 bg-background">
                <SelectValue placeholder="Escolha um programa..." />
              </SelectTrigger>
              <SelectContent>
                {programs?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <Label className="font-black uppercase text-[10px] text-primary tracking-widest">Estado de Recuperação (ESR)</Label>
              <span className="text-3xl font-black text-primary">{recovery}</span>
            </div>
            <Slider 
              value={[recovery]} 
              onValueChange={v => setRecovery(v[0])} 
              min={0} 
              max={10} 
              step={1} 
              className="py-4"
            />
            <div className="p-4 bg-primary text-primary-foreground rounded-2xl text-center shadow-lg animate-in fade-in zoom-in-95 duration-300">
               <p className="text-xs font-black uppercase tracking-widest mb-1 opacity-70">Sua Percepção</p>
               <p className="text-lg font-bold leading-tight">"{RECOVERY_MESSAGES[recovery]}"</p>
            </div>
          </div>
          
          <Button onClick={handleStartWorkout} className="w-full h-20 rounded-full text-xl font-black bg-primary gap-3 shadow-xl hover:scale-[1.02] transition-transform">
            <Play className="h-8 w-8 fill-current" /> COMEÇAR AGORA
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      <div className="bg-primary p-6 rounded-3xl text-white flex justify-between items-center shadow-xl sticky top-20 z-30">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full bg-white/20 flex items-center justify-center animate-pulse"><Timer className="h-6 w-6" /></div>
          <div><h2 className="text-2xl font-black">{formatTime(elapsedTime)}</h2><p className="text-[10px] font-bold uppercase opacity-80">Cronômetro Ativo</p></div>
        </div>
        <Button onClick={handleOpenFinish} className="rounded-full bg-accent text-accent-foreground font-black px-8 h-12 shadow-lg hover:bg-accent/90">
          <Square className="h-4 w-4 mr-2" /> FINALIZAR
        </Button>
      </div>

      <div className="grid gap-4">
        {prescribedExercises?.map(ex => (
          <Card key={ex.id} className="rounded-2xl border-l-8 border-l-primary shadow-md hover:border-l-accent transition-all">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div className="flex-1">
                  <p className="font-black text-xl text-primary">{ex.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] uppercase font-black text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Meta: {ex.sets}x {ex.reps}</span>
                    {ex.weight > 0 && <span className="text-[10px] uppercase font-black text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{ex.weight}kg</span>}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground">Peso (kg)</Label>
                    <Input type="number" className="h-12 font-black text-lg text-center rounded-xl" value={exerciseLogs[ex.id]?.weight ?? 0} onChange={e => setExerciseLogs(p => ({...p, [ex.id]: {...p[ex.id], weight: Number(e.target.value)}}))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground">Séries</Label>
                    <Input type="number" className="h-12 font-black text-lg text-center rounded-xl" value={exerciseLogs[ex.id]?.sets ?? 0} onChange={e => setExerciseLogs(p => ({...p, [ex.id]: {...p[ex.id], sets: Number(e.target.value)}}))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-muted-foreground">PSE (Borg)</Label>
                    <Input type="number" min="0" max="10" className="h-12 font-black text-lg text-center rounded-xl text-primary" value={exerciseLogs[ex.id]?.pse ?? 7} onChange={e => setExerciseLogs(p => ({...p, [ex.id]: {...p[ex.id], pse: Number(e.target.value)}}))} />
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex items-center gap-3">
                 <div className={cn("h-8 px-4 rounded-full flex items-center justify-center text-[10px] font-black uppercase tracking-wider text-white shadow-sm transition-colors", BORG_SCALE_COLORS[exerciseLogs[ex.id]?.pse || 0])}>
                    {BORG_SCALE_MESSAGES[exerciseLogs[ex.id]?.pse || 0]}
                 </div>
                 <p className="text-[10px] text-muted-foreground font-medium italic">Escala de Borg Adaptada</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showPleasureDialog} onOpenChange={setShowPleasureDialog}>
        <DialogContent className="sm:max-w-md rounded-[3rem] p-10 text-center border-none shadow-2xl">
          <DialogHeader><DialogTitle className="text-3xl font-black text-primary mb-2 uppercase tracking-tighter">Missão Cumprida!</DialogTitle></DialogHeader>
          <div className="space-y-10 py-6">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Escala de Feeling (Sensação)</Label>
                <span className="text-5xl font-black text-primary">{pleasure > 0 ? `+${pleasure}` : pleasure}</span>
              </div>
              <Slider value={[pleasure]} onValueChange={v => setPleasure(v[0])} min={-5} max={5} step={1} className="py-4" />
              <div className="p-4 bg-primary text-primary-foreground rounded-2xl text-center shadow-lg">
                <p className="text-xs font-black uppercase tracking-widest mb-1 opacity-70">Sensação Atual</p>
                <p className="text-xl font-black uppercase italic">{FEELING_SCALE_MESSAGES[pleasure]}</p>
              </div>
              <div className="flex justify-between text-[10px] font-black text-muted-foreground uppercase tracking-widest px-2">
                <span>Muito Ruim</span>
                <span>Muito Bom</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-5 bg-primary/5 rounded-[2rem] border border-primary/10">
              <Switch checked={intentionToRepeat} onCheckedChange={setIntentionToRepeat} />
              <Label className="flex items-center gap-2 font-black text-[10px] uppercase tracking-widest text-left leading-tight">
                <Repeat className="h-4 w-4 text-primary shrink-0" /> Pretendo repetir este treino na próxima sessão
              </Label>
            </div>

            <Button onClick={handleSubmit} disabled={loading} className="w-full h-20 rounded-full text-2xl font-black bg-primary shadow-2xl shadow-primary/30 hover:scale-[1.02] transition-transform">
              {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 className="mr-3 h-8 w-8" />} FINALIZAR AGORA
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
