
'use client';

import { useState } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Loader2 } from 'lucide-react';

export function AddStudentDialog() {
  const [studentId, setStudentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { firestore } = useFirebase();
  const { user: professor } = useUser();
  const { toast } = useToast();

  const handleAdd = async () => {
    if (!studentId || !professor || !firestore) return;
    setLoading(true);

    try {
      // Verificar se o aluno existe
      const studentDoc = await getDoc(doc(firestore, 'users', studentId));
      
      if (!studentDoc.exists()) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "ID de aluno não encontrado.",
        });
        return;
      }

      const studentData = studentDoc.data();
      if (studentData.userType !== 'student') {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Este ID pertence a outro professor.",
        });
        return;
      }

      // Vincular no ACL do professor
      const professorStudentRef = doc(firestore, 'professors', professor.uid, 'students', studentId);
      setDocumentNonBlocking(professorStudentRef, {
        id: studentId,
        name: studentData.name,
        email: studentData.email,
        linkedAt: new Date().toISOString()
      }, { merge: true });

      toast({
        title: "Sucesso!",
        description: `Aluno ${studentData.name} vinculado com sucesso.`,
      });
      setOpen(false);
      setStudentId('');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um problema ao vincular o aluno.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" /> Adicionar Aluno
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vincular Novo Aluno</DialogTitle>
          <DialogDescription>
            Insira o ID único do aluno para ter acesso aos dados e prescrever treinos.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="studentId">ID do Usuário Aluno</Label>
            <Input 
              id="studentId" 
              placeholder="Cole o ID do aluno aqui" 
              value={studentId} 
              onChange={(e) => setStudentId(e.target.value)} 
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleAdd} disabled={loading || !studentId}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Vincular Aluno
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
