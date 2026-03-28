
'use client';

import { useState, useMemo } from 'react';
import { useFirebase, useUser, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, serverTimestamp, deleteDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Dumbbell, Save, Loader2, ArrowLeft, ChevronRight, BookOpen, Layers, TrendingUp, Timer, Activity, Heart, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EXERCISE_LIST, TRAINING_METHODS, PROGRESSION_TYPES } from "@/lib/constants";
import { Badge } from '@/components/ui/badge';
import { differenceInYears } from 'date-fns';

interface TrainingManagerProps {
  studentId: string;
}

export function TrainingManager({ studentId }: TrainingManagerProps) {
  const { firestore } = useFirebase();
  const { user: professor } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  const [newProgramName, setNewProgramName] = useState('');
  const [newProgramDesc, setNewProgramDesc] = useState('');
  const [newMethod, setNewMethod] = useState('Múltiplas Séries');
  const [newProgression, setNewProgression] = useState('Linear');
  const [newDuration, setNewDuration] = useState('4');

  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);

  // Estados para novo exercício
  const [exName, setExName] = useState('');
  const [exSets, setExSets] = useState('');
  const [exReps, setExReps] = useState('');
  const [exRm, setExRm] = useState('');

  // Estados Aeróbios
  const [aerobicType, setAerobicType] = useState<'continuo' | 'hiit'>('continuo');
  const [aerobicDuration, setAerobicDuration] = useState('30');
  const [aerobicSpeed, setAerobicSpeed] = useState('8.0');
  const [hiitIntervals, setHiitIntervals] = useState('10');
  const [hiitEffortSpeed, setHiitEffortSpeed] = useState('12.0');
  const [hiitEffortTime, setHiitEffortTime] = useState('60');
  const [hiitRestTime, setHiitEffortRestTime] = useState('60');
  const [hiitRestSpeed, setHiitRestSpeed] = useState('5.0');

  // Buscar Última Avaliação para referências de VO2 e FC
  const lastAssessmentRef = useMemoFirebase(() => 
    query(collection(firestore, 'users', studentId, 'physicalAssessments'), orderBy('date', 'desc'), limit(1))
  , [firestore, studentId]);
  const { data: lastAssessments } = useCollection(lastAssessmentRef);
  const lastAssessment = lastAssessments?.[0];

  const studentRef = useMemoFirebase(() => doc(firestore, 'users', studentId), [firestore, studentId]);
  const { data: student } = useDoc(studentRef);

  const vo2RefValue = Number(lastAssessment?.calculatedResults?.vo2Cooper || lastAssessment?.calculatedResults?.vo2Bruce || 0);
  const age = student?.birthDate ? differenceInYears(new Date(), new Date(student.birthDate)) : 30;
  const fcMax = 220 - age;

  const vo2Table = useMemo(() => {
    if (!vo2RefValue) return [];
    return [50, 60, 70, 80, 90, 100].map(perc => {
      const vo2Target = vo2RefValue * (perc / 100);
      // Fórmula simplificada para esteira plana: Velocidade (km/h) = ((VO2 - 3.5) / 0.2) * 0.06
      const speed = Math.max(0, ((vo2Target - 3.5) / 0.2) * 0.06).toFixed(1);
      const fc = Math.round(fcMax * (perc / 100));
      return { perc, speed, fc };
    });
  }, [vo2RefValue, fcMax]);

  const programsRef = useMemoFirebase(() => 
    collection(firestore, 'users', studentId, 'trainingPrograms')
  , [firestore, studentId]);
  
  const { data: programs, isLoading: isLoadingPrograms } = useCollection(programsRef);

  const selectedProgram = programs?.find(p => p.id === selectedProgramId);

  const exercisesRef = useMemoFirebase(() => 
    selectedProgramId ? collection(firestore, 'users', studentId, 'trainingPrograms', selectedProgramId, 'prescribedExercises') : null
  , [firestore, studentId, selectedProgramId]);

  const { data: exercises, isLoading: isLoadingExercises } = useCollection(exercisesRef);

  const templatesRef = useMemoFirebase(() => 
    professor ? collection(firestore, 'users', professor.uid, 'programTemplates') : null
  , [firestore, professor]);
  const { data: templates } = useCollection(templatesRef);

  const handleCreateProgram = async () => {
    if (!newProgramName || !firestore) return;
    setLoading(true);

    const programRef = doc(collection(firestore, 'users', studentId, 'trainingPrograms'));
    setDocumentNonBlocking(programRef, {
      id: programRef.id,
      userId: studentId,
      name: newProgramName,
      description: newProgramDesc,
      method: newMethod,
      progressionType: newProgression,
      durationWeeks: Number(newDuration),
      createdAt: serverTimestamp(),
    }, { merge: true });

    toast({ title: "Programa criado", description: "O novo programa de treinamento foi adicionado." });
    setNewProgramName('');
    setNewProgramDesc('');
    setLoading(false);
  };

  const handleImportTemplate = async (template: any) => {
    if (!firestore || !professor || !studentId) return;
    setIsImporting(true);

    try {
      const programRef = doc(collection(firestore, 'users', studentId, 'trainingPrograms'));
      setDocumentNonBlocking(programRef, {
        id: programRef.id,
        userId: studentId,
        name: template.name,
        description: template.description,
        method: template.method || 'Múltiplas Séries',
        progressionType: template.progressionType || 'Linear',
        durationWeeks: template.durationWeeks || 4,
        importedFrom: template.id,
        createdAt: serverTimestamp(),
      }, { merge: true });

      const templateExRef = collection(firestore, 'users', professor.uid, 'programTemplates', template.id, 'templateExercises');
      const exSnapshot = await getDocs(templateExRef);

      exSnapshot.forEach((exDoc) => {
        const exData = exDoc.data();
        const studentExRef = doc(collection(firestore, 'users', studentId, 'trainingPrograms', programRef.id, 'prescribedExercises'));
        setDocumentNonBlocking(studentExRef, { ...exData, id: studentExRef.id, createdAt: serverTimestamp() }, { merge: true });
      });

      toast({ title: "Template Importado!", description: `${template.name} foi atribuído com sucesso.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro na importação" });
    } finally {
      setIsImporting(false);
    }
  };

  const handleAddExercise = () => {
    if (!selectedProgramId || !exName || !firestore) return;
    setLoading(true);

    const exerciseRef = doc(collection(firestore, 'users', studentId, 'trainingPrograms', selectedProgramId, 'prescribedExercises'));
    setDocumentNonBlocking(exerciseRef, {
      id: exerciseRef.id,
      name: exName,
      sets: Number(exSets),
      reps: exReps,
      oneRmPercentage: Number(exRm),
      type: 'strength',
      createdAt: serverTimestamp(),
    }, { merge: true });

    setExName(''); setExSets(''); setExReps(''); setExRm('');
    setLoading(false);
  };

  const handleAddAerobic = (type: 'continuo' | 'hiit') => {
    if (!selectedProgramId || !firestore) return;
    setLoading(true);

    const exerciseRef = doc(collection(firestore, 'users', studentId, 'trainingPrograms', selectedProgramId, 'prescribedExercises'));
    
    const aerobicData = type === 'continuo' ? {
      name: 'Aeróbio Contínuo',
      type: 'aerobic_continuo',
      duration: Number(aerobicDuration),
      speed: Number(aerobicSpeed),
      structure: {
        warmup: "5 min a 5.0 km/h",
        main: `${aerobicDuration} min a ${aerobicSpeed} km/h`,
        cooldown: "5 min a 4.0 km/h"
      }
    } : {
      name: 'HIIT Aeróbio',
      type: 'aerobic_hiit',
      intervals: Number(hiitIntervals),
      effortSpeed: Number(hiitEffortSpeed),
      effortTime: Number(hiitEffortTime),
      restTime: Number(hiitRestTime),
      restSpeed: Number(hiitRestSpeed),
      structure: {
        warmup: "5 min a 5.0 km/h",
        main: `${hiitIntervals} tiros de ${hiitEffortTime}s (${hiitEffortSpeed} km/h) por ${hiitRestTime}s (${hiitRestSpeed} km/h)`,
        cooldown: "5 min a 4.0 km/h"
      }
    };

    setDocumentNonBlocking(exerciseRef, {
      ...aerobicData,
      id: exerciseRef.id,
      createdAt: serverTimestamp(),
    }, { merge: true });

    setLoading(false);
    toast({ title: "Treino Aeróbio Prescrito" });
  };

  const handleDeleteExercise = (exerciseId: string) => {
    if (!selectedProgramId || !firestore) return;
    const exerciseRef = doc(firestore, 'users', studentId, 'trainingPrograms', selectedProgramId, 'prescribedExercises', exerciseId);
    deleteDoc(exerciseRef);
  };

  const handleDeleteProgram = (programId: string) => {
    if (!firestore) return;
    const programRef = doc(firestore, 'users', studentId, 'trainingPrograms', programId);
    deleteDoc(programRef);
    if (selectedProgramId === programId) setSelectedProgramId(null);
  };

  if (selectedProgramId && selectedProgram) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSelectedProgramId(null)} className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h3 className="text-xl font-black text-primary uppercase tracking-tighter">{selectedProgram.name}</h3>
              <p className="text-[10px] font-black uppercase text-muted-foreground">{selectedProgram.method} | {selectedProgram.durationWeeks} Semanas</p>
            </div>
          </div>
          {vo2RefValue > 0 && (
            <Badge variant="outline" className="h-8 border-primary/20 text-primary font-black uppercase gap-2">
              <Zap className="h-3 w-3" /> VO2 Ref: {vo2RefValue}
            </Badge>
          )}
        </div>

        {/* Calculadora de Referência VO2 */}
        {vo2RefValue > 0 && (
          <Card className="rounded-[2rem] border-primary/10 bg-primary/5 shadow-sm overflow-hidden">
            <CardHeader className="py-4 border-b border-primary/10">
              <CardTitle className="text-xs font-black uppercase flex items-center gap-2 text-primary">
                <Activity className="h-4 w-4" /> Alvos Baseados no VO2máx
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {vo2Table.map(row => (
                  <div key={row.perc} className="bg-background/60 p-3 rounded-2xl border text-center">
                    <p className="text-[9px] font-black text-primary mb-1">{row.perc}%</p>
                    <p className="text-sm font-black">{row.speed}<span className="text-[8px] ml-0.5">km/h</span></p>
                    <p className="text-[9px] font-bold text-muted-foreground mt-1">{row.fc} BPM</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Prescrição de Força */}
          <Card className="border-primary/20 rounded-3xl shadow-lg">
            <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2"><Dumbbell className="h-4 w-4" /> Musculação</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <Select value={exName} onValueChange={setExName}>
                  <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Escolha o exercício..." /></SelectTrigger>
                  <SelectContent>{EXERCISE_LIST.map(ex => <SelectItem key={ex} value={ex}>{ex}</SelectItem>)}</SelectContent>
                </Select>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1"><Label className="text-[10px] uppercase font-bold">Séries</Label><Input type="number" value={exSets} onChange={e => setExSets(e.target.value)} /></div>
                  <div className="space-y-1"><Label className="text-[10px] uppercase font-bold">Reps</Label><Input value={exReps} onChange={e => setExReps(e.target.value)} /></div>
                  <div className="space-y-1"><Label className="text-[10px] uppercase font-bold">% 1RM</Label><Input type="number" value={exRm} onChange={e => setExRm(e.target.value)} /></div>
                </div>
                <Button onClick={handleAddExercise} disabled={loading || !exName} className="w-full h-12 rounded-xl font-bold bg-primary"><Plus className="h-4 w-4 mr-2" /> Adicionar</Button>
              </div>
            </CardContent>
          </Card>

          {/* Prescrição Aeróbia */}
          <Card className="border-accent/20 rounded-3xl shadow-lg bg-accent/5">
            <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-accent-foreground"><Timer className="h-4 w-4" /> Aeróbio Advanced</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-2 bg-muted p-1 rounded-xl">
                  <button onClick={() => setAerobicType('continuo')} className={cn("py-2 rounded-lg text-[10px] font-black uppercase transition-all", aerobicType === 'continuo' ? 'bg-background shadow text-primary' : 'opacity-50')}>Contínuo</button>
                  <button onClick={() => setAerobicType('hiit')} className={cn("py-2 rounded-lg text-[10px] font-black uppercase transition-all", aerobicType === 'hiit' ? 'bg-background shadow text-primary' : 'opacity-50')}>HIIT</button>
                </div>

                {aerobicType === 'continuo' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1"><Label className="text-[10px] font-black uppercase">Duração (min)</Label><Input type="number" value={aerobicDuration} onChange={e => setAerobicDuration(e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-[10px] font-black uppercase">Velocidade (km/h)</Label><Input type="number" step="0.1" value={aerobicSpeed} onChange={e => setAerobicSpeed(e.target.value)} /></div>
                    </div>
                    <div className="p-3 bg-background/50 rounded-xl border border-accent/20">
                      <p className="text-[10px] font-black uppercase text-accent-foreground mb-2">Estrutura Sugerida</p>
                      <ul className="text-[10px] space-y-1 font-bold">
                        <li className="flex justify-between"><span>Aquecimento:</span> <span>5 min @ 5.0</span></li>
                        <li className="flex justify-between text-primary"><span>Principal:</span> <span>{aerobicDuration} min @ {aerobicSpeed}</span></li>
                        <li className="flex justify-between"><span>Resfriamento:</span> <span>5 min @ 4.0</span></li>
                      </ul>
                    </div>
                    <Button onClick={() => handleAddAerobic('continuo')} className="w-full bg-accent text-accent-foreground font-black">Prescrever Contínuo</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1"><Label className="text-[10px] font-black uppercase">Nº de Tiros</Label><Input type="number" value={hiitIntervals} onChange={e => setHiitIntervals(e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-[10px] font-black uppercase">Vel. Esforço</Label><Input type="number" step="0.1" value={hiitEffortSpeed} onChange={e => setHiitEffortSpeed(e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1"><Label className="text-[10px] font-black uppercase">Tempo Esforço (s)</Label><Input type="number" value={hiitEffortTime} onChange={e => setHiitEffortTime(e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-[10px] font-black uppercase">Pausa (s)</Label><Input type="number" value={hiitRestTime} onChange={e => setHiitEffortRestTime(e.target.value)} /></div>
                    </div>
                    <div className="space-y-1"><Label className="text-[10px] font-black uppercase">Vel. Recuperação</Label><Input type="number" step="0.1" value={hiitRestSpeed} onChange={e => setHiitRestSpeed(e.target.value)} /></div>
                    <Button onClick={() => handleAddAerobic('hiit')} className="w-full bg-accent text-accent-foreground font-black">Prescrever HIIT</Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <h4 className="font-black text-xs uppercase text-primary tracking-widest flex items-center gap-2"><Layers className="h-4 w-4" /> Composição do Programa</h4>
          <div className="grid gap-3">
            {exercises?.map((ex) => (
              <div key={ex.id} className="nubank-card group flex items-center justify-between py-4 px-6">
                <div className="flex gap-6 items-center">
                  <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center font-black", ex.type?.startsWith('aerobic') ? 'bg-accent/20 text-accent-foreground' : 'bg-primary/10 text-primary')}>
                    {ex.type === 'aerobic_hiit' ? <Timer className="h-6 w-6" /> : ex.type === 'aerobic_continuo' ? <Activity className="h-6 w-6" /> : `${ex.sets}x`}
                  </div>
                  <div>
                    <p className="font-bold text-lg">{ex.name}</p>
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-tight">
                      {ex.type === 'aerobic_continuo' ? `${ex.duration} min a ${ex.speed} km/h` : 
                       ex.type === 'aerobic_hiit' ? `${ex.intervals} tiros | Esforço: ${ex.effortSpeed} km/h` :
                       `${ex.reps} reps | ${ex.oneRmPercentage}% do 1RM`}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="text-destructive rounded-full" onClick={() => handleDeleteExercise(ex.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid gap-6 md:grid-cols-2">
         <Card className="rounded-[2rem] border-primary/20 shadow-xl overflow-hidden">
           <CardHeader className="bg-primary/5">
             <CardTitle className="text-lg font-black uppercase text-primary">Novo Programa Manual</CardTitle>
             <CardDescription>Crie uma estrutura do zero para este aluno.</CardDescription>
           </CardHeader>
           <CardContent className="p-6 space-y-4">
             <div className="grid gap-2"><Label className="text-[10px] font-black uppercase text-primary">Nome do Treino</Label><Input placeholder="Ex: Hipertrofia + Cardio" value={newProgramName} onChange={(e) => setNewProgramName(e.target.value)} className="rounded-xl h-12" /></div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-primary flex items-center gap-1"><Layers className="h-3 w-3" /> Método</Label><Select value={newMethod} onValueChange={setNewMethod}><SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{TRAINING_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-primary flex items-center gap-1"><Timer className="h-3 w-3" /> Semanas</Label><Input type="number" value={newDuration} onChange={e => setNewDuration(e.target.value)} className="h-10 rounded-xl" /></div>
             </div>
             <Button onClick={handleCreateProgram} disabled={loading || !newProgramName} className="w-full h-12 rounded-full font-bold bg-primary shadow-lg">Criar Programa</Button>
           </CardContent>
         </Card>

         <Card className="rounded-[2rem] border-dashed border-2 border-primary/20 bg-primary/5 flex flex-col items-center justify-center p-8 text-center">
            <BookOpen className="h-12 w-12 mb-4 text-primary opacity-30" />
            <h3 className="text-xl font-black text-primary uppercase">Importar da Biblioteca</h3>
            <p className="text-xs text-muted-foreground mt-2 mb-6 max-w-[250px]">Atribua um programa técnico já salvo na sua biblioteca de modelos.</p>
            <Dialog>
               <DialogTrigger asChild><Button className="rounded-full px-8 h-12 font-black shadow-lg">Acessar Biblioteca</Button></DialogTrigger>
               <DialogContent className="sm:max-w-xl rounded-[2.5rem] border-primary/20">
                  <DialogHeader><DialogTitle className="text-2xl font-black text-primary uppercase tracking-tighter">Escolha um Template</DialogTitle></DialogHeader>
                  <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
                     {templates?.map((t) => (
                        <div key={t.id} className="nubank-card flex items-center justify-between py-4 px-6 hover:bg-primary/5 cursor-pointer" onClick={() => handleImportTemplate(t)}>
                           <div className="flex-1"><p className="font-black text-lg text-primary">{t.name}</p><p className="text-[9px] font-black uppercase text-muted-foreground">{t.method} | {t.durationWeeks} Sem.</p></div>
                           <Button size="icon" variant="ghost" disabled={isImporting} className="rounded-full">{isImporting ? <Loader2 className="animate-spin" /> : <Plus className="h-5 w-5" />}</Button>
                        </div>
                     ))}
                  </div>
               </DialogContent>
            </Dialog>
         </Card>
      </div>

      <div className="space-y-4">
        <h3 className="font-black text-xs uppercase tracking-widest text-primary flex items-center gap-2"><Layers className="h-4 w-4" /> Programas Ativos</h3>
        <div className="grid gap-4">
           {programs?.map((program) => (
             <Card key={program.id} className="nubank-card group cursor-pointer" onClick={() => setSelectedProgramId(program.id)}>
               <div className="flex items-center justify-between">
                 <div className="flex-1">
                   <div className="flex items-center gap-2 mb-1"><p className="text-lg font-black text-foreground group-hover:text-primary transition-colors">{program.name}</p>{program.importedFrom && <Badge className="bg-accent/20 text-accent-foreground border-none text-[8px] font-black uppercase">Template</Badge>}</div>
                   <div className="flex gap-3"><p className="text-[10px] font-black uppercase text-muted-foreground">{program.method} | {program.durationWeeks} Semanas</p></div>
                 </div>
                 <div className="flex items-center gap-2"><Button variant="ghost" size="icon" className="text-destructive opacity-0 group-hover:opacity-100 rounded-full" onClick={(e) => { e.stopPropagation(); handleDeleteProgram(program.id); }}><Trash2 className="h-4 w-4" /></Button><ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-all" /></div>
               </div>
             </Card>
           ))}
        </div>
      </div>
    </div>
  );
}
