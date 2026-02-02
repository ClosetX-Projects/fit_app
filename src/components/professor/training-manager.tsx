
'use client';

import { useState } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Dumbbell, Save, Loader2, ArrowLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TrainingManagerProps {
  studentId: string;
}

interface ExerciseData {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight: number;
}

export function TrainingManager({ studentId }: TrainingManagerProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newProgramName, setNewProgramName] = useState('');
  const [newProgramDesc, setNewProgramDesc] = useState('');
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);

  // Estados para novo exercício
  const [exName, setExName] = useState('');
  const [exSets, setExSets] = useState('');
  const [exReps, setExReps] = useState('');
  const [exWeight, setExWeight] = useState('');

  const programsRef = useMemoFirebase(() => 
    collection(firestore, 'users', studentId, 'trainingPrograms')
  , [firestore, studentId]);
  
  const { data: programs, isLoading: isLoadingPrograms } = useCollection(programsRef);

  const selectedProgram = programs?.find(p => p.id === selectedProgramId);

  const exercisesRef = useMemoFirebase(() => 
    selectedProgramId ? collection(firestore, 'users', studentId, 'trainingPrograms', selectedProgramId, 'prescribedExercises') : null
  , [firestore, studentId, selectedProgramId]);

  const { data: exercises, isLoading: isLoadingExercises } = useCollection(exercisesRef);

  const handleCreateProgram = async () => {
    if (!newProgramName || !firestore) return;
    setLoading(true);

    const programRef = doc(collection(firestore, 'users', studentId, 'trainingPrograms'));
    setDocumentNonBlocking(programRef, {
      id: programRef.id,
      userId: studentId,
      name: newProgramName,
      description: newProgramDesc,
      createdAt: serverTimestamp(),
    }, { merge: true });

    toast({ title: "Programa criado", description: "O novo programa de treinamento foi adicionado." });
    setNewProgramName('');
    setNewProgramDesc('');
    setLoading(false);
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
      weight: Number(exWeight),
      createdAt: serverTimestamp(),
    }, { merge: true });

    toast({ title: "Exercício adicionado", description: `${exName} foi incluído no programa.` });
    setExName('');
    setExSets('');
    setExReps('');
    setExWeight('');
    setLoading(false);
  };

  const handleDeleteExercise = (exerciseId: string) => {
    if (!selectedProgramId || !firestore) return;
    const exerciseRef = doc(firestore, 'users', studentId, 'trainingPrograms', selectedProgramId, 'prescribedExercises', exerciseId);
    deleteDoc(exerciseRef);
    toast({ title: "Exercício removido", description: "O exercício foi excluído do programa." });
  };

  const handleDeleteProgram = (programId: string) => {
    if (!firestore) return;
    const programRef = doc(firestore, 'users', studentId, 'trainingPrograms', programId);
    deleteDoc(programRef);
    toast({ title: "Programa excluído", description: "O programa e seus exercícios foram removidos." });
    if (selectedProgramId === programId) setSelectedProgramId(null);
  };

  if (selectedProgramId && selectedProgram) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSelectedProgramId(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h3 className="text-xl font-bold">{selectedProgram.name}</h3>
            <p className="text-sm text-muted-foreground">{selectedProgram.description}</p>
          </div>
        </div>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Adicionar Exercício</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="ex-name">Nome do Exercício</Label>
                <Input id="ex-name" placeholder="Ex: Agachamento Livre" value={exName} onChange={(e) => setExName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ex-sets">Séries</Label>
                <Input id="ex-sets" type="number" placeholder="Ex: 3" value={exSets} onChange={(e) => setExSets(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ex-reps">Reps/Tempo</Label>
                <Input id="ex-reps" placeholder="Ex: 12 ou 45s" value={exReps} onChange={(e) => setExReps(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ex-weight">Peso (kg)</Label>
                <Input id="ex-weight" type="number" placeholder="Ex: 50" value={exWeight} onChange={(e) => setExWeight(e.target.value)} />
              </div>
              <Button onClick={handleAddExercise} disabled={loading || !exName} className="md:col-start-4">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" /> Exercícios Prescritos
          </h4>
          {isLoadingExercises ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : exercises && exercises.length > 0 ? (
            <div className="grid gap-3">
              {exercises.map((ex) => (
                <Card key={ex.id} className="group">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex gap-4 items-center">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {ex.sets}x
                      </div>
                      <div>
                        <p className="font-bold">{ex.name}</p>
                        <p className="text-xs text-muted-foreground">{ex.reps} repetições | {ex.weight}kg</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteExercise(ex.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">Nenhum exercício adicionado a este programa.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Card>
        <CardHeader>
          <CardTitle>Novo Programa de Treinamento</CardTitle>
          <CardDescription>Crie uma nova estrutura de treinamento para o aluno.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="prog-name">Nome do Programa</Label>
            <Input id="prog-name" placeholder="Ex: Hipertrofia A/B" value={newProgramName} onChange={(e) => setNewProgramName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="prog-desc">Descrição / Objetivo</Label>
            <Textarea id="prog-desc" placeholder="Ex: Foco em membros inferiores e core" value={newProgramDesc} onChange={(e) => setNewProgramDesc(e.target.value)} />
          </div>
          <Button onClick={handleCreateProgram} disabled={loading || !newProgramName} className="w-full">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Criar Programa
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <h3 className="font-bold text-lg">Programas Ativos</h3>
        {isLoadingPrograms ? (
          <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : programs && programs.length > 0 ? (
          programs.map((program) => (
            <Card key={program.id} className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setSelectedProgramId(program.id)}>
              <CardHeader className="flex flex-row items-center justify-between p-4">
                <div className="space-y-1">
                  <CardTitle className="text-md">{program.name}</CardTitle>
                  <CardDescription className="text-xs line-clamp-1">{program.description}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteProgram(program.id);
                  }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
            </Card>
          ))
        ) : (
          <p className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">Nenhum programa criado.</p>
        )}
      </div>
    </div>
  );
}
