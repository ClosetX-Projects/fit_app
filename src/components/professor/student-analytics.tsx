
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Line, LineChart, Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import type { ChartConfig } from '@/components/ui/chart';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Loader2, Zap, LayoutGrid, TrendingUp, Dumbbell, PieChart as PieIcon } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EXERCISE_METADATA } from '@/lib/constants';

interface StudentAnalyticsProps {
  studentId: string;
}

const chartConfig = {
  value: { label: "Volume", color: "hsl(var(--primary))" },
  load: { label: "Carga", color: "hsl(var(--accent))" },
  força: { label: "Força", color: "#DFFF6E" },
  hipertrofia: { label: "Hipertrofia", color: "#7E3F8F" },
  resistencia: { label: "Resistência", color: "#3b82f6" },
} satisfies ChartConfig;

export function StudentAnalytics({ studentId }: StudentAnalyticsProps) {
  const { firestore } = useFirebase();

  const sessionsRef = useMemoFirebase(() => 
    collection(firestore!, 'users', studentId, 'workoutHistory_flat')
  , [firestore, studentId]);

  const exercisesRef = useMemoFirebase(() => 
    collection(firestore!, 'users', studentId, 'exerciseHistory_flat')
  , [firestore, studentId]);

  const { data: rawSessions, isLoading: loadingSessions } = useCollection(sessionsRef);
  const { data: rawExercises, isLoading: loadingExercises } = useCollection(exercisesRef);

  const stats = useMemo(() => {
    if (!rawSessions || rawSessions.length === 0) return { avgLoad: 0, totalSeries: 0, totalReps: 0 };
    
    const totalSeries = rawExercises?.reduce((acc, ex) => acc + (Number(ex.sets) || 0), 0) || 0;
    const totalReps = rawExercises?.reduce((acc, ex) => {
      const reps = Number(ex.reps.toString().split(/[^0-9]/)[0]) || 0;
      return acc + (reps * (Number(ex.sets) || 0));
    }, 0) || 0;

    return { totalSeries, totalReps };
  }, [rawSessions, rawExercises]);

  const volumeData = useMemo(() => {
    if (!rawExercises) return [];
    const groups: Record<string, number> = {};
    rawExercises.forEach(ex => {
      const metadata = EXERCISE_METADATA[ex.name] || { group: "Outros" };
      groups[metadata.group] = (groups[metadata.group] || 0) + (Number(ex.sets) || 0);
    });
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [rawExercises]);

  const loadProgression = useMemo(() => {
    if (!rawExercises) return [];
    return [...rawExercises]
      .sort((a, b) => new Date(a.createdAt?.toDate?.()).getTime() - new Date(b.createdAt?.toDate?.()).getTime())
      .slice(-10)
      .map(ex => ({
        date: format(new Date(ex.createdAt?.toDate?.()), 'dd/MM'),
        load: (Number(ex.weight) || 0) * (Number(ex.sets) || 0)
      }));
  }, [rawExercises]);

  const stimuliData = useMemo(() => {
    if (!rawExercises) return [];
    let força = 0, hipertrofia = 0, resistencia = 0;
    rawExercises.forEach(ex => {
      const reps = Number(ex.reps.toString().split(/[^0-9]/)[0]) || 0;
      if (reps <= 6) força++;
      else if (reps <= 12) hipertrofia++;
      else resistencia++;
    });
    return [
      { name: 'Força', value: força, color: '#DFFF6E' },
      { name: 'Hipertrofia', value: hipertrofia, color: '#7E3F8F' },
      { name: 'Resistência', value: resistencia, color: '#3b82f6' }
    ];
  }, [rawExercises]);

  if (loadingSessions || loadingExercises) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume por Grupo Muscular */}
        <Card className="rounded-[2rem] border-primary/10 bg-card overflow-hidden shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-primary flex items-center gap-2">
              <Dumbbell className="h-4 w-4" /> Volume por grupo muscular
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[250px] pt-4">
            <ChartContainer config={chartConfig}>
              <BarChart data={volumeData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.05} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Carga Total por Semana */}
        <Card className="rounded-[2rem] border-primary/10 bg-card overflow-hidden shadow-xl">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold text-primary flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Carga total levantada
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[250px] pt-4">
            <div className="flex gap-8 mb-4">
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground">Nº total de séries</p>
                <p className="text-2xl font-black">{stats.totalSeries}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground">Nº total de repetições</p>
                <p className="text-2xl font-black">{stats.totalReps}</p>
              </div>
            </div>
            <ChartContainer config={chartConfig}>
              <LineChart data={loadProgression}>
                <XAxis dataKey="date" hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="load" stroke="#DFFF6E" strokeWidth={3} dot={{ r: 4, fill: "#DFFF6E" }} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Distribuição dos Estímulos */}
        <Card className="rounded-[2rem] border-primary/10 bg-card overflow-hidden shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-primary flex items-center gap-2">
              <PieIcon className="h-4 w-4" /> Distribuição dos estímulos
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[250px] flex items-center">
            <div className="flex-1 h-full">
              <ChartContainer config={chartConfig}>
                <PieChart>
                  <Pie data={stimuliData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {stimuliData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                </PieChart>
              </ChartContainer>
            </div>
            <div className="flex-1 space-y-3">
              {stimuliData.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <p className="text-xs font-bold uppercase tracking-tighter">{s.name}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Análise Visual da Progressão */}
        <Card className="rounded-[2rem] border-primary/10 bg-card overflow-hidden shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-primary flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" /> Análise visual da progressão
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[250px] pt-4 relative">
             <div className="absolute top-4 right-8 z-10">
                <TrendingUp className="h-8 w-8 text-yellow-500 animate-bounce" />
             </div>
             <ChartContainer config={chartConfig}>
                <AreaChart data={loadProgression}>
                   <defs>
                      <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                         <stop offset="5%" stopColor="#7E3F8F" stopOpacity={0.8}/>
                         <stop offset="95%" stopColor="#7E3F8F" stopOpacity={0}/>
                      </linearGradient>
                   </defs>
                   <XAxis dataKey="date" hide />
                   <ChartTooltip content={<ChartTooltipContent />} />
                   <Area type="monotone" dataKey="load" stroke="#7E3F8F" fillOpacity={1} fill="url(#colorLoad)" />
                </AreaChart>
             </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="nubank-card bg-primary text-primary-foreground p-8 flex items-center justify-between">
         <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center">
               <Zap className="h-6 w-6" />
            </div>
            <p className="text-xl font-black uppercase tracking-tighter italic">RELATÓRIOS PRONTOS PARA MOSTRAR AO ALUNO</p>
         </div>
         <p className="text-4xl font-black opacity-30">APP</p>
      </div>
    </div>
  );
}
