
'use client';

import { useState, useEffect } from 'react';
import { useFirebase, useUser, useCollection, useMemoFirebase, useDoc } from '@/firebase';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Timer, Smile, CheckCircle2, Loader2, Play, Square, Activity, HeartPulse, Droplets, ShieldAlert, Zap } from 'lucide-react';
import { RECOVERY_MESSAGES, BORG_SCALE_MESSAGES, BORG_SCALE_COLORS, FEELING_SCALE_MESSAGES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
  const [showMedicalCheck, setShowMedicalCheck] = useState(false);
  const [medicalMoment, setMedicalMoment] = useState<'start' | 'mid' | 'end'>('start');

  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [recovery, setRecovery] = useState(10);
  const [pleasure, setPleasure] = useState(0);
  const [sessionPse, setSessionPse] = useState(7);
  const [intentionToRepeat, setIntentionToRepeat] = useState(false);
  const [exerciseLogs, setExerciseLogs] = useState<Record<string, ExerciseLog>>({});

  // Dados Médicos do Treino
  const [paStart, setPaStart] = useState({ sys: '', dia: '' });
  const [paMid, setPaMid] = useState({ sys: '', dia: '' });
  const [paEnd, setPaEnd] = useState({ sys: '', dia: '' });
  const [glycemiaPre, setGlycemiaPre] = useState('');
  const [glycemiaPost, setGlycemiaPost] = useState('');

  const profileRef = useMemoFirebase(() => user ? doc(firestore, "users", user.uid) : null, [firestore, user])
  const { data: profile } = useDoc(profileRef)

  const isHypertensive = profile?.isHypertensive || false;
  const isDiabetic = profile?.isDiabetic || false;

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

  const validateMedical = (moment: 'start' | 'mid' | 'end') => {
    if (moment === 'start') {
      if (isHypertensive && (!paStart.sys || !paStart.dia)) return false;
      if (isDiabetic && !glycemiaPre) return false;
    }
    if (moment === 'mid') {
      if (isHypertensive && (!paMid.sys || !paMid.dia)) return false;
    }
    if (moment === 'end') {
      if (isHypertensive && (!paEnd.sys || !paEnd.dia)) return false;
      if (isDiabetic && !glycemiaPost) return false;
    }
    return true;
  };

  const handleStartWorkout = () => {
    if (!selectedProgramId) return toast({ variant: "destructive", title: "Selecione um programa" });
    if (!validateMedical('start')) {
      setMedicalMoment('start');
      setShowMedicalCheck(true);
      return;
    }
    setIsStarted(true);
    setStartTime(Date.now());
    setElapsedTime(0);
  };

  const handleMidCheck = () => {
    setMedicalMoment('mid');
    setShowMedicalCheck(true);
  };

  const handleOpenFinish = () => {
    if (!validateMedical('end')) {
      setMedicalMoment('end');
      setShowMedicalCheck(true);
      return;
    }
    setShowPleasureDialog(true);
  };

  const handleSubmit = async () => {
    if (!user || !firestore || !startTime) return;
    setLoading(true);
    const durationMin = Math.round(elapsedTime / 60);

    try {
      const sessionId = doc(collection(firestore, 'dummy')).id;
      const internalLoad = durationMin * sessionPse;
      
      // Cálculo de Gasto Calórico (Musculação)
      // Kcal = 38,8837 – 1,5848 × x1 + 0,003177 × x2 + 103,467 × x3
      // x1 = volume total (séries × repetições × número de exercícios)
      // x2 = soma de todas as cargas utilizadas em kg
      // x3 = duração da sessão em minutos
      
      const numExercises = Object.keys(exerciseLogs).length;
      let totalRepsVolume = 0;
      let totalLoadSum = 0;
      
      Object.values(exerciseLogs).forEach(log => {
        const reps = Number(log.reps.toString().split(/[^0-9]/)[0]) || 0;
        totalRepsVolume += (Number(log.sets) * reps);
        totalLoadSum += Number(log.weight);
      });

      const x1 = totalRepsVolume * numExercises;
      const x2 = totalLoadSum;
      const x3 = durationMin;
      
      // Nota técnica: O coeficiente 103.467 por minuto gera valores extremamente altos. 
      // Em fórmulas de literatura como de Reis et al., o fator de tempo costuma ser por hora (ex: 1.03 x min).
      // Seguiremos a instrução literal do usuário para fins de protótipo.
      const kcal = 38.8837 - (1.5848 * x1) + (0.003177 * x2) + (103.467 * x3);
      const finalKcal = Math.round(Math.max(0, kcal));

      const sessionData = {
        id: sessionId,
        userId: user.uid,
        trainingProgramId: selectedProgramId,
        date: new Date().toISOString(),
        recoveryPerception: recovery,
        pleasureScale: pleasure,
        pseSession: sessionPse,
        internalLoad: internalLoad,
        intentionToRepeat: intentionToRepeat ? 1 : 0,
        duration: durationMin,
        caloriesBurned: finalKcal,
        // Dados Medicos
        medical: {
          isHypertensive,
          isDiabetic,
          pa: { start: paStart, mid: paMid, end: paEnd },
          glycemia: { pre: glycemiaPre, post: glycemiaPost }
        },
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

      toast({ title: "Treino Finalizado!", description: `Registrado com sucesso. Gasto: ${finalKcal} kcal.` });
      setIsStarted(false);
      setStartTime(null);
      setShowPleasureDialog(false);
      setPaStart({ sys: '', dia: '' }); setPaMid({ sys: '', dia: '' }); setPaEnd({ sys: '', dia: '' });
      setGlycemiaPre(''); setGlycemiaPost('');
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
          <CardTitle className="text-3xl font-black text-primary uppercase">PRONTO PARA O PLAY?</CardTitle>
          <CardDescription>Escolha o programa e verifique seus indicadores de saúde.</CardDescription>
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

          {(isHypertensive || isDiabetic) && (
            <Alert className="bg-destructive/5 border-destructive/20 rounded-2xl">
              <ShieldAlert className="h-4 w-4 text-destructive" />
              <AlertTitle className="text-[10px] font-black uppercase text-destructive">Triagem Obrigatória</AlertTitle>
              <AlertDescription className="text-xs">Identificamos restrições que exigem monitoramento de PA/Glicemia antes de iniciar.</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <Label className="font-black uppercase text-[10px] text-primary tracking-widest">Estado de Recuperação (ESR)</Label>
              <span className="text-3xl font-black text-primary">{recovery}</span>
            </div>
            <Slider value={[recovery]} onValueChange={v => setRecovery(v[0])} min={0} max={10} step={1} className="py-2" />
            <div className="p-4 bg-primary text-primary-foreground rounded-2xl text-center shadow-lg">
               <p className="text-xs font-black uppercase tracking-widest mb-1 opacity-70">Sua Percepção</p>
               <p className="text-lg font-bold leading-tight">"{RECOVERY_MESSAGES[recovery]}"</p>
            </div>
          </div>
          
          <Button onClick={handleStartWorkout} className="w-full h-20 rounded-full text-xl font-black bg-primary gap-3 shadow-xl hover:scale-[1.02] transition-transform">
            <Play className="h-8 w-8 fill-current" /> COMEÇAR TREINO
          </Button>
        </div>

        <Dialog open={showMedicalCheck} onOpenChange={setShowMedicalCheck}>
          <DialogContent className="sm:max-w-md rounded-[3rem] p-10 border-none">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-primary uppercase text-center">CHECK-UP CLÍNICO</DialogTitle>
              <DialogDescription className="text-center font-bold uppercase text-[10px] tracking-widest">
                Momento: {medicalMoment === 'start' ? 'Início do Treino' : medicalMoment === 'mid' ? 'Meio do Treino' : 'Pós-Treino'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {isHypertensive && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <HeartPulse className="h-5 w-5" />
                    <span className="text-xs font-black uppercase tracking-widest">Pressão Arterial (mmHg)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[10px]">Sistólica (MAX)</Label>
                      <Input type="number" placeholder="120" value={medicalMoment === 'start' ? paStart.sys : medicalMoment === 'mid' ? paMid.sys : paEnd.sys} onChange={e => {
                        const v = e.target.value;
                        if(medicalMoment === 'start') setPaStart(p => ({...p, sys: v}));
                        if(medicalMoment === 'mid') setPaMid(p => ({...p, sys: v}));
                        if(medicalMoment === 'end') setPaEnd(p => ({...p, sys: v}));
                      }} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Diastólica (MIN)</Label>
                      <Input type="number" placeholder="80" value={medicalMoment === 'start' ? paStart.dia : medicalMoment === 'mid' ? paMid.dia : paEnd.dia} onChange={e => {
                        const v = e.target.value;
                        if(medicalMoment === 'start') setPaStart(p => ({...p, dia: v}));
                        if(medicalMoment === 'mid') setPaMid(p => ({...p, dia: v}));
                        if(medicalMoment === 'end') setPaEnd(p => ({...p, dia: v}));
                      }} />
                    </div>
                  </div>
                </div>
              )}
              {isDiabetic && (medicalMoment === 'start' || medicalMoment === 'end') && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center gap-2 text-destructive">
                    <Droplets className="h-5 w-5" />
                    <span className="text-xs font-black uppercase tracking-widest">Glicemia (mg/dL)</span>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Nível Glicêmico</Label>
                    <Input type="number" placeholder="90" value={medicalMoment === 'start' ? glycemiaPre : glycemiaPost} onChange={e => {
                      if(medicalMoment === 'start') setGlycemiaPre(e.target.value);
                      if(medicalMoment === 'end') setGlycemiaPost(e.target.value);
                    }} />
                  </div>
                </div>
              )}
              <Button onClick={() => {
                if(validateMedical(medicalMoment)) {
                  setShowMedicalCheck(false);
                  if(medicalMoment === 'start') handleStartWorkout();
                } else {
                  toast({ variant: "destructive", title: "Campos Obrigatórios", description: "Por favor, preencha seus indicadores vitais para prosseguir." });
                }
              }} className="w-full h-14 rounded-full font-black text-lg bg-primary">
                Confirmar Dados
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
        <div className="flex gap-2">
          {isHypertensive && (
            <Button size="icon" onClick={handleMidCheck} className="rounded-full bg-destructive text-white h-12 w-12 shadow-lg">
              <HeartPulse className="h-6 w-6" />
            </Button>
          )}
          <Button onClick={handleOpenFinish} className="rounded-full bg-accent text-accent-foreground font-black px-8 h-12 shadow-lg hover:bg-accent/90">
            <Square className="h-4 w-4 mr-2" /> FINALIZAR
          </Button>
        </div>
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
                    <span className="text-[10px] uppercase font-black text-accent-foreground bg-accent/20 px-2 py-0.5 rounded-full">{ex.oneRmPercentage}% 1RM</span>
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
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showMedicalCheck} onOpenChange={setShowMedicalCheck}>
          <DialogContent className="sm:max-w-md rounded-[3rem] p-10 border-none">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-primary uppercase text-center">CHECK-UP CLÍNICO</DialogTitle>
              <DialogDescription className="text-center font-bold uppercase text-[10px] tracking-widest">
                Momento: {medicalMoment === 'start' ? 'Início' : medicalMoment === 'mid' ? 'Controle Intra-Treino' : 'Pós-Treino'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {isHypertensive && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-primary">
                    <HeartPulse className="h-5 w-5" />
                    <span className="text-xs font-black uppercase tracking-widest">Pressão Arterial (mmHg)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[10px]">Sistólica (MAX)</Label>
                      <Input type="number" placeholder="120" value={medicalMoment === 'start' ? paStart.sys : medicalMoment === 'mid' ? paMid.sys : paEnd.sys} onChange={e => {
                        const v = e.target.value;
                        if(medicalMoment === 'start') setPaStart(p => ({...p, sys: v}));
                        if(medicalMoment === 'mid') setPaMid(p => ({...p, sys: v}));
                        if(medicalMoment === 'end') setPaEnd(p => ({...p, sys: v}));
                      }} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Diastólica (MIN)</Label>
                      <Input type="number" placeholder="80" value={medicalMoment === 'start' ? paStart.dia : medicalMoment === 'mid' ? paMid.dia : paEnd.dia} onChange={e => {
                        const v = e.target.value;
                        if(medicalMoment === 'start') setPaStart(p => ({...p, dia: v}));
                        if(medicalMoment === 'mid') setPaMid(p => ({...p, dia: v}));
                        if(medicalMoment === 'end') setPaEnd(p => ({...p, dia: v}));
                      }} />
                    </div>
                  </div>
                </div>
              )}
              {isDiabetic && (medicalMoment === 'start' || medicalMoment === 'end') && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center gap-2 text-destructive">
                    <Droplets className="h-5 w-5" />
                    <span className="text-xs font-black uppercase tracking-widest">Glicemia (mg/dL)</span>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Nível Glicêmico</Label>
                    <Input type="number" placeholder="90" value={medicalMoment === 'start' ? glycemiaPre : glycemiaPost} onChange={e => {
                      if(medicalMoment === 'start') setGlycemiaPre(e.target.value);
                      if(medicalMoment === 'end') setGlycemiaPost(e.target.value);
                    }} />
                  </div>
                </div>
              )}
              <Button onClick={() => {
                if(validateMedical(medicalMoment)) {
                  setShowMedicalCheck(false);
                  if(medicalMoment === 'end') setShowPleasureDialog(true);
                } else {
                  toast({ variant: "destructive", title: "Campos Obrigatórios", description: "Por favor, preencha os indicadores vitais deste momento." });
                }
              }} className="w-full h-14 rounded-full font-black text-lg bg-primary">
                Confirmar Dados
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      <Dialog open={showPleasureDialog} onOpenChange={setShowPleasureDialog}>
        <DialogContent className="sm:max-w-md rounded-[3rem] p-10 text-center border-none shadow-2xl">
          <DialogHeader><DialogTitle className="text-3xl font-black text-primary mb-2 uppercase tracking-tighter">TREINO CONCLUÍDO!</DialogTitle></DialogHeader>
          <div className="space-y-8 py-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Escala de Feeling (Sensação)</Label>
                <span className="text-4xl font-black text-primary">{pleasure > 0 ? `+${pleasure}` : pleasure}</span>
              </div>
              <Slider value={[pleasure]} onValueChange={v => setPleasure(v[0])} min={-5} max={5} step={1} className="py-2" />
              <div className="p-3 bg-primary text-primary-foreground rounded-2xl text-center">
                <p className="text-xl font-black uppercase italic">{FEELING_SCALE_MESSAGES[pleasure]}</p>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex justify-between items-center">
                <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Esforço Total (PSE da Sessão)</Label>
                <span className="text-4xl font-black text-primary">{sessionPse}</span>
              </div>
              <Slider value={[sessionPse]} onValueChange={v => setSessionPse(v[0])} min={0} max={10} step={1} className="py-2" />
              <div className={cn("p-3 rounded-2xl text-center text-white font-black uppercase", BORG_SCALE_COLORS[sessionPse])}>
                {BORG_SCALE_MESSAGES[sessionPse]}
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-[2rem] border border-primary/10">
              <Switch checked={intentionToRepeat} onCheckedChange={setIntentionToRepeat} />
              <Label className="flex items-center gap-2 font-black text-[10px] uppercase tracking-widest text-left leading-tight">
                 Pretendo repetir este treino
              </Label>
            </div>

            <Button onClick={handleSubmit} disabled={loading} className="w-full h-16 rounded-full text-xl font-black bg-primary shadow-2xl">
              {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 className="mr-3 h-6 w-6" />} FINALIZAR REGISTROS
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
