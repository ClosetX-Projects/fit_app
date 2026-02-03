"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts"
import type { ChartConfig } from "@/components/ui/chart"
import { Dumbbell, Scale, Target, Loader2, TrendingUp, CalendarDays } from "lucide-react"
import { useFirebase, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, limit } from "firebase/firestore"
import { format, startOfMonth, endOfMonth } from "date-fns"
import { AICoach } from "./ai-coach"

export function Dashboard() {
  const { user } = useUser()
  const { firestore } = useFirebase()

  // 1. Histórico de Peso
  const assessmentsRef = useMemoFirebase(() => 
    user ? query(
      collection(firestore, 'users', user.uid, 'physicalAssessments'),
      orderBy('date', 'asc'),
      limit(20)
    ) : null
  , [firestore, user])
  
  const { data: assessments, isLoading: isAssessmentsLoading } = useCollection(assessmentsRef)

  // 2. Histórico de Sessões (Coleção Plana)
  const sessionsRef = useMemoFirebase(() => 
    user ? collection(firestore, 'users', user.uid, 'workoutHistory_flat') : null
  , [firestore, user])
  
  const { data: rawSessions, isLoading: isSessionsLoading } = useCollection(sessionsRef)

  const sessions = useMemo(() => {
    if (!rawSessions) return [];
    return [...rawSessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [rawSessions]);

  const weightData = useMemo(() => {
    if (!assessments) return []
    return assessments.map(a => ({
      date: format(new Date(a.date), 'dd/MM'),
      weight: a.weight
    }))
  }, [assessments])

  const stats = useMemo(() => {
    if (!sessions || sessions.length === 0) return { total: 0, frequency: 0, lastSession: 'Nenhum' }
    
    const now = new Date()
    const thisMonth = sessions.filter(s => {
      const sDate = new Date(s.date)
      return sDate >= startOfMonth(now) && sDate <= endOfMonth(now)
    })

    return {
      total: sessions.length,
      frequency: thisMonth.length,
      lastSession: sessions[0] ? format(new Date(sessions[0].date), 'dd/MM') : 'Nenhum'
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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider">Peso Atual</CardTitle>
            <Scale className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentWeight > 0 ? `${currentWeight} kg` : '--'}</div>
            <p className={`text-[10px] font-bold ${Number(weightDiff) <= 0 ? 'text-green-500' : 'text-destructive'}`}>
              {Number(weightDiff) > 0 ? `+${weightDiff}` : weightDiff}kg desde o último registro
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider">Treinos no Mês</CardTitle>
            <CalendarDays className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.frequency}</div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Sessões em {format(new Date(), 'MMMM')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider">Total de Sessões</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Desde o início</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wider">Último Treino</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lastSession}</div>
            <p className="text-[10px] text-muted-foreground uppercase font-bold">Data do registro</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Evolução de Peso Corporal</CardTitle>
              <CardDescription>Gráfico baseado em suas avaliações físicas reais.</CardDescription>
            </CardHeader>
            <CardContent>
              {weightData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <LineChart data={weightData} margin={{ left: 12, right: 12, top: 20, bottom: 20 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis hide domain={['dataMin - 5', 'dataMax + 5']} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                    <Line 
                      dataKey="weight" 
                      type="monotone" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: "hsl(var(--primary))" }} 
                    />
                  </LineChart>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex flex-col items-center justify-center text-center text-muted-foreground border border-dashed rounded-lg bg-muted/20">
                  <Scale className="h-12 w-12 mb-4 opacity-20" />
                  <p className="font-medium">Nenhum dado de progresso disponível.</p>
                  <p className="text-xs max-w-xs">Registre avaliações físicas para visualizar seu gráfico de peso.</p>
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
