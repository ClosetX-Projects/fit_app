'use client';

import { useUser } from '@/contexts/auth-provider';
import { ProfessorView } from '@/components/professor/professor-view';
import { StudentView } from '@/components/student/student-view';
import { Logo } from '@/components/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { User as UserIcon, LogOut, Loader2, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { EditProfileDialog } from '@/components/edit-profile-dialog';
import { NotificationsDropdown } from '@/components/notifications-dropdown';

export function HomeDashboard() {
  const { user, isUserLoading, logout } = useUser();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

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

  const currentPhotoUrl = user?.avatar_url || '';
  const roleLabel = isProfessor ? 'Professor' : 'Aluno';

  return (
    <div className="flex min-h-screen w-full flex-col bg-background selection:bg-primary/30">
      <header className="sticky top-0 z-40 border-b bg-background/90 px-3 py-3 backdrop-blur-md md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3 md:gap-5">
            <Logo className="hidden shrink-0 sm:flex" />

            <div className="flex min-w-0 items-center gap-3 rounded-3xl border border-primary/10 bg-card/90 px-3 py-2 shadow-sm md:px-4">
              <Avatar className="h-12 w-12 shrink-0 border-2 border-primary/20 md:h-14 md:w-14">
                <AvatarImage src={currentPhotoUrl} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  <UserIcon className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <p className="truncate text-base font-black leading-tight text-foreground md:text-lg">{user?.nome || 'Perfil'}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-primary">
                    {roleLabel}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hidden h-6 px-2 text-[10px] font-bold text-muted-foreground hover:text-primary md:inline-flex"
                    onClick={handleCopyId}
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    ID {user?.id?.substring(0, 6)}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 md:gap-2">
            <NotificationsDropdown />
            <EditProfileDialog profile={user} />
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="h-11 rounded-full border-destructive/20 px-3 font-black text-destructive hover:bg-destructive/10 md:px-5"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
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
