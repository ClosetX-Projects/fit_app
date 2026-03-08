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
    <div className="max-w-4xl mx-auto space-y-6">
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
        {/* Calendário Full Width */}
        <Card className="lg:col-span-12 border-primary/10 shadow-xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="bg-primary/5 p-8 border-b">
            <CardTitle className="text-lg font-black flex items-center gap-2 uppercase">
              <CalendarIcon className="h-5 w-5 text-primary" /> Assiduidade Mensal
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="w-full md:w-auto p-4 bg-muted/30 rounded-3xl border">
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
                  className="mx-auto"
                  modifiers={{
                    workout: workoutDays
                  }}
                  modifiersStyles={{
                    workout: { backgroundColor: 'hsl(var(--primary))', color: 'white', borderRadius: '50%', fontWeight: 'bold' }
                  }}
                />
                <div className="mt-6 flex items-center justify-center gap-3 text-[10px] font-black text-muted-foreground uppercase px-2">
                  <div className="h-3 w-3 rounded-full bg-primary" />
                  <span>Treino Realizado</span>
                </div>
              </div>

              <div className="flex-1 space-y-4 w-full">
                <h3 className="text-sm font-black uppercase text-primary tracking-widest border-b pb-2">
                  Atividade em {selectedDate ? format(selectedDate, 'MMMM yyyy', { locale: ptBR }) : '...'}
                </h3>
                <ScrollArea className="h-[350px] pr-4">
                  <div className="space-y-3">
                    {sessions && sessions.length > 0 ? (
                      sessions.map((session) => (
                        <div 
                          key={session.id} 
                          onClick={() => {
                            setSelectedDate(new Date(session.date));
                            setIsSessionDetailOpen(true);
                          }}
                          className={`nubank-card cursor-pointer group flex items-center justify-between py-4 hover:border-primary/40 ${isSameDay(new Date(session.date), selectedDate || new Date()) ? 'border-primary bg-primary/5' : ''}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex flex-col items-center justify-center">
                              <span className="text-xs font-black text-primary">{format(new Date(session.date), 'dd')}</span>
                              <span className="text-[8px] font-bold text-primary uppercase">{format(new Date(session.date), 'MMM', { locale: ptBR })}</span>
                            </div>
                            <div>
                              <p className="font-bold text-sm">Sessão de Treino</p>
                              <p className="text-[10px] text-muted-foreground uppercase font-black">{session.duration} min | PSE {session.pseSession || '--'}</p>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-all" />
                        </div>
                      ))
                    ) : (
                      <div className="py-12 text-center text-muted-foreground italic border-2 border-dashed rounded-3xl">
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

      {/* Detalhes do Treino - Mantendo o Modal para UX Mobile-First */}
      <Dialog open={isSessionDetailOpen} onOpenChange={setIsSessionDetailOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-primary uppercase tracking-tighter flex items-center gap-2">
              <Dumbbell className="h-6 w-6" /> Detalhes da Sessão
            </DialogTitle>
            <DialogDescription className="font-bold">
              {selectedDate && format(selectedDate, "eeee, d 'de' MMMM", { locale: ptBR })}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6 py-4">
              {selectedDaySessions.length > 0 ? selectedDaySessions.map((session) => (
                <div key={session.id} className="space-y-4 pb-6 border-b last:border-0 border-primary/10">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-primary/5 p-3 rounded-2xl border border-primary/10">
                      <p className="text-[10px] font-black uppercase text-primary mb-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Duração
                      </p>
                      <p className="text-lg font-black">{session.duration} min</p>
                    </div>
                    <div className="bg-primary/5 p-3 rounded-2xl border border-primary/10">
                      <p className="text-[10px] font-black uppercase text-primary mb-1 flex items-center gap-1">
                        <Activity className="h-3 w-3" /> Carga Interna
                      </p>
                      <p className="text-lg font-black">{session.internalLoad || '--'}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2">
                      Exercícios Realizados
                    </h4>
                    <div className="grid gap-2">
                      {allExercises && allExercises.filter(ex => ex.workoutSessionId === session.id).map(ex => (
                        <div key={ex.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl border">
                          <div>
                            <p className="text-sm font-bold">{ex.name}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-black">{ex.sets}x {ex.reps} | {ex.weight}kg</p>
                          </div>
                          <Badge variant="outline" className="h-6 text-[10px] font-bold border-primary/20 text-primary">
                            PSE {ex.pseExercise}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground italic bg-secondary/20 p-3 rounded-xl">
                    <Smile className="h-4 w-4 text-yellow-500" />
                    <span>Sensação pós-treino: <strong>{session.pleasureScale}</strong> (escala de -5 a +5)</span>
                  </div>
                </div>
              )) : (
                <div className="py-12 text-center text-muted-foreground italic">
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