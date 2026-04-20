'use client';

import { useState, useMemo } from 'react';
import { useUser } from '@/contexts/auth-provider';
import { useApi } from '@/hooks/use-api';
import { fetchApi } from '@/lib/api-client';
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
import { cn } from "@/lib/utils";

interface TrainingManagerProps {
  studentId: string;
}

export function TrainingManager({ studentId }: TrainingManagerProps) {
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

  const { data: lastAssessments } = useApi<any[]>(`/avaliacoes_antropo/?aluno_id=${studentId}`);
  const lastAssessment = lastAssessments?.[lastAssessments.length - 1];

  const { data: student } = useApi<any>(`/users/alunos/${studentId}`);

  const vo2RefValue = Number(lastAssessment?.calculatedResults?.vo2Cooper || lastAssessment?.calculatedResults?.vo2Bruce || 0);
  const age = student?.data_nascimento ? differenceInYears(new Date(), new Date(student.data_nascimento)) : 30;
  const fcMax = 220 - age;

  const vo2Table = useMemo(() => {
    if (!vo2RefValue) return [];
    return [50, 60, 70, 80, 90, 100].map(perc => {
      const vo2Target = vo2RefValue * (perc / 100);
      const speed = Math.max(0, ((vo2Target - 3.5) / 0.2) * 0.06).toFixed(1);
      const fc = Math.round(fcMax * (perc / 100));
      return { perc, speed, fc };
    });
  }, [vo2RefValue, fcMax]);

  const { data: programs, loading: isLoadingPrograms, mutate: mutatePrograms } = useApi<any[]>(`/programas/?aluno_id=${studentId}`);
  const selectedProgram = programs?.find((p: any) => p.id === selectedProgramId);
  const { data: exercises, loading: isLoadingExercises, mutate: mutateExercises } = useApi<any[]>(selectedProgramId ? `/treinos/?programa_id=${selectedProgramId}` : null);

  const { data: templates } = useApi<any[]>('/programas/');

  const mapMethod = (m: string) => {
    const map: Record<string, string> = {
      'Múltiplas Séries': 'multiplas_series', 'Bi-Set': 'bi_set', 'Tri-Set': 'tri_set',
      'Pirâmide': 'piramide', 'Drop-Set': 'drop_set', 'Cluster Set': 'cluster_set',
      'GVT': 'gvt', 'Rest-Pause': 'rest_pause'
    };
    return map[m] || 'multiplas_series';
  };
  const mapProgression = (p: string) => p === 'Ondulatória' ? 'ondulatoria' : 'linear';

  const handleCreateProgram = async () => {
    if (!newProgramName) return;
    setLoading(true);
    try {
      const progRes = await fetchApi(`/programas/`, {
        method: 'POST',
        data: {
          nome: newProgramName,
          descricao: newProgramDesc,
          metodo: mapMethod(newMethod),
          progressao: mapProgression(newProgression),
          semanas: Number(newDuration),
        }
      });
      // Vincular programa ao aluno
      if (progRes?.id) {
        await fetchApi('/programa_alunos/', {
          method: 'POST',
          data: { programa_id: progRes.id, aluno_id: studentId }
        });
      }
      toast({ title: "Programa criado", description: "O novo programa de treinamento foi adicionado." });
      mutatePrograms();
      setNewProgramName('');
      setNewProgramDesc('');
    } catch { toast({ variant: "destructive", title: "Erro" }) }
    setLoading(false);
  };

  const handleImportTemplate = async (template: any) => {
    if (!professor || !studentId) return;
    setIsImporting(true);
    try {
      await fetchApi(`/programa_alunos/`, {
        method: 'POST',
        data: { programa_id: template.id, aluno_id: studentId }
      });
      toast({ title: "Template Importado!", description: `${template.name} foi atribuído com sucesso.` });
      mutatePrograms();
    } catch (error) {
      toast({ variant: "destructive", title: "Erro na importação" });
    } finally {
      setIsImporting(false);
    }
  };

  const handleAddExercise = async () => {
    if (!selectedProgramId || !exName) return;
    setLoading(true);
    try {
      // Buscar o exercicio_id pelo nome no catálogo
      const searchResults = await fetchApi(`/exercicios/busca?nome=${encodeURIComponent(exName)}`);
      let exercicioId: string;
      if (searchResults && searchResults.length > 0) {
        exercicioId = searchResults[0].id;
      } else {
        // Criamos o exercício no catálogo se não existir
        const newEx = await fetchApi('/exercicios/', { method: 'POST', data: { nome: exName } });
        exercicioId = newEx.id;
      }
      const currentExercises = exercises || [];
      await fetchApi(`/treinos/`, {
        method: 'POST',
        data: {
          programa_id: selectedProgramId,
          ordem: currentExercises.length + 1,
          exercicio_id: exercicioId,
          series: Number(exSets) || 3,
          reps_tempo: exReps || '3x10',
          pct_1rm: Number(exRm) || 0,
        }
      });
      mutateExercises();
      setExName(''); setExSets(''); setExReps(''); setExRm('');
    } catch { toast({ variant: 'destructive', title: 'Erro' })}
    setLoading(false);
  };

  const handleAddAerobic = async (type: 'continuo' | 'hiit') => {
    if (!selectedProgramId) return;
    setLoading(true);
    try {
      const payload = type === 'continuo' ? {
        programa_id: selectedProgramId,
        tipo: 'continuo',
        continuo_duracao_min: Number(aerobicDuration),
        continuo_velocidade_kmh: Number(aerobicSpeed),
      } : {
        programa_id: selectedProgramId,
        tipo: 'hiit',
        hiit_num_tiros: Number(hiitIntervals),
        hiit_vel_esforco: Number(hiitEffortSpeed),
        hiit_tempo_esforco_seg: Number(hiitEffortTime),
        hiit_pausa_seg: Number(hiitRestTime),
        hiit_vel_recuperacao: Number(hiitRestSpeed)
      };

      await fetchApi(`/prescricao_aerobio/`, {
        method: 'POST',
        data: payload
      });
      toast({ title: "Treino Aeróbio Prescrito" });
      mutateExercises();
    } catch { toast({ variant: 'destructive', title: 'Erro' }) }
    setLoading(false);
  };

  const handleDeleteExercise = async (exerciseId: string) => {
    if (!selectedProgramId) return;
    try {
      await fetchApi(`/treinos/${exerciseId}`, { method: 'DELETE' });
      mutateExercises();
    } catch {}
  };

  const handleDeleteProgram = async (programId: string) => {
    try {
      await fetchApi(`/programas/${programId}`, { method: 'DELETE' });
      mutatePrograms();
      if (selectedProgramId === programId) setSelectedProgramId(null);
    } catch {}
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
              <h3 className="text-xl font-black text-primary uppercase tracking-tighter">{selectedProgram.nome}</h3>
              <p className="text-[10px] font-black uppercase text-muted-foreground">{selectedProgram.metodo} | {selectedProgram.semanas} Semanas</p>
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
                  <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center font-black", 'bg-primary/10 text-primary')}>
                    {`${ex.series}x`}
                  </div>
                  <div>
                    <p className="font-bold text-lg">{ex.exercicios?.nome || ex.nome || 'Exercício'}</p>
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-tight">
                      {`${ex.series}x | ${ex.reps_tempo}${ex.pct_1rm ? ` | ${ex.pct_1rm}% 1RM` : ''}`}
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
                           <div className="flex-1"><p className="font-black text-lg text-primary">{t.nome}</p><p className="text-[9px] font-black uppercase text-muted-foreground">{t.metodo} | {t.semanas} Sem.</p></div>
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
                   <div className="flex items-center gap-2 mb-1"><p className="text-lg font-black text-foreground group-hover:text-primary transition-colors">{program.nome}</p></div>
                   <div className="flex gap-3"><p className="text-[10px] font-black uppercase text-muted-foreground">{program.metodo} | {program.semanas} Semanas</p></div>
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
