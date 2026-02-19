
'use client';

import { useUser, useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { ProfessorView } from '@/components/professor/professor-view';
import { StudentView } from '@/components/student/student-view';
import { Logo } from '@/components/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { User, LogOut, Bell, Loader2, Copy, Check } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { EditProfileDialog } from '@/components/edit-profile-dialog';

export function HomeDashboard() {
  const { user, isUserLoading } = useUser();
  const { auth, firestore } = useFirebase();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const userAvatarPlaceholder = PlaceHolderImages.find((img) => img.id === 'user-avatar');

  const userProfileRef = useMemoFirebase(() => 
    user ? doc(firestore, 'users', user.uid) : null
  , [firestore, user]);
  
  const { data: profile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const isProfessor = profile?.userType === 'professor';

  const handleSignOut = () => {
    signOut(auth);
  };

  const handleCopyId = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      setCopied(true);
      toast({
        title: 'ID Copiado!',
        description: 'Seu ID único foi copiado para a área de transferência.',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const currentPhotoUrl = profile?.photoUrl || user?.photoURL || userAvatarPlaceholder?.imageUrl;

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
            <p className="text-sm font-semibold leading-none mb-1">{profile?.name || user?.displayName}</p>
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
                ID: {user?.uid.substring(0, 6)}
              </Button>
            </div>
          </div>

          <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 hover:text-primary transition-colors">
            <Bell className="h-5 w-5" />
          </Button>
          
          <Avatar className="h-9 w-9 border-2 border-primary/20">
            <AvatarImage src={currentPhotoUrl} />
            <AvatarFallback className="bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>

          <div className="flex items-center gap-1">
            <EditProfileDialog profile={profile} />
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
