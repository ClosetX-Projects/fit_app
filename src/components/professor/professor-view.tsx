'use client';

import { useState } from 'react';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, UserPlus, ClipboardList, Dumbbell, Search, Loader2, BookOpen, UserCheck } from 'lucide-react';
import { AddStudentDialog } from './add-student-dialog';
import { StudentDetails } from './student-details';

export function ProfessorView() {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const studentsRef = useMemoFirebase(() => 
    user ? collection(firestore, 'professors', user.uid, 'students') : null
  , [firestore, user]);
  
  const { data: students, isLoading } = useCollection(studentsRef);

  if (selectedStudentId) {
    return <StudentDetails studentId={selectedStudentId} onBack={() => setSelectedStudentId(null)} />;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-primary">Área do Personal</h2>
          <p className="text-muted-foreground mt-1">Gerencie seus programas de treino e acompanhe seus alunos.</p>
        </div>
        <AddStudentDialog />
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Seção de Alunos Ativos */}
        <section className="space-y-4">
           <h3 className="text-xl font-bold flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" /> Alunos Ativos
           </h3>
           <div className="grid gap-4">
              {isLoading ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>
              ) : students?.length ? (
                students.map(student => (
                  <div key={student.id} onClick={() => setSelectedStudentId(student.id)} className="nubank-card cursor-pointer group flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                           {student.name?.[0]}
                        </div>
                        <div>
                           <p className="font-bold text-lg">{student.name}</p>
                           <p className="text-xs text-muted-foreground">{student.email}</p>
                        </div>
                     </div>
                     <Button variant="ghost" size="icon" className="group-hover:bg-primary group-hover:text-white rounded-full">
                        <Search className="h-4 w-4" />
                     </Button>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center bg-muted rounded-3xl border-2 border-dashed">
                   <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                   <p className="font-medium">Nenhum aluno vinculado.</p>
                </div>
              )}
           </div>
        </section>

        {/* Seção de Biblioteca de Programas */}
        <section className="space-y-4">
           <h3 className="text-xl font-bold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> Biblioteca de Programas
           </h3>
           <div className="nubank-card border-dashed bg-muted/30 flex flex-col items-center justify-center py-12 text-center">
              <Dumbbell className="h-10 w-10 mb-4 opacity-20" />
              <p className="text-sm font-medium text-muted-foreground">Aqui você poderá criar programas base para replicar entre alunos.</p>
              <Button variant="outline" className="mt-4 rounded-full border-primary text-primary">Em breve</Button>
           </div>
        </section>
      </div>
    </div>
  );
}