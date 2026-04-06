"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useFirebase, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection } from "firebase/firestore"
import { format, isSameDay } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Calendar as CalendarIcon, Dumbbell, Activity, Smile, Loader2, ChevronRight, Clock, Zap } from "lucide-react"
import { FEELING_SCALE_MESSAGES } from "@/lib/constants"

export function WorkoutCalendar() {
  const { user } = useUser()
  const { firestore } = useFirebase()
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [isSessionDetailOpen, setIsSessionDetailOpen] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

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

  if (!isClient || isSessionsLoading) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-4xl font-black text-primary uppercase tracking-tighter">Histórico</h2>
          <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-widest">Sua constância e performance</p>
        </div>
        <div className="h-14 w-14 rounded-[1.5rem] bg-accent flex items-center justify-center shadow-lg shadow-accent/20">
          <CalendarIcon className="h-6 w-6 text-accent-foreground" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <Card className="lg:col-span-12 border-primary/10 shadow-2xl rounded-[3rem] overflow-hidden bg-card">
          <CardHeader className="bg-primary/5 p-8 border-b border-primary/10">
            <CardTitle className="text-sm font-black flex items-center gap-2 uppercase tracking-widest text-primary">
              <Activity className="h-4 w-4" /> Assiduidade Mensal
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="flex flex-col lg:flex-row gap-12 items-center lg:items-start justify-center">
              {/* Container do Calendário Centralizado */}
              <div className="w-full lg:w-fit p-4 bg-secondary/20 rounded-[2.5rem] border border-primary/5 flex flex-col items-center justify-center shadow-inner">
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
                    workout: "bg-primary text-primary-foreground rounded-full font-black ring-4 ring-primary/10"
                  }}
                />
                <div className="mt-6 flex items-center justify-center gap-4 text-[10px] font-black text-muted-foreground uppercase px-6 py-3 bg-background/50 rounded-full border border-primary/10">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-primary shadow-sm" />
                    <span>Treino</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full border-2 border-accent shadow-sm" />
                    <span>Hoje</span>
                  </div>
                </div>
              </div>

              {/* Lista Lateral de Sessões Recentes */}
              <div className="flex-1 space-y-6 w-full max-w-md">
                <h3 className="text-xs font-black uppercase text-primary tracking-widest border-b border-primary/10 pb-3 flex items-center gap-2">
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
                          className={`nubank-card cursor-pointer group flex items-center justify-between py-5 px-6 hover:border-accent/50 transition-all ${isSameDay(new Date(session.date), selectedDate || new Date()) ? 'border-accent bg-accent/5' : ''}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-primary flex flex-col items-center justify-center shadow-md">
                              <span className="text-sm font-black text-white">{format(new Date(session.date), 'dd')}</span>
                              <span className="text-[8px] font-bold text-white uppercase">{format(new Date(session.date), 'MMM', { locale: ptBR })}</span>
                            </div>
                            <div>
                              <p className="font-black text-sm group-hover:text-primary transition-colors">Sessão de Treino</p>
                              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tight">{session.duration} min | {session.caloriesBurned || 0} kcal</p>
                            </div>
                          </div>
                          <div className="h-10 w-10 rounded-full flex items-center justify-center group-hover:bg-accent/20 transition-all">
                            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-20 text-center text-muted-foreground italic border-2 border-dashed rounded-[3rem] bg-muted/10">
                        <Dumbbell className="h-12 w-12 mx-auto mb-4 opacity-10" />
                        <p className="text-xs font-black uppercase tracking-widest">Nenhum treino registrado</p>
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
        <DialogContent className="sm:max-w-[500px] rounded-[3rem] border-primary/20 shadow-2xl p-0 overflow-hidden">
          <div className="bg-primary p-8 text-white">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
                <Dumbbell className="h-8 w-8 text-accent" /> PERFORMANCE
              </DialogTitle>
              <DialogDescription className="font-black uppercase text-[11px] tracking-[0.2em] text-white/80">
                {selectedDate && format(selectedDate, "eeee, d 'de' MMMM", { locale: ptBR })}
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <ScrollArea className="max-h-[60vh] p-8">
            <div className="space-y-8">
              {selectedDaySessions.length > 0 ? selectedDaySessions.map((session) => (
                <div key={session.id} className="space-y-8">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-secondary/20 p-6 rounded-[2rem] border border-primary/5 shadow-sm text-center">
                      <p className="text-[10px] font-black uppercase text-primary mb-2 flex items-center justify-center gap-1">
                        <Clock className="h-3 w-3" /> Duração
                      </p>
                      <p className="text-3xl font-black">{session.duration}<span className="text-xs ml-1">min</span></p>
                    </div>
                    <div className="bg-accent/10 p-6 rounded-[2rem] border border-accent/10 shadow-sm text-center">
                      <p className="text-[10px] font-black uppercase text-accent mb-2 flex items-center justify-center gap-1">
                        <Zap className="h-3 w-3" /> Gasto Calórico
                      </p>
                      <p className="text-3xl font-black">{session.caloriesBurned || 0}<span className="text-xs ml-1">kcal</span></p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" /> Exercícios Realizados
                    </h4>
                    <div className="grid gap-4">
                      {allExercises && allExercises.filter(ex => ex.workoutSessionId === session.id).map(ex => (
                        <div key={ex.id} className="flex items-center justify-between p-5 bg-card rounded-[1.5rem] border border-primary/5 shadow-sm hover:border-accent/30 transition-colors">
                          <div>
                            <p className="text-sm font-black text-foreground">{ex.name}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tight">{ex.sets}x {ex.reps} | {ex.weight}kg</p>
                          </div>
                          <Badge className="h-8 text-[11px] font-black uppercase tracking-tighter bg-accent text-accent-foreground border-none px-4 rounded-full">
                            PSE {ex.pseExercise}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 text-xs font-bold text-primary/80 bg-accent/5 p-6 rounded-[2rem] border border-accent/20">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center shadow-md shrink-0">
                         <Smile className="h-6 w-6 text-accent" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase block opacity-60">Escala de Feeling (Sensação)</span>
                        <span className="text-xl font-black uppercase italic text-primary">{FEELING_SCALE_MESSAGES[session.pleasureScale || 0]}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="py-16 text-center text-muted-foreground italic bg-muted/10 rounded-[2rem]">
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
