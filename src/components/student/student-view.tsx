'use client';

import { useState, useEffect } from 'react';
import { Dashboard } from '@/components/dashboard';
import { WorkoutSessionForm } from './workout-session-form';
import { AssessmentForm } from '@/components/assessment-form';
import { GoalRecommender } from '@/components/goal-recommender';
import { HealthDiagnostics } from '@/components/health-diagnostics';
import { WorkoutCalendar } from './workout-calendar';
import { LayoutGrid, ClipboardPen, BrainCircuit, HeartPulse, ClipboardCheck, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StudentView() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const navItems = [
    { id: 'dashboard', label: 'Início', icon: LayoutGrid },
    { id: 'calendar', label: 'Calendário', icon: CalendarIcon },
    { id: 'log-workout', label: 'Treinar', icon: ClipboardPen },
    { id: 'assessment', label: 'Avaliação', icon: ClipboardCheck },
    { id: 'health', label: 'Saúde', icon: HeartPulse },
    { id: 'goals', label: 'Metas', icon: BrainCircuit },
  ];

  useEffect(() => {
    const handleTabChange = (event: any) => {
      const targetTab = event.detail;
      if (navItems.some(item => item.id === targetTab)) {
        setActiveTab(targetTab);
      }
    };

    window.addEventListener('app:change-tab', handleTabChange);
    return () => window.removeEventListener('app:change-tab', handleTabChange);
  }, []);

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      <div className="flex-1 pb-24 md:pb-0">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'calendar' && <WorkoutCalendar />}
        {activeTab === 'log-workout' && <WorkoutSessionForm />}
        {activeTab === 'assessment' && <AssessmentForm />}
        {activeTab === 'health' && <HealthDiagnostics />}
        {activeTab === 'goals' && <GoalRecommender />}
      </div>

      {/* Barra de Navegação Mobile - Ajustada para 6 itens */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t flex justify-around items-center h-16 px-1 md:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-0.5 transition-colors relative",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "fill-primary/20")} />
              <span className="text-[9px] font-bold text-center leading-tight">{item.label}</span>
              {isActive && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />}
            </button>
          );
        })}
      </nav>

      {/* Navegação Desktop */}
      <div className="hidden md:block mb-8">
        <div className="flex border-b">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "px-6 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === item.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
