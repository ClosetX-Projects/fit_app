
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dashboard } from '@/components/dashboard';
import { WorkoutSessionForm } from './workout-session-form';
import { AssessmentForm } from '@/components/assessment-form';
import { GoalRecommender } from '@/components/goal-recommender';
import { LayoutGrid, ClipboardPen, BrainCircuit, UserCog } from 'lucide-react';

export function StudentView() {
  return (
    <Tabs defaultValue="dashboard" className="w-full">
      <TabsList className="grid h-auto w-full grid-cols-2 md:grid-cols-4">
        <TabsTrigger value="dashboard">
          <LayoutGrid className="mr-2 h-4 w-4" />
          Painel
        </TabsTrigger>
        <TabsTrigger value="log-workout">
          <ClipboardPen className="mr-2 h-4 w-4" />
          Log de Treino
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
        <WorkoutSessionForm />
      </TabsContent>
      <TabsContent value="assessment">
        <AssessmentForm />
      </TabsContent>
      <TabsContent value="goals">
        <GoalRecommender />
      </TabsContent>
    </Tabs>
  );
}
