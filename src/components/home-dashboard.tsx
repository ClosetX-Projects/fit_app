
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

export function HomeDashboard() {
  const { user, isUserLoading } = useUser();
  const { auth, firestore } = useFirebase();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const userAvatar = PlaceHolderImages.find((img) => img.id === 'user-avatar');

  const userProfileRef = useMemoFirebase(() => 
    user ? doc(firestore, 'users', user.uid) : null
  , [firestore, user]);
  
  const { data: profile, isLoading: isProfileLoading } = useDoc(userProfileRef);

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
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-8">
        <Logo />
        <div className="ml-auto flex items-center gap-2 md:gap-4">
          <div className="hidden md:flex flex-col items-end mr-2">
            <p className="text-sm font-medium leading-none mb-1">{profile?.name || user?.displayName}</p>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                {profile?.userType === 'professor' ? 'Professor' : 'Aluno'}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1"
                onClick={handleCopyId}
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                ID: {user?.uid.substring(0, 6)}...
              </Button>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Bell className="h-5 w-5" />
            <span className="sr-only">Notificações</span>
          </Button>
          <Avatar>
            <AvatarImage src={userAvatar?.imageUrl} data-ai-hint={userAvatar?.imageHint} />
            <AvatarFallback>
              <User />
            </AvatarFallback>
          </Avatar>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="h-5 w-5" />
            <span className="sr-only">Sair</span>
          </Button>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-8">
        {profile?.userType === 'professor' ? (
          <ProfessorView />
        ) : (
          <StudentView />
        )}
      </main>
    </div>
  );
}
