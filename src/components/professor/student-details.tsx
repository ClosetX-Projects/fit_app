'use client';

import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ClipboardList, Dumbbell, History, LineChart, ShieldAlert, Heart, Target } from 'lucide-react';
import { TrainingManager } from './training-manager';
import { StudentAnalytics } from './student-analytics';
import { StudentAssessmentsView } from './student-assessments-view';
import { StudentHistoryView } from './student-history-view';

interface StudentDetailsProps {
  studentId: string;
  onBack: () => void;
}

export function StudentDetails({ studentId, onBack }: StudentDetailsProps) {
  const { firestore } = useFirebase();
  const studentRef = useMemoFirebase(() => doc(firestore, 'users', studentId), [firestore, studentId]);
  const { data: student } = useDoc(studentRef);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full hover:bg-primary/10">
            <ArrowLeft className="h-5 w-5 text-primary" />
          </Button>
          <div className="flex items-center gap-4">
             <div className="h-16 w-16 rounded-3xl bg-primary flex items-center justify-center text-white text-2xl font-black">
                {student?.name?.[0]}
             </div>
             <div>
                <h2 className="text-3xl font-black text-primary">{student?.name || 'Carregando...'}</h2>
                <p className="text-sm text-muted-foreground">{student?.email}</p>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <Card className="rounded-3xl bg-destructive/5 border-destructive/20">
            <CardHeader className="p-4 pb-0 flex flex-row items-center gap-2">
               <ShieldAlert className="h-4 w-4 text-destructive" />
               <p className="text-[10px] font-black uppercase text-destructive">Restrições</p>
            </CardHeader>
            <CardContent className="p-4 pt-1">
               <p className="text-sm font-medium">{student?.restrictions || "Nenhuma informada pelo aluno."}</p>
            </CardContent>
         </Card>
         <Card className="rounded-3xl bg-primary/5 border-primary/20">
            <CardHeader className="p-4 pb-0 flex flex-row items-center gap-2">
               <Heart className="h-4 w-4 text-primary" />
               <p className="text-[10px] font-black uppercase text-primary">Anamnese</p>
            </CardHeader>
            <CardContent className="p-4 pt-1">
               <p className="text-sm font-medium">{student?.anamnesis || "Dados básicos não preenchidos."}</p>
            </CardContent>
         </Card>
         <Card className="rounded-3xl bg-accent/5 border-accent/20">
            <CardHeader className="p-4 pb-0 flex flex-row items-center gap-2">
               <Target className="h-4 w-4 text-accent" />
               <p className="text-[10px] font-black uppercase text-accent">Objetivos</p>
            </CardHeader>
            <CardContent className="p-4 pt-1">
               <p className="text-sm font-medium">{student?.goals || "Geral / Bem-estar"}</p>
            </CardContent>
         </Card>
      </div>

      <Tabs defaultValue="training" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto p-1 bg-muted rounded-2xl mb-8">
          <TabsTrigger value="training" className="rounded-xl py-2 gap-2"><Dumbbell className="h-4 w-4" /> Prescrição</TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-xl py-2 gap-2"><LineChart className="h-4 w-4" /> Análise</TabsTrigger>
          <TabsTrigger value="assessments" className="rounded-xl py-2 gap-2"><ClipboardList className="h-4 w-4" /> Avaliações</TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl py-2 gap-2"><History className="h-4 w-4" /> Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="training" className="pt-4"><TrainingManager studentId={studentId} /></TabsContent>
        <TabsContent value="analytics" className="pt-4"><StudentAnalytics studentId={studentId} /></TabsContent>
        <TabsContent value="assessments" className="pt-4"><StudentAssessmentsView studentId={studentId} /></TabsContent>
        <TabsContent value="history" className="pt-4"><StudentHistoryView studentId={studentId} /></TabsContent>
      </Tabs>
    </div>
  );
}