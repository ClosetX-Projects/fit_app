
'use client';

import { useState } from 'react';
import { useUser } from '@/firebase';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Link, Copy, Check, UserPlus } from 'lucide-react';

export function AddStudentDialog() {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const { user: professor } = useUser();
  const { toast } = useToast();

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2 rounded-full px-6 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
          <UserPlus className="h-4 w-4" /> Adicionar Aluno
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convidar Novo Aluno</DialogTitle>
          <DialogDescription>
            Copie o link abaixo e envie para o seu aluno. Ao se cadastrar por este link, ele será vinculado automaticamente a você.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-4 py-4">
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
            <Link className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-[11px] text-muted-foreground leading-tight">
              Apenas alunos que usarem este link específico serão vinculados à sua conta automaticamente após o cadastro.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="w-full rounded-full" onClick={() => setOpen(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
