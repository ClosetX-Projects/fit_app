'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Logo } from '@/components/icons';
import { Dashboard } from '@/components/dashboard';
import { LogWorkoutForm } from '@/components/log-workout-form';
import { AssessmentForm } from '@/components/assessment-form';
import { GoalRecommender } from '@/components/goal-recommender';
import { Bell, User, LayoutGrid, ClipboardPen, BrainCircuit, UserCog, LogOut } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useFirebase } from '@/firebase';
import { getAuth, signOut } from 'firebase/auth';

export function HomeDashboard() {
  const userAvatar = PlaceHolderImages.find((img) => img.id === 'user-avatar');
  const { auth } = useFirebase();

  const handleSignOut = () => {
    signOut(auth);
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-8">
        <Logo />
        <div className="ml-auto flex items-center gap-2 md:gap-4">
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
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="dashboard">
              <LayoutGrid className="mr-2 h-4 w-4" />
              Painel
            </TabsTrigger>
            <TabsTrigger value="log-workout">
              <ClipboardPen className="mr-2 h-4 w-4" />
              Registrar Treino
            </TabsTrigger>
            <TabsTrigger value="assessment">
              <UserCog className="mr-2 h-4 w-4" />
              Avaliação
            </TabsTrigger>
            <TabsTrigger value="goals">
              <BrainCircuit className="mr-2 h-4 w-4" />
              Metas (IA)
            </TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard">
            <Dashboard />
          </TabsContent>
          <TabsContent value="log-workout">
            <LogWorkoutForm />
          </TabsContent>
          <TabsContent value="assessment">
            <AssessmentForm />
          </TabsContent>
          <TabsContent value="goals">
            <GoalRecommender />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
