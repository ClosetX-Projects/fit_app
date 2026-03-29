
"use client"

import { useMemo, useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Bar, BarChart, Area, AreaChart } from "recharts"
import type { ChartConfig } from "@/components/ui/chart"
import { Dumbbell, Scale, Loader2, TrendingUp, CalendarDays, Zap, Clock, Activity, LayoutGrid, Flame } from "lucide-react"
import { useFirebase, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, limit, doc } from "firebase/firestore"
import { format, startOfMonth, endOfMonth, differenceInMinutes } from "date-fns"
import { ptBR } from "date-fns/locale"
import { AICoach } from "./ai-coach"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { useToast } from "@/hooks/use-toast"
import { EXERCISE_METADATA } from "@/lib/constants"

const chartConfig = {
  value: {
    label: "Volume",
    color: "hsl(var(--primary))",
  },
  load: {
    label: "Carga",
    color: "hsl(var(--accent))",
  },
} satisfies ChartConfig

export function Dashboard() {
  const { user } = useUser()
  const { firestore } = useFirebase()
  const { toast } = useToast()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const assessmentsRef = useMemoFirebase(() => 
    user ? query(collection(firestore, 'users', user.uid, 'physicalAssessments'), orderBy('date', 'asc'), limit(20)) : null
  , [firestore, user])
  const { data: assessments, isLoading: isAssessmentsLoading } = useCollection(assessmentsRef)

  const sessionsRef = useMemoFirebase(() => 
    user ? collection(firestore, 'users', user.uid, 'workoutHistory_flat') : null
  , [firestore, user])
  const { data: rawSessions, isLoading: isSessionsLoading } = useCollection(sessionsRef)

  const exercisesRef = useMemoFirebase(() => 
    user ? collection(firestore, 'users', user.uid, 'exerciseHistory_flat') : null
  , [firestore, user]);
  const { data: rawExercises, isLoading: isExercisesLoading } = useCollection(exercisesRef);

  const stats = useMemo(() => {
    if (!isClient || !rawSessions || rawSessions.length === 0) return { total: 0, frequency: 0, lastSession: 'Nenhum', avgLoad: 0, totalReps: 0, totalSeries: 0, totalKcal: 0 }
    
    const now = new Date()
    const startOfCurrentMonth = startOfMonth(now)
    const thisMonth = rawSessions.filter(s => new Date(s.date) >= startOfCurrentMonth)
    const totalLoad = rawSessions.reduce((acc, curr) => acc + (curr.internalLoad || 0), 0)
    const totalKcal = thisMonth.reduce((acc, curr) => acc + (curr.caloriesBurned || 0), 0)
    
    const totalSeries = rawExercises?.reduce((acc, ex) => acc + (Number(ex.sets) || 0), 0) || 0;
    const totalReps = rawExercises?.reduce((acc, ex) => {
      const r = Number(ex.reps.toString().split(/[^0-9]/)[0]) || 0;
      return acc + (r * (Number(ex.sets) || 0));
    }, 0) || 0;

    return {
      total: rawSessions.length,
      frequency: thisMonth.length,
      lastSession: rawSessions[0] ? format(new Date(rawSessions[0].date), 'dd/MM') : 'Nenhum',
      avgLoad: Math.round(totalLoad / rawSessions.length),
      totalSeries,
      totalReps,
      totalKcal
    }
  }, [rawSessions, rawExercises, isClient])

  const volumeByGroup = useMemo(() => {
    if (!rawExercises) return [];
    const groups: Record<string, number> = {};
    rawExercises.slice(-20).forEach(ex => {
      const group = EXERCISE_METADATA[ex.name]?.group || "Outros";
      groups[group] = (groups[group] || 0) + (Number(ex.sets) || 0);
    });
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [rawExercises]);

  const loadProgression = useMemo(() => {
    if (!rawExercises) return [];
    return [...rawExercises]
      .sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return dateA - dateB;
      })
      .slice(-10)
      .map(ex => ({
        date: ex.createdAt?.toDate ? format(ex.createdAt.toDate(), 'dd/MM') : '--',
        load: (Number(ex.weight) || 0) * (Number(ex.sets) || 0)
      }));
  }, [rawExercises]);

  if (!isClient || isAssessmentsLoading || isSessionsLoading || isExercisesLoading) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const currentWeight = assessments?.[assessments.length - 1]?.weight || 0

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="nubank-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0 mb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Peso Atual</CardTitle>
            <Scale className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-3xl font-black">{currentWeight > 0 ? `${currentWeight} kg` : '--'}</div>
            <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase">Sua última pesagem</p>
          </CardContent>
        </Card>
        
        <Card className="nubank-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0 mb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Queima Mensal</CardTitle>
            <Flame className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-3xl font-black">{stats.totalKcal} <span className="text-xs">kcal</span></div>
            <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase">Gasto total em {format(new Date(), 'MMMM', { locale: ptBR })}</p>
          </CardContent>
        </Card>

        <Card className="nubank-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0 mb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Volume Semanal</CardTitle>
            <Dumbbell className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-3xl font-black">{stats.totalSeries}</div>
            <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase">Séries totais realizadas</p>
          </CardContent>
        </Card>

        <Card className="nubank-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0 mb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total de Reps</CardTitle>
            <Zap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-3xl font-black">{stats.totalReps}</div>
            <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase">Repetições acumuladas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="rounded-[2.5rem] border-primary/10 shadow-lg overflow-hidden bg-card">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Activity className="h-4 w-4" /> Volume por grupo muscular
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 h-[300px]">
            <ChartContainer config={chartConfig}>
              <BarChart data={volumeByGroup}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="var(--color-value)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-primary/10 shadow-lg overflow-hidden bg-card">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Progressão de Carga
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 h-[300px]">
            <ChartContainer config={chartConfig}>
              <AreaChart data={loadProgression}>
                <defs>
                  <linearGradient id="colorLoadUser" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#DFFF6E" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#DFFF6E" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="load" stroke="#DFFF6E" strokeWidth={4} fill="url(#colorLoadUser)" />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <AICoach 
        recentSessions={rawSessions?.slice(0, 5) || []} 
        lastAssessment={assessments?.[assessments.length - 1]} 
      />
    </div>
  )
}
