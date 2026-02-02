
'use client';

import { useState } from 'react';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, ClipboardList, Dumbbell, History, LineChart } from 'lucide-react';
import { TrainingManager } from './training-manager';

interface StudentDetailsProps {
  studentId: string;
  onBack: () => void;
}

export function StudentDetails({ studentId, onBack }: StudentDetailsProps) {
  const { firestore } = useFirebase();
  const studentRef = useMemoFirebase(() => doc(firestore, 'users', studentId), [firestore, studentId]);
  const { data: student } = useDoc(studentRef);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold">{student?.name || 'Carregando...'}</h2>
          <p className="text-sm text-muted-foreground">{student?.email}</p>
        </div>
      </div>

      <Tabs defaultValue="training" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-muted">
          <TabsTrigger value="training" className="flex items-center gap-2 py-2">
            <Dumbbell className="h-4 w-4" /> Prescrição
          </TabsTrigger>
          <TabsTrigger value="assessments" className="flex items-center gap-2 py-2">
            <ClipboardList className="h-4 w-4" /> Avaliações
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2 py-2">
            <History className="h-4 w-4" /> Histórico de Treinos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="training" className="pt-4">
          <TrainingManager studentId={studentId} />
        </TabsContent>

        <TabsContent value="assessments" className="pt-4">
          <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
            Visualização de Avaliações em desenvolvimento.
            O Professor terá acesso completo aos dados de Pollock, Bioimpedância e Força salvos pelo aluno.
          </div>
        </TabsContent>

        <TabsContent value="history" className="pt-4">
          <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
            Histórico de sessões do aluno aparecerá aqui para análise de PSE e Volume.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
