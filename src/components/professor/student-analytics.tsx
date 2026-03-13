
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Line, LineChart, Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Loader2, Gauge, Timer, Smile, TrendingUp, Zap, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';

interface StudentAnalyticsProps {
  studentId: string;
}

export function StudentAnalytics({ studentId }: StudentAnalyticsProps) {
  const { firestore } = useFirebase();

  const sessionsRef = useMemoFirebase(() => 
    collection(firestore!, 'users', studentId, 'workoutHistory_flat')
  , [firestore, studentId]);

  const { data: rawSessions, isLoading } = useCollection(sessionsRef);

  const stats = useMemo(() => {
    if (!rawSessions || rawSessions.length === 0) return { avgLoad: 0, monotony: 0, strain: 0 };
    
    const loads = rawSessions.map(s => s.internalLoad || 0);
    const avgLoad = loads.reduce((a, b) => a + b, 0) / loads.length;
    
    // Desvio Padrão
    const variance = loads.reduce((a, b) => a + Math.pow(b - avgLoad, 2), 0) / loads.length;
    const stdDev = Math.sqrt(variance) || 1; // Evita divisão por zero
    
    const monotony = avgLoad / stdDev;
    const strain = avgLoad * monotony;

    return { 
      avgLoad: Math.round(avgLoad), 
      monotony: monotony.toFixed(2), 
      strain: Math.round(strain) 
    };
  }, [rawSessions]);

  const chartData = useMemo(() => {
    if (!rawSessions) return [];
    return [...rawSessions]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(s => ({
        date: format(new Date(s.date), 'dd/MM'),
        pse: s.pseSession || 0,
        feeling: s.pleasureScale || 0,
        load: s.internalLoad || 0,
        duration: s.duration || 0,
      }));
  }, [rawSessions]);

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-3xl border-primary/20 bg-primary/5 p-4 text-center">
          <p className="text-[10px] uppercase font-black text-primary/60">Carga Média</p>
          <p className="text-2xl font-black text-primary">{stats.avgLoad}</p>
        </Card>
        <Card className="rounded-3xl border-accent/20 bg-accent/5 p-4 text-center">
          <p className="text-[10px] uppercase font-black text-accent/60">Monotonia</p>
          <p className="text-2xl font-black text-accent">{stats.monotony}</p>
          <p className="text-[8px] font-bold opacity-60">Ideal: &lt; 2.0</p>
        </Card>
        <Card className="rounded-3xl border-primary/20 bg-primary/5 p-4 text-center">
          <p className="text-[10px] uppercase font-black text-primary/60">Strain (Tensão)</p>
          <p className="text-2xl font-black text-primary">{stats.strain}</p>
        </Card>
        <Card className="rounded-3xl border-destructive/20 bg-destructive/5 p-4 text-center">
          <p className="text-[10px] uppercase font-black text-destructive/60">Risco</p>
          <p className="text-2xl font-black text-destructive">{Number(stats.monotony) > 2 ? 'ALTO' : 'BAIXO'}</p>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="rounded-3xl overflow-hidden border-primary/10 shadow-lg">
          <CardHeader className="bg-primary/5 border-b"><CardTitle className="text-xs font-black uppercase flex items-center gap-2 tracking-widest text-primary"><Zap className="h-4 w-4" /> Evolução de Carga Interna</CardTitle></CardHeader>
          <CardContent className="h-[300px] p-6">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                   <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.1} />
                   <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                   <YAxis hide />
                   <ChartTooltip />
                   <Bar dataKey="load" fill="#7E3F8F" radius={[6, 6, 0, 0]} />
                </BarChart>
             </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-3xl overflow-hidden border-accent/10 shadow-lg">
          <CardHeader className="bg-accent/5 border-b"><CardTitle className="text-xs font-black uppercase flex items-center gap-2 tracking-widest text-accent"><Smile className="h-4 w-4" /> Bem-estar (Feeling)</CardTitle></CardHeader>
          <CardContent className="h-[300px] p-6">
             <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                   <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.1} />
                   <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                   <YAxis hide domain={[-5, 5]} />
                   <ChartTooltip />
                   <Line type="monotone" dataKey="feeling" stroke="#DFFF6E" strokeWidth={4} dot={{ r: 4, fill: "#DFFF6E" }} />
                </LineChart>
             </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
