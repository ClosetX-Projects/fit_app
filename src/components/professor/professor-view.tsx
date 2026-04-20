'use client';

import { useState } from 'react';
import { useUser } from '@/contexts/auth-provider';
import { useApi } from '@/hooks/use-api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Users, ClipboardList, Loader2, BookOpen, LayoutGrid, ClipboardCheck, ArrowLeft } from 'lucide-react';
import { AddStudentDialog } from './add-student-dialog';
import { StudentDetails } from './student-details';
import { ProgramLibrary } from './program-library';
import { AssessmentForm } from '@/components/assessment-form';

export function ProfessorView() {
  const { user } = useUser();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('assessments');
  const [showAssessmentWizard, setShowAssessmentWizard] = useState(false);
  const [initialDetailsTab, setInitialDetailsTab] = useState('assessments');
  const [editContext, setEditContext] = useState<{ studentId: string, assessmentId: string } | null>(null);

  // Passando explicitamente o professor_id para respeitar isolamento
  const { data: students, loading: isLoading } = useApi<any[]>(user ? `/users/alunos?professor_id=${user.id}` : null);

  const handleSelectStudent = (id: string, tab: string = 'assessments') => {
    setInitialDetailsTab(tab);
    setSelectedStudentId(id);
  };

  const handleEditAntropometry = (studentId: string, assessmentId: string) => {
    setEditContext({ studentId, assessmentId });
    setShowAssessmentWizard(true);
  };

  const handleCloseWizard = () => {
    setShowAssessmentWizard(false);
    setEditContext(null);
  };

  if (showAssessmentWizard) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={handleCloseWizard} className="rounded-full gap-2 text-primary font-bold">
          <ArrowLeft className="h-4 w-4" /> Voltar ao Painel
        </Button>
        <AssessmentForm 
          initialStudentId={editContext?.studentId} 
          initialAssessmentId={editContext?.assessmentId} 
        />
      </div>
    );
  }

  if (selectedStudentId) {
    return (
      <StudentDetails 
        studentId={selectedStudentId} 
        onBack={() => setSelectedStudentId(null)} 
        defaultTab={initialDetailsTab}
        onEditAntropometry={(assessmentId) => handleEditAntropometry(selectedStudentId, assessmentId)}
      />
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-primary uppercase">Área do Personal</h2>
          <p className="text-muted-foreground mt-1 font-medium">Gestão técnica de alunos e avaliações físicas.</p>
        </div>
        <div className="flex gap-2">
          <AddStudentDialog />
          <Button onClick={() => setShowAssessmentWizard(true)} className="rounded-full bg-accent text-accent-foreground font-black px-6 shadow-lg shadow-accent/20">
            <ClipboardList className="h-4 w-4 mr-2" /> Nova Avaliação
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full md:w-fit grid-cols-3 h-auto p-1 bg-muted rounded-2xl mb-8">
          <TabsTrigger value="assessments" className="rounded-xl py-3 px-8 text-xs font-bold uppercase gap-2">
            <ClipboardCheck className="h-4 w-4" /> Início
          </TabsTrigger>
          <TabsTrigger value="students" className="rounded-xl py-3 px-8 text-xs font-bold uppercase gap-2">
            <Users className="h-4 w-4" /> Alunos
          </TabsTrigger>
          <TabsTrigger value="library" className="rounded-xl py-3 px-8 text-xs font-bold uppercase gap-2">
            <BookOpen className="h-4 w-4" /> Biblioteca
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assessments" className="space-y-6 animate-in fade-in duration-500">
           <div className="grid gap-6 md:grid-cols-2">
              <section className="space-y-4">
                 <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <ClipboardList className="h-4 w-4" /> Avaliações Recentes
                 </h3>
                 <div className="grid gap-4">
                    {isLoading ? (
                      <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>
                    ) : students?.length ? (
                      students.map(student => (
                        <div key={student.id} onClick={() => handleSelectStudent(student.id, 'assessments')} className="nubank-card cursor-pointer group flex items-center justify-between py-4 border-l-4 border-l-primary/30 hover:border-l-primary">
                           <div className="flex items-center gap-4">
                              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-lg font-black">
                                 {student.nome?.[0]}
                              </div>
                              <div>
                                 <p className="font-black text-base text-foreground group-hover:text-primary transition-colors">{student.nome}</p>
                                 <p className="text-[9px] text-muted-foreground uppercase font-bold">Ver ficha técnica</p>
                              </div>
                           </div>
                           <Button size="sm" variant="ghost" className="rounded-full text-primary font-bold text-[10px] uppercase">
                              Abrir
                           </Button>
                        </div>
                      ))
                    ) : (
                      <div className="p-16 text-center bg-muted/30 rounded-[3rem] border-2 border-dashed border-primary/10">
                         <p className="font-black text-muted-foreground uppercase tracking-widest text-xs">Nenhum aluno vinculado.</p>
                      </div>
                    )}
                 </div>
              </section>

              <section className="space-y-4">
                 <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4" /> Atalhos Rápidos
                 </h3>
                 <div onClick={() => setShowAssessmentWizard(true)} className="nubank-card border-primary/5 bg-primary/5 p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-primary/10 transition-all">
                    <ClipboardCheck className="h-12 w-12 mb-4 text-primary" />
                    <p className="text-sm font-bold text-primary uppercase tracking-tighter">Ficha Multidisciplinar</p>
                    <p className="text-xs text-muted-foreground mt-2">Inicie uma avaliação completa com cálculo automático de IMC, RCQ e Dobras.</p>
                 </div>
              </section>
           </div>
        </TabsContent>

        <TabsContent value="students" className="space-y-8 animate-in fade-in duration-500">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {students?.map(student => (
                <div key={student.id} onClick={() => handleSelectStudent(student.id, 'assessments')} className="nubank-card cursor-pointer group flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-xl font-black">
                    {student.nome?.[0]}
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-foreground group-hover:text-primary transition-colors">{student.nome}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">{student.email}</p>
                  </div>
                </div>
              ))}
            </div>
        </TabsContent>

        <TabsContent value="library" className="animate-in fade-in duration-500">
           <ProgramLibrary />
        </TabsContent>
      </Tabs>
    </div>
  );
}
