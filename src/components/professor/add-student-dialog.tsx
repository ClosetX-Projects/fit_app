
'use client';

import { useState } from 'react';
import { useUser, useFirebase } from '@/firebase';
import { doc, collection, setDoc, serverTimestamp } from 'firebase/firestore';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Link as LinkIcon, Copy, Check, UserPlus, UserCheck, Loader2, Mail } from 'lucide-react';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export function AddStudentDialog() {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user: professor } = useUser();
  const { firestore } = useFirebase();
  const { toast } = useToast();

  // Estados para Cadastro Manual
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');

  const inviteLink = typeof window !== 'undefined' 
    ? `${window.location.origin}/signup?role=student&invitedBy=${professor?.uid}`
    : '';

  const handleCopy = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast({
      title: "Link Copiado!",
      description: "Envie este link para seu aluno realizar o cadastro.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!professor || !firestore || !studentName || !studentEmail) return;

    setLoading(true);
    try {
      // 1. Gerar um ID temporário para o aluno (já que não temos o UID do Auth ainda)
      // Usaremos um ID aleatório para o documento do usuário
      const studentId = doc(collection(firestore, 'users')).id;

      // 2. Criar perfil básico do aluno
      const userRef = doc(firestore, 'users', studentId);
      setDocumentNonBlocking(userRef, {
        id: studentId,
        name: studentName,
        email: studentEmail.toLowerCase().trim(),
        userType: 'student',
        createdAt: new Date().toISOString(),
        createdBy: professor.uid,
      }, { merge: true });

      // 3. Vincular ao professor
      const linkRef = doc(firestore, 'professors', professor.uid, 'students', studentId);
      setDocumentNonBlocking(linkRef, {
        id: studentId,
        name: studentName,
        email: studentEmail.toLowerCase().trim(),
        linkedAt: new Date().toISOString(),
      }, { merge: true });

      toast({
        title: "Aluno Cadastrado!",
        description: `${studentName} foi adicionado à sua lista com sucesso.`,
      });

      setStudentName('');
      setStudentEmail('');
      setOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao cadastrar",
        description: "Não foi possível realizar o cadastro manual no momento.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2 rounded-full px-6 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
          <UserPlus className="h-4 w-4" /> Adicionar Aluno
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Aluno</DialogTitle>
          <DialogDescription>
            Escolha como deseja adicionar seu novo aluno à plataforma.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="invite" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-auto p-1 bg-muted rounded-2xl mb-6">
            <TabsTrigger value="invite" className="rounded-xl py-2 text-xs font-bold uppercase gap-2">
              <LinkIcon className="h-3 w-3" /> Link de Convite
            </TabsTrigger>
            <TabsTrigger value="manual" className="rounded-xl py-2 text-xs font-bold uppercase gap-2">
              <UserCheck className="h-3 w-3" /> Cadastro Direto
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invite" className="space-y-4 animate-in fade-in duration-300">
            <div className="space-y-2">
              <Label>Link de Convite Exclusivo</Label>
              <div className="flex items-center gap-2">
                <Input 
                  readOnly 
                  value={inviteLink} 
                  className="bg-muted font-mono text-[10px]"
                />
                <Button size="icon" onClick={handleCopy} className="shrink-0">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-3">
              <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-[11px] text-muted-foreground leading-tight">
                Envie este link para que o aluno preencha seus próprios dados de acesso e se vincule a você automaticamente.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4 animate-in fade-in duration-300">
            <form onSubmit={handleManualRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="manual-name">Nome do Aluno</Label>
                <Input 
                  id="manual-name" 
                  placeholder="Nome completo" 
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manual-email">E-mail</Label>
                <Input 
                  id="manual-email" 
                  type="email" 
                  placeholder="aluno@email.com" 
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  required
                />
              </div>
              <div className="p-4 bg-accent/5 rounded-2xl border border-accent/10 flex items-start gap-3">
                <Mail className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Ao cadastrar manualmente, você já pode começar a prescrever treinos. O aluno poderá "reivindicar" esta conta depois ao se cadastrar com o mesmo e-mail.
                </p>
              </div>
              <Button type="submit" className="w-full h-12 rounded-xl font-bold" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserCheck className="h-4 w-4 mr-2" />}
                Cadastrar Aluno Agora
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="ghost" className="w-full rounded-full" onClick={() => setOpen(false)}>Cancelar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Info({ className, ...props }: React.ComponentProps<typeof LinkIcon>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}
