'use client';

import { useState, useEffect, useId } from 'react';
import { useUser } from '@/contexts/auth-provider';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Settings, Loader2, Camera, User, Upload } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { fetchApi } from '@/lib/api-client';
import { supabase } from '@/lib/supabase';

interface EditProfileDialogProps {
  profile: any;
}

export function EditProfileDialog({ profile }: EditProfileDialogProps) {
  const [name, setName] = useState(profile?.nome || '');
  const [photoUrl, setPhotoUrl] = useState(profile?.avatar_url || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const nameId = useId();
  const photoId = useId();
  const { user, login, refreshProfile } = useUser();
  const { toast } = useToast();
  const bucketName = process.env.NEXT_PUBLIC_SUPABASE_PROFILE_BUCKET || 'imagens';

  useEffect(() => {
    if (profile) {
      setName(profile.nome || '');
      setPhotoUrl(profile.avatar_url || '');
    }
  }, [profile]);

  const handleFileChange = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Arquivo inválido', description: 'Envie uma imagem em PNG, JPG ou WEBP.' });
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'Imagem muito grande', description: 'Use uma imagem com até 3 MB.' });
      return;
    }
    setSelectedFile(file);
    setPhotoUrl(URL.createObjectURL(file));
  };

  const uploadProfileImage = async () => {
    if (!selectedFile || !user) return photoUrl || undefined;
    if (!supabase) throw new Error('Supabase não está configurado no frontend.');

    const extension = selectedFile.name.split('.').pop()?.toLowerCase() || 'png';
    const safeExtension = ['png', 'jpg', 'jpeg', 'webp'].includes(extension) ? extension : 'png';
    const filePath = `${user.role}/${user.id}/avatar-${Date.now()}.${safeExtension}`;

    const { error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, selectedFile, {
        cacheControl: '3600',
        upsert: true,
        contentType: selectedFile.type,
      });

    if (error) throw error;

    const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleUpdate = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const uploadedPhotoUrl = await uploadProfileImage();
      const endpoint = user.role === 'professor' 
        ? `/users/professores/${user.id}` 
        : `/users/alunos/${user.id}`;

      await fetchApi(endpoint, {
        method: 'PUT',
        data: {
          nome: name,
          ...(uploadedPhotoUrl ? { avatar_url: uploadedPhotoUrl } : {}),
        }
      });

      const updatedUser = { ...user, nome: name, avatar_url: uploadedPhotoUrl || user.avatar_url };
      const token = localStorage.getItem('fitassist_token');
      if (token) login(token, updatedUser);
      await refreshProfile();

      toast({
        title: "Perfil atualizado!",
        description: "Nome e imagem de perfil foram salvos.",
      });
      setSelectedFile(null);
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
          <div className="w-full">
            <Input
              id={photoId}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => handleFileChange(event.target.files?.[0])}
            />
            <Button type="button" variant="outline" className="w-full rounded-xl gap-2" onClick={() => document.getElementById(photoId)?.click()}>
              <Upload className="h-4 w-4" />
              Trocar imagem de perfil
            </Button>
            <p className="mt-2 text-center text-[11px] font-medium text-muted-foreground">
              PNG, JPG ou WEBP até 3 MB.
            </p>
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
