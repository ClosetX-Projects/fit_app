'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Line, LineChart, Bar, BarChart, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Loader2, Gauge, Timer, Smile, TrendingUp, Zap } from 'lucide-react';
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

  const config = {
    pse: { label: 'PSE', color: '#8A05BE' },
    feeling: { label: 'Prazer (Feeling)', color: '#BA4DE3' },
    load: { label: 'Carga Interna', color: '#4B0082' },
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-3xl border-primary/20 bg-primary/5">
          <CardHeader className="p-4 pb-0"><CardDescription className="text-xs uppercase font-bold">Carga Interna Média</CardDescription></CardHeader>
          <CardContent className="p-4 pt-1"><p className="text-2xl font-black text-primary">
            {chartData.length ? (chartData.reduce((acc, curr) => acc + curr.load, 0) / chartData.length).toFixed(0) : '0'}
          </p></CardContent>
        </Card>
        <Card className="rounded-3xl border-accent/20 bg-accent/5">
          <CardHeader className="p-4 pb-0"><CardDescription className="text-xs uppercase font-bold">Feeling Médio</CardDescription></CardHeader>
          <CardContent className="p-4 pt-1"><p className="text-2xl font-black text-accent">
            {chartData.length ? (chartData.reduce((acc, curr) => acc + curr.feeling, 0) / chartData.length).toFixed(1) : '0'}
          </p></CardContent>
        </Card>
        <Card className="rounded-3xl border-muted-foreground/20 bg-muted/30">
          <CardHeader className="p-4 pb-0"><CardDescription className="text-xs uppercase font-bold">PSE Média</CardDescription></CardHeader>
          <CardContent className="p-4 pt-1"><p className="text-2xl font-black text-muted-foreground">
            {chartData.length ? (chartData.reduce((acc, curr) => acc + curr.pse, 0) / chartData.length).toFixed(1) : '0'}
          </p></CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <Card className="rounded-3xl lg:col-span-1">
          <CardHeader><CardTitle className="text-sm font-bold flex items-center gap-2"><Gauge className="h-4 w-4" /> PSE vs Feeling</CardTitle></CardHeader>
          <CardContent className="h-[250px] p-0">
             <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                   <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
                   <XAxis dataKey="date" hide />
                   <YAxis hide domain={[-5, 10]} />
                   <ChartTooltip />
                   <Line type="monotone" dataKey="pse" stroke="#8A05BE" strokeWidth={3} dot />
                   <Line type="monotone" dataKey="feeling" stroke="#BA4DE3" strokeWidth={3} dot />
                </LineChart>
             </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-3xl lg:col-span-1">
          <CardHeader><CardTitle className="text-sm font-bold flex items-center gap-2"><Zap className="h-4 w-4" /> Carga Interna (PSE x Dur)</CardTitle></CardHeader>
          <CardContent className="h-[250px] p-0">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                   <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
                   <XAxis dataKey="date" hide />
                   <YAxis hide />
                   <ChartTooltip />
                   <Bar dataKey="load" fill="#8A05BE" radius={[4, 4, 0, 0]} />
                </BarChart>
             </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-3xl lg:col-span-1">
          <CardHeader><CardTitle className="text-sm font-bold flex items-center gap-2"><Timer className="h-4 w-4" /> Duração da Sessão</CardTitle></CardHeader>
          <CardContent className="h-[250px] p-0">
             <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                   <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.2} />
                   <XAxis dataKey="date" hide />
                   <YAxis hide />
                   <ChartTooltip />
                   <Line type="step" dataKey="duration" stroke="#BA4DE3" strokeWidth={3} />
                </LineChart>
             </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}