
'use client';

import { useState } from 'react';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, UserPlus, ClipboardList, Dumbbell, Search, Loader2 } from 'lucide-react';
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Meus Alunos</h2>
          <p className="text-muted-foreground">Gerencie seus alunos e prescreva treinamentos.</p>
        </div>
        <AddStudentDialog />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : students && students.length > 0 ? (
          students.map((student) => (
            <Card key={student.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedStudentId(student.id)}>
              <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{student.name || 'Aluno'}</CardTitle>
                  <CardDescription>{student.email}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="w-full">Ver Perfil</Button>
                  <Button size="sm" className="w-full">Prescrever</Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-full py-12">
            <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
              <Users className="h-12 w-12 text-muted-foreground opacity-20" />
              <div className="space-y-2">
                <h3 className="font-semibold text-xl">Nenhum aluno vinculado</h3>
                <p className="text-muted-foreground max-w-sm">Adicione alunos usando o ID do usuário para começar a prescrever treinos.</p>
              </div>
              <AddStudentDialog />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
