
'use client';

import { useState } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Dumbbell, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TrainingManagerProps {
  studentId: string;
}

export function TrainingManager({ studentId }: TrainingManagerProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newProgramName, setNewProgramName] = useState('');
  const [newProgramDesc, setNewProgramDesc] = useState('');

  const programsRef = useMemoFirebase(() => 
    collection(firestore, 'users', studentId, 'trainingPrograms')
  , [firestore, studentId]);
  
  const { data: programs, isLoading } = useCollection(programsRef);

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

  return (
    <div className="space-y-6">
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
            <Textarea id="prog-desc" placeholder="Objetivo e observações gerais" value={newProgramDesc} onChange={(e) => setNewProgramDesc(e.target.value)} />
          </div>
          <Button onClick={handleCreateProgram} disabled={loading || !newProgramName} className="w-full">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Criar Programa
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : programs?.map((program) => (
          <Card key={program.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{program.name}</CardTitle>
                <CardDescription>{program.description}</CardDescription>
              </div>
              <Button variant="outline" size="sm">Editar Exercícios</Button>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
