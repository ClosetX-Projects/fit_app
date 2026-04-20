
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
  const { data: rawExercises, loading: loadingExercises } = useApi<any[]>(`/exercicios/aluno/${studentId}`);
  const { data: rawSessions, loading: loadingSessions } = useApi<any[]>(`/treinos/aluno/${studentId}`);
  const [insightLoading, setInsightLoading] = useState<string | null>(null);
  const [currentInsight, setCurrentInsight] = useState<{ id: string, text: string } | null>(null);

  // Ordenar exercícios e sessões
  const exercises = useMemo(() => {
    if (!rawExercises) return null;
    return [...rawExercises].sort((a, b) => {
      const timeA = a.createdAt?.toDate?.()?.getTime() || 0;
      const timeB = b.createdAt?.toDate?.()?.getTime() || 0;
      return timeB - timeA;
    });
  }, [rawExercises]);

  const sessions = useMemo(() => {
    if (!rawSessions) return [];
    return [...rawSessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [rawSessions]);

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

  if (loadingExercises || loadingSessions) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Resumo de Sessões com Gasto Calórico */}
      <section className="space-y-4">
        <h3 className="text-xs font-black uppercase text-primary tracking-widest flex items-center gap-2">
          <History className="h-4 w-4" /> Histórico de Sessões Completas
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
                    <p className="text-sm font-bold">{format(new Date(session.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-black">{session.duration} minutos de treino</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Flame className="h-3 w-3 text-orange-500" />
                      <span className="text-sm font-black">{session.caloriesBurned || 0} kcal</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground uppercase font-bold">Gasto Estimado</p>
                  </div>
                  <Badge variant="outline" className="border-primary/20 text-primary font-black uppercase text-[9px]">
                    Carga: {session.internalLoad || (session.duration * (session.pseSession || 7))}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-xs font-black uppercase text-primary tracking-widest flex items-center gap-2">
          <Dumbbell className="h-4 w-4" /> Performance por Exercício
        </h3>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold">Registro de Execuções</CardTitle>
            <CardDescription>Analise a evolução de cargas e percepção de esforço por movimento.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="w-[120px]">Data</TableHead>
                    <TableHead>Exercício</TableHead>
                    <TableHead className="text-center">Séries</TableHead>
                    <TableHead className="text-center">Reps</TableHead>
                    <TableHead className="text-center">Carga</TableHead>
                    <TableHead className="text-center">PSE</TableHead>
                    <TableHead className="text-right">IA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exercises?.map((ex) => (
                    <TableRow key={ex.id}>
                      <TableCell className="text-[10px] font-medium">
                        {ex.createdAt ? format(ex.createdAt.toDate(), 'dd/MM/yy', { locale: ptBR }) : '--'}
                      </TableCell>
                      <TableCell className="font-bold flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary/40" />
                        <span className="text-xs">{ex.name}</span>
                      </TableCell>
                      <TableCell className="text-center text-xs">{ex.sets}</TableCell>
                      <TableCell className="text-center text-xs">{ex.reps}</TableCell>
                      <TableCell className="text-center font-semibold text-primary text-xs">{ex.weight} kg</TableCell>
                      <TableCell className="text-center">
                        <div className={`inline-flex px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
                          BORG_SCALE_COLORS[ex.pseExercise] || 'bg-muted'
                        } ${ex.pseExercise >= 8 ? 'text-white' : 'text-foreground'}`}>
                          {ex.pseExercise}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleGetAIInsight(ex)}
                          disabled={insightLoading === ex.id}
                          className="h-7 w-7 text-primary"
                        >
                          {insightLoading === ex.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <BrainCircuit className="h-3 w-3" />}
                        </Button>
                      </TableCell>
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
