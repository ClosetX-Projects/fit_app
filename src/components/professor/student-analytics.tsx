
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Line, LineChart, Bar, BarChart, XAxis, YAxis, CartesianGrid, Area, AreaChart, Cell, Pie, PieChart } from 'recharts';
import type { ChartConfig } from '@/components/ui/chart';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Loader2, Zap, LayoutGrid, TrendingUp, Dumbbell, PieChart as PieIcon, Activity } from 'lucide-react';
import { format, getWeek } from 'date-fns';
import { EXERCISE_METADATA } from '@/lib/constants';

interface StudentAnalyticsProps {
  studentId: string;
}

const chartConfig = {
  value: { label: "Carga Interna", color: "hsl(var(--primary))" },
  load: { label: "Carga Total", color: "hsl(var(--accent))" },
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
    if (!rawSessions || rawSessions.length === 0) return { totalSeries: 0, totalReps: 0 };
    
    const totalSeries = rawExercises?.reduce((acc, ex) => acc + (Number(ex.sets) || 0), 0) || 0;
    const totalReps = rawExercises?.reduce((acc, ex) => {
      const reps = Number(ex.reps.toString().split(/[^0-9]/)[0]) || 0;
      return acc + (reps * (Number(ex.sets) || 0));
    }, 0) || 0;

    return { totalSeries, totalReps };
  }, [rawSessions, rawExercises]);

  const internalLoadData = useMemo(() => {
    if (!rawSessions) return [];
    
    return [...rawSessions]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((session, index) => {
        const date = new Date(session.date);
        const micro = getWeek(date);
        const sessionNum = (index % 6) + 1; // Simulação de sessões por microciclo
        
        return {
          sessionName: `S${sessionNum}`,
          microLabel: `M${micro}`,
          fullLabel: `S${sessionNum} (M${micro})`,
          value: session.duration * (session.pseSession || 7),
        };
      })
      .slice(-18); // Mostrar as últimas 18 sessões (aprox. 3 microciclos)
  }, [rawSessions]);

  const volumeData = useMemo(() => {
    if (!rawExercises) return [];
    const groups: Record<string, number> = {};
    rawExercises.forEach(ex => {
      const metadata = EXERCISE_METADATA[ex.name] || { group: "Outros" };
      groups[metadata.group] = (groups[metadata.group] || 0) + (Number(ex.sets) || 0);
    });
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [rawExercises]);

  const stimuliData = useMemo(() => {
    if (!rawExercises) return [];
    let força = 0, hipertrofia = 0, resistencia = 0;
    rawExercises.forEach(ex => {
      const repsStr = ex.reps?.toString().split(/[^0-9]/)[0] || "0";
      const reps = Number(repsStr);
      if (reps > 0 && reps <= 6) força++;
      else if (reps > 6 && reps <= 12) hipertrofia++;
      else if (reps > 12) resistencia++;
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
      {/* Gráfico de Carga Interna - Referência do Usuário */}
      <Card className="rounded-[2.5rem] border-primary/10 bg-card overflow-hidden shadow-2xl">
        <CardHeader className="bg-primary/5 p-6">
          <CardTitle className="text-sm font-black text-primary flex items-center gap-2 uppercase tracking-tighter">
            <Activity className="h-4 w-4" /> Variação da Carga Interna (Fisiológica)
          </CardTitle>
          <p className="text-[10px] text-muted-foreground font-bold uppercase">Duração (min) x PSE (Borg)</p>
        </CardHeader>
        <CardContent className="h-[350px] pt-8">
          <ChartContainer config={chartConfig}>
            <LineChart data={internalLoadData} margin={{ left: 10, right: 10, top: 20, bottom: 20 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.1} />
              <XAxis 
                dataKey="fullLabel" 
                tick={{ fontSize: 9, fontWeight: 'bold' }} 
                axisLine={false} 
                tickLine={false}
              />
              <YAxis 
                domain={[0, 600]} 
                tick={{ fontSize: 10, fontWeight: 'bold' }} 
                axisLine={false} 
                tickLine={false} 
                label={{ value: 'AU', angle: -90, position: 'insideLeft', style: { fontSize: 10, fontWeight: 'black' } }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="hsl(var(--primary))" 
                strokeWidth={4} 
                dot={{ r: 6, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "white" }}
                activeDot={{ r: 8, fill: "hsl(var(--accent))" }}
              />
            </LineChart>
          </ChartContainer>
          <div className="flex justify-center gap-8 mt-4">
             <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Carga Interna</span>
             </div>
          </div>
        </CardContent>
      </Card>

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
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
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
      </div>

      <div className="nubank-card bg-primary text-primary-foreground p-8 flex items-center justify-between">
         <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center">
               <Zap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xl font-black uppercase tracking-tighter italic">RELATÓRIOS TÉCNICOS</p>
              <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Baseados em Carga Interna e Volume de Séries</p>
            </div>
         </div>
         <p className="text-4xl font-black opacity-30">FIT</p>
      </div>
    </div>
  );
}
