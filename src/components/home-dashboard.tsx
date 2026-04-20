'use client';

import { useUser } from '@/contexts/auth-provider';
import { ProfessorView } from '@/components/professor/professor-view';
import { StudentView } from '@/components/student/student-view';
import { Logo } from '@/components/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { User as UserIcon, LogOut, Loader2, Copy, Check } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { EditProfileDialog } from '@/components/edit-profile-dialog';
import { NotificationsDropdown } from '@/components/notifications-dropdown';

export function HomeDashboard() {
  const { user, isUserLoading, logout } = useUser();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const userAvatarPlaceholder = PlaceHolderImages.find((img) => img.id === 'user-avatar');

  const isProfessor = user?.role === 'professor';

  const handleSignOut = () => {
    logout();
  };

  const handleCopyId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopied(true);
      toast({
        title: 'ID Copiado!',
        description: 'Seu ID único foi copiado para a área de transferência.',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // O Backend ainda não envia foto, então usamos o placeholder
  const currentPhotoUrl = userAvatarPlaceholder?.imageUrl;

  return (
    <div className="flex min-h-screen w-full flex-col bg-background selection:bg-primary/30">
      {/* Header Adaptativo */}
      <header className={cn(
        "sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-md md:px-8",
        !isProfessor && "md:h-20" // Header maior para alunos no desktop
      )}>
        <Logo className={cn(!isProfessor && "md:scale-110 origin-left")} />
        
        <div className="ml-auto flex items-center gap-2 md:gap-4">
          <div className="hidden md:flex flex-col items-end mr-2">
            <p className="text-sm font-semibold leading-none mb-1">{user?.nome}</p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                {isProfessor ? 'Professor' : 'Aluno'}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1"
                onClick={handleCopyId}
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                ID: {user?.id?.substring(0, 6)}
              </Button>
            </div>
          </div>

          <NotificationsDropdown />
          
          <Avatar className="h-9 w-9 border-2 border-primary/20">
            <AvatarImage src={currentPhotoUrl} />
            <AvatarFallback className="bg-primary/10 text-primary">
              <UserIcon className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>

          <div className="flex items-center gap-1">
            <EditProfileDialog profile={user} />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className={cn(
        "flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full",
        !isProfessor && "pb-24 md:pb-12" // Espaço para a barra inferior no mobile
      )}>
        {isProfessor ? (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <ProfessorView />
          </div>
        ) : (
          <div className="animate-in fade-in zoom-in-95 duration-500">
            <StudentView />
          </div>
        )}
      </main>
    </div>
  );
}
