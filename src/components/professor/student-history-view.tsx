
'use client';

import { useState, useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, where } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, History, Dumbbell, Sparkles, BrainCircuit } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { generateTrainingInsights, type TrainingInsightsInput } from '@/ai/ai-training-insights';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface StudentHistoryViewProps {
  studentId: string;
}

export function StudentHistoryView({ studentId }: StudentHistoryViewProps) {
  const { firestore } = useFirebase();
  const [insightLoading, setInsightLoading] = useState<string | null>(null);
  const [currentInsight, setCurrentInsight] = useState<{ id: string, text: string } | null>(null);

  // Buscar exercícios reais. Removido orderBy do banco para evitar erro de índice.
  const rawExercisesRef = useMemoFirebase(() => 
    query(
      collectionGroup(firestore!, 'exercises'),
      where('userId', '==', studentId)
    )
  , [firestore, studentId]);

  const { data: rawExercises, isLoading } = useCollection(rawExercisesRef);

  // Ordenar exercícios em memória (mais recentes primeiro)
  const exercises = useMemo(() => {
    if (!rawExercises) return null;
    return [...rawExercises].sort((a, b) => {
      const timeA = a.createdAt?.toDate?.()?.getTime() || 0;
      const timeB = b.createdAt?.toDate?.()?.getTime() || 0;
      return timeB - timeA;
    });
  }, [rawExercises]);

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

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!exercises || exercises.length === 0) {
    return (
      <div className="text-center py-24 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
        <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
        <h3 className="text-lg font-bold">Nenhum histórico disponível</h3>
        <p className="text-sm max-w-xs mx-auto">O aluno ainda não registrou a execução de exercícios em suas sessões de treino.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Histórico de Performance
          </CardTitle>
          <CardDescription>Lista de todos os exercícios realizados e registrados pelo aluno.</CardDescription>
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
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exercises.map((ex) => (
                  <TableRow key={ex.id}>
                    <TableCell className="text-xs font-medium">
                      {ex.createdAt ? format(ex.createdAt.toDate(), 'dd/MM/yyyy', { locale: ptBR }) : '--'}
                    </TableCell>
                    <TableCell className="font-bold flex items-center gap-2">
                      <Dumbbell className="h-3 w-3 text-primary" />
                      {ex.name}
                    </TableCell>
                    <TableCell className="text-center">{ex.sets}</TableCell>
                    <TableCell className="text-center">{ex.reps}</TableCell>
                    <TableCell className="text-center font-semibold text-primary">{ex.weight} kg</TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-bold ${
                        ex.pseExercise >= 8 ? 'bg-destructive/10 text-destructive' : 
                        ex.pseExercise >= 5 ? 'bg-primary/10 text-primary' : 
                        'bg-green-500/10 text-green-500'
                      }`}>
                        {ex.pseExercise}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleGetAIInsight(ex)}
                        disabled={insightLoading === ex.id}
                        className="text-primary hover:text-primary hover:bg-primary/10"
                      >
                        {insightLoading === ex.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
