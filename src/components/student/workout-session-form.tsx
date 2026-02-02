
'use client';

import { useState, useEffect } from 'react';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { ClipboardPen, Loader2, Save, Smile, Gauge, Timer, Repeat, History as HistoryIcon, Dumbbell, CheckCircle2 } from 'lucide-react';

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

  // Estados do formulário de sessão
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [preTraining, setPreTraining] = useState('');
  const [pleasure, setPleasure] = useState(7);
  const [pse, setPse] = useState(7);
  const [duration, setDuration] = useState('');
  const [recovery, setRecovery] = useState('');
  const [repeat, setRepeat] = useState(true);

  // Estado para os logs de exercícios individuais
  const [exerciseLogs, setExerciseLogs] = useState<Record<string, ExerciseLog>>({});

  // Buscar programas do aluno
  const programsRef = useMemoFirebase(() => 
    user ? collection(firestore, 'users', user.uid, 'trainingPrograms') : null
  , [firestore, user]);
  const { data: programs } = useCollection(programsRef);

  // Buscar exercícios do programa selecionado
  const prescribedExercisesRef = useMemoFirebase(() => 
    (user && selectedProgramId) ? collection(firestore, 'users', user.uid, 'trainingPrograms', selectedProgramId, 'prescribedExercises') : null
  , [firestore, user, selectedProgramId]);
  const { data: prescribedExercises, isLoading: isLoadingExercises } = useCollection(prescribedExercisesRef);

  // Inicializar logs quando os exercícios forem carregados
  useEffect(() => {
    if (prescribedExercises) {
      const initialLogs: Record<string, ExerciseLog> = {};
      prescribedExercises.forEach(ex => {
        initialLogs[ex.id] = {
          sets: ex.sets || 0,
          reps: ex.reps || '',
          weight: ex.weight || 0,
          pse: 7
        };
      });
      setExerciseLogs(initialLogs);
    }
  }, [prescribedExercises]);

  const updateExerciseLog = (id: string, field: keyof ExerciseLog, value: any) => {
    setExerciseLogs(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedProgramId || !firestore) {
      toast({ variant: "destructive", title: "Atenção", description: "Selecione um programa de treino." });
      return;
    }
    setLoading(true);

    try {
      const sessionRef = doc(collection(firestore, 'users', user.uid, 'trainingPrograms', selectedProgramId, 'workoutSessions'));
      const sessionId = sessionRef.id;

      // 1. Salvar os dados da sessão (Carga Interna Geral)
      setDocumentNonBlocking(sessionRef, {
        id: sessionId,
        userId: user.uid,
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

      // 2. Salvar o desempenho de cada exercício na subcoleção da sessão
      Object.entries(exerciseLogs).forEach(([exId, log]) => {
        const prescribedEx = prescribedExercises?.find(p => p.id === exId);
        const exercisePerformanceRef = doc(collection(firestore, 'users', user.uid, 'trainingPrograms', selectedProgramId, 'workoutSessions', sessionId, 'exercises'));
        
        setDocumentNonBlocking(exercisePerformanceRef, {
          id: exercisePerformanceRef.id,
          workoutSessionId: sessionId,
          name: prescribedEx?.name || 'Exercício',
          prescribedExerciseId: exId,
          sets: Number(log.sets),
          reps: log.reps,
          weight: Number(log.weight),
          pseExercise: log.pse,
          createdAt: serverTimestamp(),
        }, { merge: true });
      });

      toast({
        title: "Treino Finalizado!",
        description: "Todos os dados de desempenho foram registrados com sucesso.",
      });
      
      // Resetar campos
      setPreTraining('');
      setDuration('');
      setRecovery('');
      setSelectedProgramId('');
      setExerciseLogs({});
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Ocorreu um erro ao salvar seu treino." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-12">
      <Card className="border-primary/20 shadow-lg">
        <CardHeader className="bg-primary/5">
          <CardTitle className="flex items-center gap-2">
            <ClipboardPen className="h-6 w-6 text-primary" />
            Iniciar Sessão de Treino
          </CardTitle>
          <CardDescription>Selecione seu programa e registre como foi sua performance.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-2">
              <Label>Seu Programa de Treino</Label>
              <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
                <SelectTrigger className="h-12 border-primary/30">
                  <SelectValue placeholder="Qual treino você vai fazer hoje?" />
                </SelectTrigger>
                <SelectContent>
                  {programs?.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                  {!programs?.length && <SelectItem value="none" disabled>Nenhum programa disponível</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Timer className="h-4 w-4" /> Duração Real (minutos)
              </Label>
              <Input type="number" placeholder="Ex: 60" value={duration} onChange={(e) => setDuration(e.target.value)} className="h-12" />
            </div>
          </div>

          <div className="space-y-2 mb-6">
            <Label>Como você se sente antes de começar? (Avaliação Pré-Treino)</Label>
            <Textarea 
              placeholder="Dores, cansaço excessivo, muita disposição..." 
              value={preTraining}
              onChange={(e) => setPreTraining(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <Separator className="my-8" />

          {/* Lista de Exercícios Prescritos */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2 text-primary">
              <Dumbbell className="h-6 w-6" /> Exercícios da Sessão
            </h3>
            
            {isLoadingExercises ? (
              <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : prescribedExercises && prescribedExercises.length > 0 ? (
              <div className="grid gap-4">
                {prescribedExercises.map((ex) => (
                  <Card key={ex.id} className="border-l-4 border-l-primary shadow-sm">
                    <CardContent className="p-4 md:p-6">
                      <div className="flex flex-col md:flex-row justify-between gap-6">
                        <div className="flex-1 space-y-1">
                          <p className="text-lg font-bold">{ex.name}</p>
                          <div className="flex gap-3 text-sm text-muted-foreground bg-muted/50 p-2 rounded w-fit">
                            <span className="font-semibold">Prescrito:</span>
                            <span>{ex.sets} séries</span>
                            <span>•</span>
                            <span>{ex.reps} reps</span>
                            <span>•</span>
                            <span>{ex.weight}kg</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                          <div className="space-y-1">
                            <Label className="text-xs">Séries Feitas</Label>
                            <Input 
                              type="number" 
                              value={exerciseLogs[ex.id]?.sets || ''} 
                              onChange={(e) => updateExerciseLog(ex.id, 'sets', e.target.value)}
                              className="h-9"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Reps Feitas</Label>
                            <Input 
                              value={exerciseLogs[ex.id]?.reps || ''} 
                              onChange={(e) => updateExerciseLog(ex.id, 'reps', e.target.value)}
                              className="h-9"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Carga (kg)</Label>
                            <Input 
                              type="number" 
                              value={exerciseLogs[ex.id]?.weight || ''} 
                              onChange={(e) => updateExerciseLog(ex.id, 'weight', e.target.value)}
                              className="h-9"
                            />
                          </div>
                          <div className="space-y-2">
                             <div className="flex justify-between">
                               <Label className="text-[10px] uppercase">Esforço (PSE)</Label>
                               <span className="text-[10px] font-bold text-primary">{exerciseLogs[ex.id]?.pse || 7}</span>
                             </div>
                             <Slider 
                               value={[exerciseLogs[ex.id]?.pse || 7]} 
                               onValueChange={(v) => updateExerciseLog(ex.id, 'pse', v[0])} 
                               min={1} max={10} step={1} 
                             />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : selectedProgramId ? (
              <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed">
                <p className="text-muted-foreground">Este programa ainda não possui exercícios prescritos pelo professor.</p>
              </div>
            ) : (
              <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed">
                <p className="text-muted-foreground">Selecione um programa para ver os exercícios.</p>
              </div>
            )}
          </div>

          <Separator className="my-10" />

          {/* Carga Interna Geral da Sessão */}
          <div className="space-y-8 bg-muted/20 p-6 rounded-xl border border-primary/10">
            <h3 className="text-lg font-bold text-center">Como foi o treino no geral?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="flex items-center gap-2">
                    <Smile className="h-5 w-5 text-primary" /> Escala de Prazer (Feeling)
                  </Label>
                  <span className="font-bold text-xl text-primary">{pleasure}</span>
                </div>
                <Slider value={[pleasure]} onValueChange={(v) => setPleasure(v[0])} min={1} max={10} step={1} className="py-4" />
                <div className="flex justify-between text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                  <span>Ruim</span>
                  <span>Excelente</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="flex items-center gap-2">
                    <Gauge className="h-5 w-5 text-accent" /> PSE Geral da Sessão
                  </Label>
                  <span className="font-bold text-xl text-accent">{pse}</span>
                </div>
                <Slider value={[pse]} onValueChange={(v) => setPse(v[0])} min={1} max={10} step={1} className="py-4" />
                <div className="flex justify-between text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                  <span>Muito Leve</span>
                  <span>Esforço Máximo</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <Label className="flex items-center gap-2">
                <HistoryIcon className="h-4 w-4 text-primary" /> Como está sua recuperação hoje?
              </Label>
              <Input 
                placeholder="Ex: Recuperado do último treino / Ainda com dores musculares" 
                value={recovery} 
                onChange={(e) => setRecovery(e.target.value)} 
                className="h-12"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-background rounded-lg border">
              <div className="flex items-center gap-2">
                <Repeat className="h-5 w-5 text-primary" />
                <Label htmlFor="repeat" className="font-medium cursor-pointer">Pretendo repetir este treino na próxima</Label>
              </div>
              <Switch id="repeat" checked={repeat} onCheckedChange={setRepeat} />
            </div>

            <Button 
              onClick={handleSubmit} 
              className="w-full h-14 text-lg font-bold shadow-xl flex items-center gap-3 transition-all hover:scale-[1.01]" 
              disabled={loading || !selectedProgramId}
            >
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <CheckCircle2 className="h-6 w-6" />}
              FINALIZAR E SALVAR TREINO
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
