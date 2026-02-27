
"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts"
import type { ChartConfig } from "@/components/ui/chart"
import { Dumbbell, Scale, Target, Loader2, TrendingUp, CalendarDays, AlertCircle, Zap, Clock } from "lucide-react"
import { useFirebase, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, limit, doc } from "firebase/firestore"
import { format, startOfMonth, endOfMonth, differenceInMinutes } from "date-fns"
import { ptBR } from "date-fns/locale"
import { AICoach } from "./ai-coach"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { useToast } from "@/hooks/use-toast"

export function Dashboard() {
  const { user } = useUser()
  const { firestore } = useFirebase()
  const { toast } = useToast()
  const [pendingPseValue, setPendingPseValue] = useState(7)
  const [isPseDialogOpen, setIsPseDialogOpen] = useState(false)

  // 1. Histórico de Peso
  const assessmentsRef = useMemoFirebase(() => 
    user ? query(
      collection(firestore, 'users', user.uid, 'physicalAssessments'),
      orderBy('date', 'asc'),
      limit(20)
    ) : null
  , [firestore, user])
  
  const { data: assessments, isLoading: isAssessmentsLoading } = useCollection(assessmentsRef)

  // 2. Histórico de Sessões
  const sessionsRef = useMemoFirebase(() => 
    user ? collection(firestore, 'users', user.uid, 'workoutHistory_flat') : null
  , [firestore, user])
  
  const { data: rawSessions, isLoading: isSessionsLoading } = useCollection(sessionsRef)

  const sessions = useMemo(() => {
    if (!rawSessions) return [];
    return [...rawSessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [rawSessions]);

  // Verificar PSE Pendente (Sessão recente sem PSE ou com PSE 0)
  const pendingPseSession = useMemo(() => {
    if (!sessions || sessions.length === 0) return null;
    const lastSession = sessions[0];
    const diff = differenceInMinutes(new Date(), new Date(lastSession.date));
    // Se a sessão foi há mais de 15 min e não tem PSE definido
    if (diff >= 15 && (!lastSession.pseSession || lastSession.pseSession === 0)) {
      return lastSession;
    }
    return null;
  }, [sessions]);

  const handleSavePse = () => {
    if (!pendingPseSession || !user) return;
    const sessionRef = doc(firestore, 'users', user.uid, 'workoutHistory_flat', pendingPseSession.id);
    const internalLoad = pendingPseValue * (pendingPseSession.duration || 0);
    
    setDocumentNonBlocking(sessionRef, {
      pseSession: pendingPseValue,
      internalLoad: internalLoad
    }, { merge: true });

    toast({
      title: "PSE Registrada!",
      description: `Carga interna calculada: ${internalLoad}.`,
    });
    setIsPseDialogOpen(false);
  };

  const weightData = useMemo(() => {
    if (!assessments) return []
    return assessments.map(a => ({
      date: format(new Date(a.date), 'dd/MM'),
      weight: a.weight
    }))
  }, [assessments])

  const stats = useMemo(() => {
    if (!sessions || sessions.length === 0) return { total: 0, frequency: 0, lastSession: 'Nenhum', avgLoad: 0 }
    
    const now = new Date()
    const thisMonth = sessions.filter(s => {
      const sDate = new Date(s.date)
      return sDate >= startOfMonth(now) && sDate <= endOfMonth(now)
    })

    const totalLoad = sessions.reduce((acc, curr) => acc + (curr.internalLoad || 0), 0)

    return {
      total: sessions.length,
      frequency: thisMonth.length,
      lastSession: sessions[0] ? format(new Date(sessions[0].date), 'dd/MM') : 'Nenhum',
      avgLoad: Math.round(totalLoad / sessions.length)
    }
  }, [sessions])

  const chartConfig = {
    weight: {
      label: "Peso (kg)",
      color: "hsl(var(--primary))",
    }
  } satisfies ChartConfig

  if (isAssessmentsLoading || isSessionsLoading) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const currentWeight = assessments?.[assessments.length - 1]?.weight || 0
  const lastWeight = assessments?.[assessments.length - 2]?.weight || currentWeight
  const weightDiff = (currentWeight - lastWeight).toFixed(1)

  return (
    <div className="space-y-6">
      {/* Alerta de PSE Pendente */}
      {pendingPseSession && (
        <Alert className="border-primary bg-primary/10 animate-pulse">
          <Clock className="h-4 w-4 text-primary" />
          <AlertTitle className="font-bold text-primary">Ação Necessária</AlertTitle>
          <AlertDescription className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <p className="text-sm">Já se passaram 15 min do seu último treino. Qual foi o nível de esforço (PSE)?</p>
            <Dialog open={isPseDialogOpen} onOpenChange={setIsPseDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="rounded-full font-bold">Responder Agora</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Percepção Subjetiva de Esforço</DialogTitle>
                  <DialogDescription>
                    Em uma escala de 1 a 10, quão intenso foi o treino de {format(new Date(pendingPseSession.date), 'dd/MM')}?
                  </DialogDescription>
                </DialogHeader>
                <div className="py-8 space-y-6">
                   <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Nível de Esforço</span>
                      <span className="text-3xl font-black text-primary">{pendingPseValue}</span>
                   </div>
                   <Slider 
                    value={[pendingPseValue]} 
                    onValueChange={(v) => setPendingPseValue(v[0])} 
                    min={1} 
                    max={10} 
                    step={1} 
                   />
                   <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                      <span>Muito Leve</span>
                      <span>Máximo</span>
                   </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleSavePse} className="w-full rounded-full h-12">Salvar Resposta</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="nubank-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0 mb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Peso Atual</CardTitle>
            <Scale className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-3xl font-black">{currentWeight > 0 ? `${currentWeight} kg` : '--'}</div>
            <p className={`text-[10px] font-bold mt-1 ${Number(weightDiff) <= 0 ? 'text-green-500' : 'text-destructive'}`}>
              {Number(weightDiff) > 0 ? `+${weightDiff}` : weightDiff}kg desde o último registro
            </p>
          </CardContent>
        </Card>
        
        <Card className="nubank-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0 mb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Média de Carga</CardTitle>
            <Zap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-3xl font-black">{stats.avgLoad || '--'}</div>
            <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase">PSE x Duração (Média)</p>
          </CardContent>
        </Card>

        <Card className="nubank-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0 mb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Frequência Mensal</CardTitle>
            <CalendarDays className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-3xl font-black">{stats.frequency}</div>
            <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase">Treinos em {format(new Date(), 'MMMM', { locale: ptBR })}</p>
          </CardContent>
        </Card>

        <Card className="nubank-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0 mb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Último Registro</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-3xl font-black">{stats.lastSession}</div>
            <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase">Dia da última sessão</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card className="h-full border-primary/10 shadow-lg rounded-3xl overflow-hidden">
            <CardHeader className="bg-primary/5">
              <CardTitle className="text-lg font-bold">Evolução de Peso</CardTitle>
              <CardDescription>Acompanhamento histórico das suas avaliações.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {weightData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <LineChart data={weightData} margin={{ left: 12, right: 12, top: 20, bottom: 20 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                    <Line 
                      dataKey="weight" 
                      type="monotone" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={4} 
                      dot={{ r: 6, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "white" }} 
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex flex-col items-center justify-center text-center text-muted-foreground border border-dashed rounded-3xl bg-muted/20">
                  <Scale className="h-12 w-12 mb-4 opacity-20" />
                  <p className="font-medium">Nenhum dado de progresso disponível.</p>
                  <p className="text-xs max-w-xs">Registre avaliações físicas para visualizar seu gráfico.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-1">
          <AICoach 
            recentSessions={sessions.slice(0, 5)} 
            lastAssessment={assessments?.[assessments.length - 1]} 
          />
        </div>
      </div>
    </div>
  )
}
