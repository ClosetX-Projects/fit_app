
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useFirebase, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Dumbbell, Activity, Smile, Loader2, ChevronRight, Clock } from 'lucide-react';

export function WorkoutCalendar() {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isSessionDetailOpen, setIsSessionDetailOpen] = useState(false);

  // Histórico de Sessões
  const sessionsRef = useMemoFirebase(() => 
    user ? collection(firestore, 'users', user.uid, 'workoutHistory_flat') : null
  , [firestore, user]);
  
  const { data: rawSessions, isLoading: isSessionsLoading } = useCollection(sessionsRef);

  // Histórico de Exercícios para detalhes
  const exercisesRef = useMemoFirebase(() => 
    user ? collection(firestore, 'users', user.uid, 'exerciseHistory_flat') : null
  , [firestore, user]);
  const { data: allExercises } = useCollection(exercisesRef);

  const sessions = useMemo(() => {
    if (!rawSessions) return [];
    return [...rawSessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [rawSessions]);

  // Dias com treino para o calendário
  const workoutDays = useMemo(() => {
    return sessions.map(s => new Date(s.date));
  }, [sessions]);

  // Sessões do dia selecionado
  const selectedDaySessions = useMemo(() => {
    if (!selectedDate || !sessions) return [];
    return sessions.filter(s => isSameDay(new Date(s.date), selectedDate));
  }, [selectedDate, sessions]);

  if (isSessionsLoading) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-3xl font-black text-primary uppercase tracking-tighter">Histórico de Treinos</h2>
          <p className="text-muted-foreground font-medium">Visualize sua constância e performance.</p>
        </div>
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <CalendarIcon className="h-6 w-6 text-primary" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-12 border-primary/10 shadow-xl rounded-[2.5rem] overflow-hidden bg-card">
          <CardHeader className="bg-primary/5 p-8 border-b">
            <CardTitle className="text-lg font-black flex items-center gap-2 uppercase">
              <CalendarIcon className="h-5 w-5 text-primary" /> Assiduidade Mensal
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start justify-center">
              {/* Container do Calendário Centralizado */}
              <div className="w-full lg:w-fit p-6 bg-muted/20 rounded-[2rem] border-2 border-primary/5 flex flex-col items-center justify-center shadow-inner">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    if (date && workoutDays.some(wd => isSameDay(wd, date))) {
                      setIsSessionDetailOpen(true);
                    }
                  }}
                  locale={ptBR}
                  className="rounded-md"
                  modifiers={{
                    workout: workoutDays
                  }}
                  modifiersClassNames={{
                    workout: "bg-primary text-primary-foreground rounded-full font-bold"
                  }}
                />
                <div className="mt-4 flex items-center justify-center gap-3 text-[10px] font-black text-muted-foreground uppercase px-4 py-2 bg-background/50 rounded-full border border-primary/10">
                  <div className="h-3 w-3 rounded-full bg-primary shadow-sm" />
                  <span>Treino Realizado</span>
                </div>
              </div>

              {/* Lista Lateral de Sessões Recentes */}
              <div className="flex-1 space-y-4 w-full max-w-md">
                <h3 className="text-sm font-black uppercase text-primary tracking-widest border-b border-primary/10 pb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4" /> Atividade Recente
                </h3>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {sessions && sessions.length > 0 ? (
                      sessions.map((session) => (
                        <div 
                          key={session.id} 
                          onClick={() => {
                            setSelectedDate(new Date(session.date));
                            setIsSessionDetailOpen(true);
                          }}
                          className={`nubank-card cursor-pointer group flex items-center justify-between py-5 px-6 hover:border-primary/40 transition-all ${isSameDay(new Date(session.date), selectedDate || new Date()) ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : ''}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex flex-col items-center justify-center border border-primary/5">
                              <span className="text-sm font-black text-primary">{format(new Date(session.date), 'dd')}</span>
                              <span className="text-[8px] font-bold text-primary uppercase">{format(new Date(session.date), 'MMM', { locale: ptBR })}</span>
                            </div>
                            <div>
                              <p className="font-black text-sm group-hover:text-primary transition-colors">Sessão de Treino</p>
                              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tight">{session.duration} min | PSE {session.pseSession || '--'}</p>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </div>
                      ))
                    ) : (
                      <div className="py-16 text-center text-muted-foreground italic border-2 border-dashed rounded-[2rem] bg-muted/10">
                        Nenhum treino registrado ainda.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detalhes do Treino */}
      <Dialog open={isSessionDetailOpen} onOpenChange={setIsSessionDetailOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-primary/20 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-primary uppercase tracking-tighter flex items-center gap-2">
              <Dumbbell className="h-6 w-6" /> Detalhes da Sessão
            </DialogTitle>
            <DialogDescription className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">
              {selectedDate && format(selectedDate, "eeee, d 'de' MMMM", { locale: ptBR })}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6 py-4">
              {selectedDaySessions.length > 0 ? selectedDaySessions.map((session) => (
                <div key={session.id} className="space-y-6 pb-6 border-b last:border-0 border-primary/10">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-primary/5 p-4 rounded-3xl border border-primary/10 shadow-sm">
                      <p className="text-[10px] font-black uppercase text-primary mb-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Duração
                      </p>
                      <p className="text-xl font-black">{session.duration} min</p>
                    </div>
                    <div className="bg-primary/5 p-4 rounded-3xl border border-primary/10 shadow-sm">
                      <p className="text-[10px] font-black uppercase text-primary mb-1 flex items-center gap-1">
                        <Activity className="h-3 w-3" /> Carga Interna
                      </p>
                      <p className="text-xl font-black">{session.internalLoad || '--'}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2 mb-2">
                      Exercícios Realizados
                    </h4>
                    <div className="grid gap-3">
                      {allExercises && allExercises.filter(ex => ex.workoutSessionId === session.id).map(ex => (
                        <div key={ex.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-primary/5">
                          <div>
                            <p className="text-sm font-bold">{ex.name}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tight">{ex.sets}x {ex.reps} | {ex.weight}kg</p>
                          </div>
                          <Badge variant="outline" className="h-7 text-[10px] font-black uppercase tracking-tighter border-primary/30 text-primary bg-primary/5 px-3">
                            PSE {ex.pseExercise}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground italic bg-secondary/20 p-4 rounded-2xl border border-primary/5">
                    <div className="h-8 w-8 rounded-full bg-white/50 flex items-center justify-center shadow-inner">
                       <Smile className="h-5 w-5 text-yellow-500" />
                    </div>
                    <span>Sensação pós-treino: <strong>{session.pleasureScale}</strong> (escala de -5 a +5)</span>
                  </div>
                </div>
              )) : (
                <div className="py-16 text-center text-muted-foreground italic bg-muted/10 rounded-3xl">
                  Nenhum registro detalhado para este dia.
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
