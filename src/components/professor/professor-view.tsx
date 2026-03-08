
'use client';

import { useState } from 'react';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, UserPlus, ClipboardList, Dumbbell, Search, Loader2, BookOpen, UserCheck, LayoutGrid, Settings } from 'lucide-react';
import { AddStudentDialog } from './add-student-dialog';
import { StudentDetails } from './student-details';
import { ProgramLibrary } from './program-library';
import { cn } from '@/lib/utils';

export function ProfessorView() {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('students');

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
          <h2 className="text-4xl font-black tracking-tighter text-primary uppercase">Área do Personal</h2>
          <p className="text-muted-foreground mt-1 font-medium">Gestão técnica de alunos e biblioteca de programas.</p>
        </div>
        <AddStudentDialog />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full md:w-fit grid-cols-2 h-auto p-1 bg-muted rounded-2xl mb-8">
          <TabsTrigger value="students" className="rounded-xl py-3 px-8 text-xs font-bold uppercase gap-2">
            <Users className="h-4 w-4" /> Alunos Ativos
          </TabsTrigger>
          <TabsTrigger value="library" className="rounded-xl py-3 px-8 text-xs font-bold uppercase gap-2">
            <BookOpen className="h-4 w-4" /> Biblioteca Base
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-8 animate-in fade-in duration-500">
           <div className="grid gap-6 md:grid-cols-2">
              <section className="space-y-4">
                 <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <UserCheck className="h-4 w-4" /> Listagem de Alunos
                 </h3>
                 <div className="grid gap-4">
                    {isLoading ? (
                      <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>
                    ) : students?.length ? (
                      students.map(student => (
                        <div key={student.id} onClick={() => setSelectedStudentId(student.id)} className="nubank-card cursor-pointer group flex items-center justify-between py-4">
                           <div className="flex items-center gap-4">
                              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-xl font-black">
                                 {student.name?.[0]}
                              </div>
                              <div>
                                 <p className="font-black text-lg text-foreground group-hover:text-primary transition-colors">{student.name}</p>
                                 <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">{student.email}</p>
                              </div>
                           </div>
                           <Button variant="ghost" size="icon" className="rounded-full group-hover:bg-primary group-hover:text-white transition-all">
                              <Search className="h-5 w-5" />
                           </Button>
                        </div>
                      ))
                    ) : (
                      <div className="p-16 text-center bg-muted/30 rounded-[3rem] border-2 border-dashed border-primary/10">
                         <Users className="h-16 w-16 mx-auto mb-6 opacity-10" />
                         <p className="font-black text-muted-foreground uppercase tracking-widest text-xs">Nenhum aluno vinculado.</p>
                         <p className="text-xs text-muted-foreground mt-2">Use o botão "Adicionar Aluno" para gerar um link de convite.</p>
                      </div>
                    )}
                 </div>
              </section>

              <section className="space-y-4">
                 <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4" /> Resumo de Atividade
                 </h3>
                 <div className="nubank-card border-primary/5 bg-primary/5 p-8 flex flex-col items-center justify-center text-center">
                    <Settings className="h-12 w-12 mb-4 text-primary opacity-20" />
                    <p className="text-sm font-bold text-primary uppercase tracking-tighter">Métricas de Retenção</p>
                    <p className="text-xs text-muted-foreground mt-2 max-w-[200px]">Em breve: Visualize quem está treinando com consistência e quem precisa de atenção.</p>
                 </div>
              </section>
           </div>
        </TabsContent>

        <TabsContent value="library" className="animate-in fade-in duration-500">
           <ProgramLibrary />
        </TabsContent>
      </Tabs>
    </div>
  );
}
