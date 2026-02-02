
'use client';

import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, where, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, History, Dumbbell, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StudentHistoryViewProps {
  studentId: string;
}

export function StudentHistoryView({ studentId }: StudentHistoryViewProps) {
  const { firestore } = useFirebase();

  // Buscar todos os exercícios realizados pelo aluno em todas as sessões
  const exercisesRef = useMemoFirebase(() => 
    query(
      collectionGroup(firestore!, 'exercises'),
      where('userId', '==', studentId),
      orderBy('createdAt', 'desc'),
      limit(50)
    )
  , [firestore, studentId]);

  const { data: exercises, isLoading } = useCollection(exercisesRef);

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
                <TableHead className="text-center">Carga (kg)</TableHead>
                <TableHead className="text-center">Esforço (PSE)</TableHead>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
