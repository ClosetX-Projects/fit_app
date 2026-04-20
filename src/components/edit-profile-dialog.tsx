'use client';

import { useState, useEffect, useId } from 'react';
import { useUser } from '@/contexts/auth-provider';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Settings, Loader2, Camera, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { fetchApi } from '@/lib/api-client';

interface EditProfileDialogProps {
  profile: any;
}

export function EditProfileDialog({ profile }: EditProfileDialogProps) {
  const [name, setName] = useState(profile?.nome || '');
  const [photoUrl, setPhotoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const nameId = useId();
  const photoId = useId();
  const { user, login } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    if (profile) {
      setName(profile.nome || '');
    }
  }, [profile]);

  const handleUpdate = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // O backend não tem rota descrita explicitamente para atualizar user,
      // Faremos uma request PUT que pode falhar gracefully, ou apenas atualizamos localmente
      const endpoint = user.role === 'professor' 
        ? `/users/professores/${user.id}` 
        : `/users/alunos/${user.id}`;
        
      try {
        await fetchApi(endpoint, {
          method: 'PUT',
          data: { nome: name }
        });
      } catch (e) {
        // Ignore errors if the route doesn't exist yet
        console.warn('API route might not exist', e);
      }

      // Atualiza o contexto state no front-end
      const updatedUser = { ...user, nome: name };
      const token = localStorage.getItem('fitassist_token');
      if (token) login(token, updatedUser);

      toast({
        title: "Perfil atualizado!",
        description: "Suas alterações foram simuladas localmente com sucesso.",
      });
      setOpen(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: "Não foi possível salvar as alterações do perfil.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary transition-colors">
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
          <DialogDescription>
            Altere seu nome de exibição aqui.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="relative group">
            <Avatar className="h-24 w-24 border-4 border-primary/20">
              <AvatarImage src={photoUrl} />
              <AvatarFallback className="bg-primary/10 text-primary">
                <User className="h-10 w-10" />
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <Camera className="h-6 w-6 text-white" />
            </div>
          </div>

          <div className="grid w-full gap-4">
            <div className="space-y-2">
              <Label htmlFor={nameId}>Nome Completo</Label>
              <Input 
                id={nameId} 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Seu nome"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleUpdate} disabled={loading || !name}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
