
'use client';

import { useState } from 'react';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, serverTimestamp, deleteDoc, getDocs } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Dumbbell, Save, Loader2, ArrowLeft, ChevronRight, BookOpen, Layers, TrendingUp, Timer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EXERCISE_LIST, TRAINING_METHODS, PROGRESSION_TYPES } from "@/lib/constants";

interface TrainingManagerProps {
  studentId: string;
}

export function TrainingManager({ studentId }: TrainingManagerProps) {
  const { firestore } = useFirebase();
  const { user: professor } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  const [newProgramName, setNewProgramName] = useState('');
  const [newProgramDesc, setNewProgramDesc] = useState('');
  const [newMethod, setNewMethod] = useState('Múltiplas Séries');
  const [newProgression, setNewProgression] = useState('Linear');
  const [newDuration, setNewDuration] = useState('4');

  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);

  // Estados para novo exercício
  const [exName, setExName] = useState('');
  const [exSets, setExSets] = useState('');
  const [exReps, setExReps] = useState('');
  const [exRm, setExRm] = useState('');

  const programsRef = useMemoFirebase(() => 
    collection(firestore, 'users', studentId, 'trainingPrograms')
  , [firestore, studentId]);
  
  const { data: programs, isLoading: isLoadingPrograms } = useCollection(programsRef);

  const selectedProgram = programs?.find(p => p.id === selectedProgramId);

  const exercisesRef = useMemoFirebase(() => 
    selectedProgramId ? collection(firestore, 'users', studentId, 'trainingPrograms', selectedProgramId, 'prescribedExercises') : null
  , [firestore, studentId, selectedProgramId]);

  const { data: exercises, isLoading: isLoadingExercises } = useCollection(exercisesRef);

  // Buscar Templates da Biblioteca do Professor
  const templatesRef = useMemoFirebase(() => 
    professor ? collection(firestore, 'users', professor.uid, 'programTemplates') : null
  , [firestore, professor]);
  const { data: templates } = useCollection(templatesRef);

  const handleCreateProgram = async () => {
    if (!newProgramName || !firestore) return;
    setLoading(true);

    const programRef = doc(collection(firestore, 'users', studentId, 'trainingPrograms'));
    setDocumentNonBlocking(programRef, {
      id: programRef.id,
      userId: studentId,
      name: newProgramName,
      description: newProgramDesc,
      method: newMethod,
      progressionType: newProgression,
      durationWeeks: Number(newDuration),
      createdAt: serverTimestamp(),
    }, { merge: true });

    toast({ title: "Programa criado", description: "O novo programa de treinamento foi adicionado." });
    setNewProgramName('');
    setNewProgramDesc('');
    setLoading(false);
  };

  const handleImportTemplate = async (template: any) => {
    if (!firestore || !professor || !studentId) return;
    setIsImporting(true);

    try {
      // 1. Criar o Programa no aluno baseado no Template
      const programRef = doc(collection(firestore, 'users', studentId, 'trainingPrograms'));
      const programData = {
        id: programRef.id,
        userId: studentId,
        name: template.name,
        description: template.description,
        method: template.method || 'Múltiplas Séries',
        progressionType: template.progressionType || 'Linear',
        durationWeeks: template.durationWeeks || 4,
        importedFrom: template.id,
        createdAt: serverTimestamp(),
      };
      
      setDocumentNonBlocking(programRef, programData, { merge: true });

      // 2. Buscar exercícios do template
      const templateExRef = collection(firestore, 'users', professor.uid, 'programTemplates', template.id, 'templateExercises');
      const exSnapshot = await getDocs(templateExRef);

      // 3. Clonar cada exercício para o aluno
      exSnapshot.forEach((exDoc) => {
        const exData = exDoc.data();
        const studentExRef = doc(collection(firestore, 'users', studentId, 'trainingPrograms', programRef.id, 'prescribedExercises'));
        setDocumentNonBlocking(studentExRef, {
          ...exData,
          id: studentExRef.id,
          createdAt: serverTimestamp(),
        }, { merge: true });
      });

      toast({
        title: "Template Importado!",
        description: `${template.name} foi atribuído com sucesso.`,
      });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro na importação" });
    } finally {
      setIsImporting(false);
    }
  };

  const handleAddExercise = () => {
    if (!selectedProgramId || !exName || !firestore) return;
    setLoading(true);

    const exerciseRef = doc(collection(firestore, 'users', studentId, 'trainingPrograms', selectedProgramId, 'prescribedExercises'));
    setDocumentNonBlocking(exerciseRef, {
      id: exerciseRef.id,
      name: exName,
      sets: Number(exSets),
      reps: exReps,
      oneRmPercentage: Number(exRm),
      createdAt: serverTimestamp(),
    }, { merge: true });

    toast({ title: "Exercício adicionado", description: `${exName} foi incluído no programa.` });
    setExName('');
    setExSets('');
    setExReps('');
    setExRm('');
    setLoading(false);
  };

  const handleDeleteExercise = (exerciseId: string) => {
    if (!selectedProgramId || !firestore) return;
    const exerciseRef = doc(firestore, 'users', studentId, 'trainingPrograms', selectedProgramId, 'prescribedExercises', exerciseId);
    deleteDoc(exerciseRef);
    toast({ title: "Exercício removido" });
  };

  const handleDeleteProgram = (programId: string) => {
    if (!firestore) return;
    const programRef = doc(firestore, 'users', studentId, 'trainingPrograms', programId);
    deleteDoc(programRef);
    toast({ title: "Programa excluído" });
    if (selectedProgramId === programId) setSelectedProgramId(null);
  };

  if (selectedProgramId && selectedProgram) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSelectedProgramId(null)} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h3 className="text-xl font-black text-primary uppercase tracking-tighter">{selectedProgram.name}</h3>
            <div className="flex flex-wrap gap-2 mt-1">
               <span className="text-[9px] font-black uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-full">{selectedProgram.method}</span>
               <span className="text-[9px] font-black uppercase bg-accent/20 text-accent-foreground px-2 py-0.5 rounded-full">{selectedProgram.progressionType}</span>
               <span className="text-[9px] font-black uppercase bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{selectedProgram.durationWeeks} Semanas</span>
            </div>
          </div>
        </div>

        <Card className="border-primary/20 rounded-3xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Adicionar Exercício Personalizado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="md:col-span-2 space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Exercício</Label>
                <Select value={exName} onValueChange={setExName}>
                  <SelectTrigger className="rounded-xl h-12">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {EXERCISE_LIST.map(ex => (
                      <SelectItem key={ex} value={ex}>{ex}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Séries</Label>
                <Input type="number" placeholder="Ex: 3" value={exSets} onChange={(e) => setExSets(e.target.value)} className="rounded-xl h-12" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Reps</Label>
                <Input placeholder="Ex: 12" value={exReps} onChange={(e) => setExReps(e.target.value)} className="rounded-xl h-12" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">% 1RM</Label>
                <Input type="number" placeholder="Ex: 70" value={exRm} onChange={(e) => setExRm(e.target.value)} className="rounded-xl h-12" />
              </div>
              <Button onClick={handleAddExercise} disabled={loading || !exName} className="h-12 rounded-xl font-bold bg-primary shadow-md md:col-start-4">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h4 className="font-black text-xs uppercase text-primary tracking-widest flex items-center gap-2">
            <Dumbbell className="h-4 w-4" /> Exercícios Prescritos para o Aluno
          </h4>
          {isLoadingExercises ? (
            <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : exercises && exercises.length > 0 ? (
            <div className="grid gap-3">
              {exercises.map((ex) => (
                <div key={ex.id} className="nubank-card group flex items-center justify-between py-4 px-6">
                  <div className="flex gap-6 items-center">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black">
                      {ex.sets}x
                    </div>
                    <div>
                      <p className="font-bold text-lg">{ex.name}</p>
                      <p className="text-xs text-muted-foreground font-black uppercase tracking-tight">
                        {ex.reps} reps | {ex.oneRmPercentage}% do 1RM
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive opacity-0 group-hover:opacity-100 rounded-full hover:bg-destructive/10" onClick={() => handleDeleteExercise(ex.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-16 text-center border-2 border-dashed rounded-[2rem] bg-muted/20">
              <p className="text-sm font-medium text-muted-foreground">Prescreva o primeiro exercício para este aluno.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid gap-6 md:grid-cols-2">
         <Card className="rounded-[2rem] border-primary/20 shadow-xl overflow-hidden">
           <CardHeader className="bg-primary/5">
             <CardTitle className="text-lg font-black uppercase text-primary">Novo Programa Manual</CardTitle>
             <CardDescription>Crie uma estrutura do zero para este aluno.</CardDescription>
           </CardHeader>
           <CardContent className="p-6 space-y-4">
             <div className="grid gap-2">
               <Label className="text-[10px] font-black uppercase text-primary">Nome do Treino</Label>
               <Input placeholder="Ex: Treino A - Empurrar" value={newProgramName} onChange={(e) => setNewProgramName(e.target.value)} className="rounded-xl h-12" />
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                   <Label className="text-[10px] font-black uppercase text-primary flex items-center gap-1"><Layers className="h-3 w-3" /> Método</Label>
                   <Select value={newMethod} onValueChange={setNewMethod}>
                     <SelectTrigger className="rounded-xl h-10">
                        <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                        {TRAINING_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                     </SelectContent>
                   </Select>
                </div>
                <div className="space-y-1">
                   <Label className="text-[10px] font-black uppercase text-primary flex items-center gap-1"><Timer className="h-3 w-3" /> Semanas</Label>
                   <Input type="number" value={newDuration} onChange={e => setNewDuration(e.target.value)} className="rounded-xl h-10" />
                </div>
             </div>
             <Button onClick={handleCreateProgram} disabled={loading || !newProgramName} className="w-full h-12 rounded-full font-bold bg-primary">
               {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
               Criar Agora
             </Button>
           </CardContent>
         </Card>

         <Card className="rounded-[2rem] border-dashed border-2 border-primary/20 bg-primary/5 flex flex-col items-center justify-center p-8 text-center">
            <BookOpen className="h-12 w-12 mb-4 text-primary opacity-30" />
            <h3 className="text-xl font-black text-primary uppercase">Importar da Biblioteca</h3>
            <p className="text-xs text-muted-foreground mt-2 mb-6 max-w-[250px]">Atribua um programa técnico já salvo na sua biblioteca de modelos.</p>
            
            <Dialog>
               <DialogTrigger asChild>
                  <Button className="rounded-full px-8 h-12 font-black shadow-lg">
                     Acessar Biblioteca
                  </Button>
               </DialogTrigger>
               <DialogContent className="sm:max-w-xl rounded-[2.5rem] border-primary/20">
                  <DialogHeader>
                     <DialogTitle className="text-2xl font-black text-primary uppercase tracking-tighter">Escolha um Template</DialogTitle>
                     <DialogDescription>Seus modelos salvos na Biblioteca de Treinos.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
                     {templates && templates.length > 0 ? templates.map((t) => (
                        <div key={t.id} className="nubank-card flex items-center justify-between py-4 px-6 hover:bg-primary/5 transition-colors cursor-pointer" onClick={() => handleImportTemplate(t)}>
                           <div className="flex-1">
                              <p className="font-black text-lg text-primary">{t.name}</p>
                              <div className="flex gap-2 mt-1">
                                 <span className="text-[9px] font-black uppercase bg-primary/10 text-primary px-2 rounded-full">{t.method}</span>
                                 <span className="text-[9px] font-black uppercase bg-accent/20 text-accent-foreground px-2 rounded-full">{t.durationWeeks} Sem.</span>
                              </div>
                           </div>
                           <Button size="icon" variant="ghost" disabled={isImporting} className="rounded-full hover:bg-primary hover:text-white transition-all">
                              {isImporting ? <Loader2 className="animate-spin" /> : <Plus className="h-5 w-5" />}
                           </Button>
                        </div>
                     )) : (
                        <div className="text-center py-12 text-muted-foreground italic">Sua biblioteca de templates está vazia.</div>
                     )}
                  </div>
               </DialogContent>
            </Dialog>
         </Card>
      </div>

      <div className="space-y-4">
        <h3 className="font-black text-xs uppercase tracking-widest text-primary flex items-center gap-2">
           <Layers className="h-4 w-4" /> Programas Prescritos Atuais
        </h3>
        {isLoadingPrograms ? (
          <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : programs && programs.length > 0 ? (
          <div className="grid gap-4">
             {programs.map((program) => (
               <Card key={program.id} className="nubank-card group cursor-pointer" onClick={() => setSelectedProgramId(program.id)}>
                 <div className="flex items-center justify-between">
                   <div className="flex-1">
                     <div className="flex items-center gap-2 mb-1">
                        <p className="text-lg font-black text-foreground group-hover:text-primary transition-colors">{program.name}</p>
                        {program.importedFrom && <span className="text-[8px] bg-accent/20 text-accent-foreground px-1.5 rounded-full font-black uppercase">Template</span>}
                     </div>
                     <div className="flex gap-3">
                        <p className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1"><Layers className="h-3 w-3" /> {program.method}</p>
                        <p className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {program.progressionType}</p>
                        <p className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-1"><Timer className="h-3 w-3" /> {program.durationWeeks} Semanas</p>
                     </div>
                   </div>
                   <div className="flex items-center gap-2">
                     <Button variant="ghost" size="icon" className="text-destructive opacity-0 group-hover:opacity-100 rounded-full hover:bg-destructive/10" onClick={(e) => {
                       e.stopPropagation();
                       handleDeleteProgram(program.id);
                     }}>
                       <Trash2 className="h-4 w-4" />
                     </Button>
                     <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-all" />
                   </div>
                 </div>
               </Card>
             ))}
          </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-[3rem] bg-muted/10">
             <Dumbbell className="h-12 w-12 mx-auto mb-4 opacity-10" />
             <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Nenhum programa ativo para este aluno.</p>
          </div>
        )}
      </div>
    </div>
  );
}
