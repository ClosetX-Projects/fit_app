
'use client';

import { useState, useMemo } from 'react';
import { useApi } from '@/hooks/use-api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, History, Dumbbell, Sparkles, BrainCircuit, Info, Flame, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { generateTrainingInsights, type TrainingInsightsInput } from '@/ai/ai-training-insights';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BORG_SCALE_MESSAGES, BORG_SCALE_COLORS } from '@/lib/constants';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface StudentHistoryViewProps {
  studentId: string;
}

export function StudentHistoryView({ studentId }: StudentHistoryViewProps) {
  // Alinhamento com API v2: Buscar programas primeiro para obter o contexto do treino
  const { data: programs, loading: loadingPrograms } = useApi<any[]>(`/programas/aluno/${studentId}`);
  const activeProgramId = programs?.[0]?.id;

  const { data: rawExercises, loading: loadingExercises } = useApi<any[]>(
    activeProgramId ? `/treinos/?programa_id=${activeProgramId}` : null
  );
  const { data: rawSessions, loading: loadingSessions } = useApi<any[]>(`/checkins_recuperacao/`); 

  const [insightLoading, setInsightLoading] = useState<string | null>(null);
  const [currentInsight, setCurrentInsight] = useState<{ id: string, text: string } | null>(null);

  // Ordenar exercícios e sessões
  const exercises = useMemo(() => {
    if (!rawExercises) return [];
    return [...rawExercises].sort((a, b) => {
      const timeA = new Date(a.created_at || 0).getTime();
      const timeB = new Date(b.created_at || 0).getTime();
      return timeB - timeA;
    });
  }, [rawExercises]);

  const sessions = useMemo(() => {
    if (!rawSessions) return [];
    return [...rawSessions]
      .filter(s => s.aluno_id === studentId) // Filtro manual se necessário, mas o backend já isola
      .sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime());
  }, [rawSessions, studentId]);

  const handleGetAIInsight = async (ex: any) => {
    setInsightLoading(ex.id);
    setCurrentInsight(null);
    try {
      const input: TrainingInsightsInput = {
        exercise: ex.name,
        duration: 0,
        volume: {
          sets: Number(ex.sets),
          reps: Number(ex.reps.toString().split(/[^0-9]/)[0]) || 0,
          weight: Number(ex.weight)
        },
        rpe: Number(ex.pseExercise)
      };
      
      const result = await generateTrainingInsights(input);
      setCurrentInsight({ id: ex.id, text: result.insights });
    } catch (error) {
      console.error(error);
    } finally {
      setInsightLoading(null);
    }
  };

  if (loadingExercises || loadingSessions || loadingPrograms) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Resumo de Sessões - Usando Check-ins como histórico de atividade */}
      <section className="space-y-4">
        <h3 className="text-xs font-black uppercase text-primary tracking-widest flex items-center gap-2">
          <History className="h-4 w-4" /> Histórico de Atividade (Check-ins)
        </h3>
        <div className="grid gap-4">
          {sessions.slice(0, 10).map((session) => (
            <Card key={session.id} className="nubank-card py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{format(new Date(session.created_at || session.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-black">Check-in de Recuperação</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <span className="text-sm font-black">Status: {session.valor || 0}/10</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground uppercase font-bold">Nível de Recuperação</p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xs font-black uppercase text-primary tracking-widest flex items-center gap-2">
          <Dumbbell className="h-4 w-4" /> Prescrição Atual
        </h3>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold">Exercícios do Programa</CardTitle>
            <CardDescription aria-level={2}>Lista de movimentos prescritos para o aluno.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[120px]">Data Criada</TableHead>
                    <TableHead>Exercício</TableHead>
                    <TableHead className="text-center">Séries</TableHead>
                    <TableHead className="text-center">Reps/Tempo</TableHead>
                    <TableHead className="text-center">% 1RM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exercises?.map((ex) => (
                    <TableRow key={ex.id}>
                      <TableCell className="text-[10px] font-medium">
                        {ex.created_at ? format(new Date(ex.created_at), 'dd/MM/yy', { locale: ptBR }) : '--'}
                      </TableCell>
                      <TableCell className="font-bold flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary/40" />
                        <span className="text-xs">{ex.exercicios?.nome || 'Exercício'}</span>
                      </TableCell>
                      <TableCell className="text-center text-xs">{ex.series}</TableCell>
                      <TableCell className="text-center text-xs">{ex.reps_tempo}</TableCell>
                      <TableCell className="text-center font-semibold text-primary text-xs">{ex.pct_1rm}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>

      {currentInsight && (
        <Alert className="border-primary/50 bg-primary/5 animate-in fade-in slide-in-from-top-4">
          <Sparkles className="h-4 w-4 text-primary" />
          <AlertTitle className="font-bold">Insight da IA sobre o Exercício</AlertTitle>
          <AlertDescription className="mt-2 text-sm leading-relaxed whitespace-pre-wrap italic">
            "{currentInsight.text}"
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
