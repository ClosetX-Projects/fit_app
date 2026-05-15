'use client';

import { useState, useEffect } from 'react';
import { useApi } from '@/hooks/use-api';
import { fetchApi } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { TEST_PROTOCOLS } from '@/lib/constants';
import { 
  ArrowLeft, 
  ClipboardList, 
  Dumbbell, 
  History, 
  TrendingUp, 
  ShieldAlert, 
  Heart, 
  Target, 
  Zap, 
  Loader2, 
  CheckCircle2,
  Lock
} from 'lucide-react';
import { TrainingManager } from './training-manager';
import { StudentAnalytics } from './student-analytics';
import { StudentAssessmentsView } from './student-assessments-view';
import { StudentHistoryView } from './student-history-view';

interface StudentDetailsProps {
  studentId: string;
  onBack: () => void;
  defaultTab?: string;
  onEditAntropometry?: (assessmentId: string) => void;
}

export function StudentDetails({ studentId, onBack, defaultTab = 'assessments', onEditAntropometry }: StudentDetailsProps) {
  const { data: student, mutate: mutateStudent } = useApi<any>(`/users/alunos/${studentId}`);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [isUpdatingTests, setIsUpdatingTests] = useState(false);

  useEffect(() => {
    if (student?.testes_liberados) {
      setSelectedTests(student.testes_liberados);
    }
  }, [student]);

  const handleToggleTest = (testId: string) => {
    setSelectedTests(prev => 
      prev.includes(testId) ? prev.filter(id => id !== testId) : [...prev, testId]
    );
  };

  const handleSaveTests = async () => {
    setIsUpdatingTests(true);
    try {
      await fetchApi(`/users/alunos/${studentId}`, {
        method: 'PUT',
        data: { testes_liberados: selectedTests }
      });
      toast({ title: "Testes atualizados!", description: "O aluno já pode ver os testes selecionados." });
      mutateStudent();
    } catch (error) {
      toast({ variant: 'destructive', title: "Erro ao atualizar testes." });
    } finally {
      setIsUpdatingTests(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full hover:bg-primary/10">
            <ArrowLeft className="h-5 w-5 text-primary" />
          </Button>
          <div className="flex items-center gap-4">
             <div className="h-16 w-16 rounded-3xl bg-primary flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-primary/20">
                {student?.nome?.[0]}
             </div>
             <div>
                <h2 className="text-3xl font-black text-primary uppercase tracking-tighter leading-none">{student?.nome || 'Carregando...'}</h2>
                <p className="text-xs text-muted-foreground font-bold mt-1 uppercase tracking-widest">{student?.email}</p>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
         <Card className="rounded-3xl bg-destructive/5 border-destructive/20 shadow-sm">
            <CardHeader className="p-4 pb-0 flex flex-row items-center gap-2">
               <ShieldAlert className="h-4 w-4 text-destructive" />
               <p className="text-[10px] font-black uppercase text-destructive tracking-widest">Restrições</p>
            </CardHeader>
            <CardContent className="p-4 pt-1">
               <p className="text-sm font-bold text-foreground/80">{student?.restrictions || "Nenhuma informada."}</p>
            </CardContent>
         </Card>
         <Card className="rounded-3xl bg-primary/5 border-primary/20 shadow-sm">
            <CardHeader className="p-4 pb-0 flex flex-row items-center gap-2">
               <Heart className="h-4 w-4 text-primary" />
               <p className="text-[10px] font-black uppercase text-primary tracking-widest">Anamnese</p>
            </CardHeader>
            <CardContent className="p-4 pt-1">
               <p className="text-sm font-bold text-foreground/80">{student?.anamnesis || "Não preenchida."}</p>
            </CardContent>
         </Card>
         <Card className="rounded-3xl bg-accent/5 border-accent/20 shadow-sm">
            <CardHeader className="p-4 pb-0 flex flex-row items-center gap-2">
               <Target className="h-4 w-4 text-accent" />
               <p className="text-[10px] font-black uppercase text-accent tracking-widest">Objetivos</p>
            </CardHeader>
            <CardContent className="p-4 pt-1">
               <p className="text-sm font-bold text-foreground/80">{student?.goals || "Geral"}</p>
            </CardContent>
         </Card>

         {/* Controle de Testes para o Aluno */}
         <Card className="rounded-3xl border-primary/20 bg-background shadow-md lg:row-span-1">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
               <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  <p className="text-[10px] font-black uppercase text-primary tracking-widest">Testes Liberados</p>
               </div>
               <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSaveTests} 
                disabled={isUpdatingTests}
                className="h-7 px-2 text-[10px] font-black uppercase text-primary hover:bg-primary/10"
               >
                 {isUpdatingTests ? <Loader2 className="h-3 w-3 animate-spin" /> : "Salvar"}
               </Button>
            </CardHeader>
            <CardContent className="p-4 pt-0">
               <div className="grid grid-cols-2 gap-x-2 gap-y-2 mt-2">
                  {TEST_PROTOCOLS.map((test) => (
                    <div key={test.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`test-${test.id}`} 
                        checked={selectedTests.includes(test.id)}
                        onCheckedChange={() => handleToggleTest(test.id)}
                        className="rounded-md border-primary/20 data-[state=checked]:bg-primary"
                      />
                      <Label 
                        htmlFor={`test-${test.id}`}
                        className="text-[10px] font-bold uppercase cursor-pointer leading-none"
                      >
                        {test.name.split(' ')[0]}
                      </Label>
                    </div>
                  ))}
               </div>
            </CardContent>
         </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto p-1 bg-muted rounded-2xl mb-8">
          <TabsTrigger value="assessments" className="rounded-xl py-3 gap-2 text-xs font-bold uppercase"><ClipboardList className="h-4 w-4" /> Avaliações</TabsTrigger>
          <TabsTrigger value="training" className="rounded-xl py-3 gap-2 text-xs font-bold uppercase"><Dumbbell className="h-4 w-4" /> Prescrição</TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-xl py-3 gap-2 text-xs font-bold uppercase"><TrendingUp className="h-4 w-4" /> Evolução</TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl py-3 gap-2 text-xs font-bold uppercase"><History className="h-4 w-4" /> Treinos</TabsTrigger>
        </TabsList>

        <TabsContent value="assessments" className="pt-4 animate-in fade-in slide-in-from-top-2 duration-500">
          <StudentAssessmentsView 
            studentId={studentId} 
            onEditAntropometry={onEditAntropometry} 
          />
        </TabsContent>
        <TabsContent value="training" className="pt-4 animate-in fade-in slide-in-from-top-2 duration-500">
          <TrainingManager studentId={studentId} />
        </TabsContent>
        <TabsContent value="analytics" className="pt-4 animate-in fade-in slide-in-from-top-2 duration-500">
          <StudentAnalytics studentId={studentId} />
        </TabsContent>
        <TabsContent value="history" className="pt-4 animate-in fade-in slide-in-from-top-2 duration-500">
          <StudentHistoryView studentId={studentId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}