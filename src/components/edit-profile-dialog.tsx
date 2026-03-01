
'use client';

import { useState, useEffect, useId } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Settings, Loader2, Camera, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface EditProfileDialogProps {
  profile: any;
}

export function EditProfileDialog({ profile }: EditProfileDialogProps) {
  const [name, setName] = useState(profile?.name || '');
  const [photoUrl, setPhotoUrl] = useState(profile?.photoUrl || '');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const nameId = useId();
  const photoId = useId();
  const { firestore, auth } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setPhotoUrl(profile.photoUrl || '');
    }
  }, [profile]);

  const handleUpdate = async () => {
    if (!user || !firestore || !auth.currentUser) return;
    setLoading(true);

    try {
      await updateProfile(auth.currentUser, {
        displayName: name,
        photoURL: photoUrl,
      });

      const userRef = doc(firestore, 'users', user.uid);
      await updateDoc(userRef, {
        name,
        photoUrl,
      });

      toast({
        title: "Perfil atualizado!",
        description: "Suas alterações foram salvas com sucesso.",
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
            Altere seu nome de exibição e sua foto de perfil aqui.
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
            <div className="space-y-2">
              <Label htmlFor={photoId}>URL da Foto de Perfil</Label>
              <Input 
                id={photoId} 
                value={photoUrl} 
                onChange={(e) => setPhotoUrl(e.target.value)} 
                placeholder="https://exemplo.com/foto.jpg"
              />
              <p className="text-[10px] text-muted-foreground italic">
                Dica: Use links do Unsplash ou do Google Fotos.
              </p>
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
