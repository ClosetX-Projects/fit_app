'use client';

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Line, LineChart, Bar, BarChart, XAxis, YAxis, CartesianGrid, Area, AreaChart, Cell, Pie, PieChart, Legend, ResponsiveContainer } from 'recharts';
import type { ChartConfig } from '@/components/ui/chart';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Loader2, Zap, LayoutGrid, TrendingUp, Dumbbell, PieChart as PieIcon, Activity, Battery, BrainCircuit, ArrowUpRight, ArrowDownRight, Scale } from 'lucide-react';
import { format, getWeek, startOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EXERCISE_METADATA } from '@/lib/constants';

interface StudentAnalyticsProps {
  studentId: string;
}

const chartConfig = {
  pse: { label: "Esforço (PSE)", color: "hsl(var(--primary))" },
  psr: { label: "Recuperação (PSR)", color: "hsl(var(--accent))" },
  volume: { label: "Volume (kg)", color: "hsl(var(--primary))" },
  cargaInterna: { label: "Carga Interna", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;

export function StudentAnalytics({ studentId }: StudentAnalyticsProps) {
  const { firestore } = useFirebase();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Buscar Sessões (Histórico de Carga e Subjectivos)
  const sessionsRef = useMemoFirebase(() => 
    query(collection(firestore!, 'users', studentId, 'workoutHistory_flat'), orderBy('date', 'asc'))
  , [firestore, studentId]);

  // Buscar Exercícios (Para cálculo de Volume Total)
  const exercisesRef = useMemoFirebase(() => 
    collection(firestore!, 'users', studentId, 'exerciseHistory_flat')
  , [firestore, studentId]);

  // Buscar Avaliações (Para comparativo)
  const assessmentsRef = useMemoFirebase(() => 
    query(collection(firestore!, 'users', studentId, 'physicalAssessments'), orderBy('date', 'desc'), limit(2))
  , [firestore, studentId]);

  const { data: rawSessions, isLoading: loadingSessions } = useCollection(sessionsRef);
  const { data: rawExercises, isLoading: loadingExercises } = useCollection(exercisesRef);
  const { data: assessments, isLoading: loadingAssessments } = useCollection(assessmentsRef);

  // 1. Evolução PSE vs PSR (Controle Biopsicossocial)
  const subjectiveData = useMemo(() => {
    if (!rawSessions) return [];
    return rawSessions.map(s => ({
      date: format(parseISO(s.date), 'dd/MM'),
      pse: s.pseSession || 0,
      psr: s.recoveryPerception || 0,
    })).slice(-15);
  }, [rawSessions]);

  // 2. Evolução Mensal de Volume Total (Tonelagem)
  const monthlyVolumeData = useMemo(() => {
    if (!rawExercises) return [];
    const monthlyMap: Record<string, number> = {};
    
    rawExercises.forEach(ex => {
      if (!ex.createdAt) return;
      const date = ex.createdAt.toDate();
      const monthKey = format(date, 'MMM/yy', { locale: ptBR });
      
      const reps = Number(ex.reps?.toString().split(/[^0-9]/)[0]) || 0;
      const weight = Number(ex.weight) || 0;
      const sets = Number(ex.sets) || 0;
      const volume = sets * reps * weight;
      
      monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + volume;
    });

    return Object.entries(monthlyMap).map(([month, volume]) => ({
      month,
      volume: Math.round(volume)
    })).slice(-6); // Últimos 6 meses
  }, [rawExercises]);

  // 3. Comparativo de Avaliações
  const comparativeMetrics = useMemo(() => {
    if (!assessments || assessments.length < 2) return null;
    const current = assessments[0];
    const previous = assessments[1];

    const calcDiff = (curr: number, prev: number) => {
      const diff = curr - prev;
      return {
        val: curr,
        prev: prev,
        diff: diff.toFixed(1),
        perc: prev > 0 ? ((diff / prev) * 100).toFixed(1) : '0',
        improved: diff > 0
      };
    };

    return [
      { label: 'Peso (kg)', ...calcDiff(current.weight || 0, previous.weight || 0), invert: true },
      { label: '% Gordura', ...calcDiff(Number(current.calculatedResults?.fatPerc) || 0, Number(previous.calculatedResults?.fatPerc) || 0), invert: true },
      { label: 'VO2máx', ...calcDiff(Number(current.calculatedResults?.vo2Cooper) || 0, Number(previous.calculatedResults?.vo2Cooper) || 0), invert: false },
    ];
  }, [assessments]);

  // 4. Intensidade Média
  const avgIntensity = useMemo(() => {
    if (!rawSessions || rawSessions.length === 0) return 0;
    const total = rawSessions.reduce((acc, s) => acc + (s.pseSession || 0), 0);
    return (total / rawSessions.length).toFixed(1);
  }, [rawSessions]);

  if (!isClient || loadingSessions || loadingExercises || loadingAssessments) {
    return <div className="flex justify-center p-24"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="nubank-card border-primary/20 bg-primary/5">
          <CardHeader className="p-4 pb-2">
            <p className="text-[10px] font-black uppercase text-primary tracking-widest">Intensidade Média</p>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex items-baseline gap-2">
            <span className="text-4xl font-black text-primary">{avgIntensity}</span>
            <span className="text-xs font-bold text-muted-foreground uppercase">Escala Borg</span>
          </CardContent>
        </Card>
        
        <Card className="nubank-card border-accent/20 bg-accent/5">
          <CardHeader className="p-4 pb-2">
            <p className="text-[10px] font-black uppercase text-accent-foreground tracking-widest">Tonelagem Total</p>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex items-baseline gap-2">
            <span className="text-4xl font-black text-accent-foreground">
              {monthlyVolumeData[monthlyVolumeData.length - 1]?.volume || 0}
            </span>
            <span className="text-xs font-bold text-muted-foreground uppercase">kg no mês</span>
          </CardContent>
        </Card>

        <Card className="nubank-card bg-card">
          <CardHeader className="p-4 pb-2">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Sessões Realizadas</p>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex items-baseline gap-2">
            <span className="text-4xl font-black text-foreground">{rawSessions?.length || 0}</span>
            <span className="text-xs font-bold text-muted-foreground uppercase">Treinos</span>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico PSE vs PSR */}
        <Card className="rounded-[2.5rem] border-primary/10 overflow-hidden shadow-xl bg-card">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-sm font-black text-primary flex items-center gap-2 uppercase tracking-tighter">
              <BrainCircuit className="h-4 w-4" /> Evolução Biopsicossocial (PSE vs PSR)
            </CardTitle>
            <CardDescription className="text-[10px] uppercase font-bold">Relação Esforço x Recuperação (Últimas 15 sessões)</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] pt-8">
            <ChartContainer config={chartConfig}>
              <LineChart data={subjectiveData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 10]} hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Line type="monotone" dataKey="pse" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} name="Esforço (PSE)" />
                <Line type="monotone" dataKey="psr" stroke="hsl(var(--accent))" strokeWidth={3} dot={{ r: 4 }} name="Recuperação (PSR)" />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Evolução de Volume (Tonelagem) */}
        <Card className="rounded-[2.5rem] border-primary/10 overflow-hidden shadow-xl bg-card">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-sm font-black text-primary flex items-center gap-2 uppercase tracking-tighter">
              <Dumbbell className="h-4 w-4" /> Evolução de Volume Total (Tonelagem)
            </CardTitle>
            <CardDescription className="text-[10px] uppercase font-bold">Séries x Reps x Carga acumulados por mês</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] pt-8">
            <ChartContainer config={chartConfig}>
              <BarChart data={monthlyVolumeData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="volume" fill="hsl(var(--primary))" radius={[10, 10, 0, 0]} name="Volume (kg)" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Comparativo de Avaliações */}
      <Card className="rounded-[3rem] border-primary/10 overflow-hidden shadow-2xl bg-card">
        <CardHeader className="bg-primary/5 p-8 border-b">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-white">
              <Scale className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-black text-primary uppercase tracking-tighter">Comparativo Técnico de Resultados</CardTitle>
              <CardDescription className="text-[10px] uppercase font-bold tracking-widest">Variação entre as duas últimas avaliações físicas</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          {comparativeMetrics ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {comparativeMetrics.map((m, i) => {
                const isGood = m.invert ? Number(m.diff) < 0 : Number(m.diff) > 0;
                return (
                  <div key={i} className="space-y-4">
                    <p className="text-xs font-black uppercase text-muted-foreground tracking-widest">{m.label}</p>
                    <div className="flex items-end justify-between border-b border-primary/5 pb-4">
                      <div>
                        <p className="text-3xl font-black text-foreground">{m.val}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">Anterior: {m.prev}</p>
                      </div>
                      <div className={`flex items-center gap-1 font-black text-sm ${isGood ? 'text-green-500' : 'text-red-500'}`}>
                        {isGood ? <ArrowDownRight className={m.invert ? "h-4 w-4" : "h-4 w-4 rotate-180"} /> : <ArrowUpRight className={m.invert ? "h-4 w-4" : "h-4 w-4 rotate-180"} />}
                        {Math.abs(Number(m.diff))} ({Math.abs(Number(m.perc))}%)
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center bg-muted/20 rounded-[2rem] border-2 border-dashed border-primary/10">
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Realize pelo menos 2 avaliações para gerar o comparativo.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gráfico de Distribuição de Estímulos */}
      <div className="nubank-card bg-primary text-primary-foreground p-10 flex flex-col md:flex-row items-center justify-between gap-8">
         <div className="flex items-center gap-6">
            <div className="h-16 w-16 rounded-[2rem] bg-white/20 flex items-center justify-center shadow-inner">
               <Zap className="h-8 w-8" />
            </div>
            <div>
              <p className="text-3xl font-black uppercase tracking-tighter italic">Análise de Microciclo</p>
              <p className="text-[11px] font-bold opacity-70 uppercase tracking-[0.2em]">Otimização de Carga Baseada em Percepção e Tonelagem</p>
            </div>
         </div>
         <p className="text-6xl font-black opacity-20 hidden md:block">FIT ASSIST</p>
      </div>
    </div>
  );
}
