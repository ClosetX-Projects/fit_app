"use client"

import { useMemo, useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Bar, BarChart, Area, AreaChart } from "recharts"
import type { ChartConfig } from "@/components/ui/chart"
import { Dumbbell, Scale, Loader2, TrendingUp, CalendarDays, Zap, Clock, Activity, LayoutGrid, Flame } from "lucide-react"
import { useUser } from "@/contexts/auth-provider"
import { useApi } from "@/hooks/use-api"
import { format, startOfMonth, isValid } from "date-fns"
import { ptBR } from "date-fns/locale"
import { AICoach } from "./ai-coach"
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
  const { toast } = useToast()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const isAluno = user?.role === 'aluno';
  const { data: assessments, loading: isAssessmentsLoading } = useApi<any[]>(
    isAluno ? `/avaliacoes_antropo/aluno/${user.id}` : '/avaliacoes_antropo/'
  )
  const { data: rawSessions, loading: isSessionsLoading } = useApi<any[]>('/treinos/')
  const { data: rawExercises, loading: isExercisesLoading } = useApi<any[]>('/exercicios/')

  const stats = useMemo(() => {
    if (!isClient || !rawSessions || rawSessions.length === 0) return { total: 0, frequency: 0, lastSession: 'Nenhum', avgLoad: 0, totalReps: 0, totalSeries: 0, totalKcal: 0 }
    
    const now = new Date()
    const startOfCurrentMonth = startOfMonth(now)
    const thisMonth = rawSessions.filter(s => {
      // s.created_at or s.date
      const d = new Date(s.created_at || s.date || Date.now());
      return isValid(d) && d >= startOfCurrentMonth;
    })
    
    // Na API v2, volume está no próprio treino vinculado ao programa
    // s.series, s.reps_tempo etc.
    const totalSeries = rawSessions.reduce((acc, s) => acc + (Number(s.series) || 0), 0);
    const totalReps = rawSessions.reduce((acc, s) => {
      const repsStr = s.reps_tempo?.toString() || "";
      const r = Number(repsStr.split(/[^0-9]/)[0]) || 0;
      return acc + (r * (Number(s.series) || 0));
    }, 0);

    const lastSessDate = rawSessions[0] ? new Date(rawSessions[0].created_at || rawSessions[0].date) : null;

    return {
      total: rawSessions.length,
      frequency: thisMonth.length,
      lastSession: lastSessDate && isValid(lastSessDate) ? format(lastSessDate, 'dd/MM') : 'Nenhum',
      avgLoad: 0, // Mockado até termos logs de carga real
      totalSeries,
      totalReps,
      totalKcal: 0
    }
  }, [rawSessions, rawExercises, isClient])

  const volumeByGroup = useMemo(() => {
    if (!rawSessions || !isClient) return [];
    const groups: Record<string, number> = {};
    rawSessions.slice(-20).forEach(s => {
      const exName = s.exercicios?.nome || s.nome || "Outros";
      const group = EXERCISE_METADATA[exName]?.group || "Geral";
      groups[group] = (groups[group] || 0) + (Number(s.series) || 0);
    });
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [rawSessions, isClient]);

  const loadProgression = useMemo(() => {
    if (!rawSessions || !isClient) return [];
    return [...rawSessions]
      .sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateA - dateB;
      })
      .slice(-10)
      .map(s => {
        const d = new Date(s.created_at || s.date);
        return {
          date: d && isValid(d) ? format(d, 'dd/MM') : '--',
          load: (Number(s.series) || 0) * (Number(s.pct_1rm) || 0) // Estimativa de esforço
        }
      });
  }, [rawSessions, isClient]);

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
