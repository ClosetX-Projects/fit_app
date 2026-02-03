
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Line, LineChart, Bar, BarChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, where } from 'firebase/firestore';
import { Loader2, Gauge, Timer, Smile, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface StudentAnalyticsProps {
  studentId: string;
}

export function StudentAnalytics({ studentId }: StudentAnalyticsProps) {
  const { firestore } = useFirebase();

  // Buscar sessões reais do aluno. Removido orderBy do banco para evitar erro de índice.
  const sessionsRef = useMemoFirebase(() => 
    query(
      collectionGroup(firestore!, 'workoutSessions'),
      where('userId', '==', studentId)
    )
  , [firestore, studentId]);

  const { data: rawSessions, isLoading } = useCollection(sessionsRef);

  // Ordenar sessões em memória
  const sessions = useMemo(() => {
    if (!rawSessions) return null;
    return [...rawSessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [rawSessions]);

  // Processar dados para o gráfico
  const chartData = useMemo(() => {
    if (!sessions || sessions.length === 0) return [];
    
    return sessions.map(session => ({
      date: format(new Date(session.date), 'dd/MM'),
      pse: session.pseSession || 0,
      duration: session.duration || 0,
      pleasure: session.pleasureScale || 0,
      rawDate: session.date
    }));
  }, [sessions]);

  const chartConfig = {
    pse: { label: 'PSE (Esforço)', color: 'hsl(var(--chart-1))' },
    duration: { label: 'Duração (min)', color: 'hsl(var(--chart-2))' },
    pleasure: { label: 'Prazer', color: 'hsl(var(--chart-4))' },
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <Card className="py-12 text-center border-dashed">
        <CardContent className="space-y-4">
          <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground opacity-20" />
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">Sem dados de treino ainda</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              Assim que o aluno realizar e finalizar os treinos prescritos, os gráficos de progresso aparecerão aqui.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="col-span-full md:col-span-1">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            <CardTitle>Percepção de Esforço (PSE)</CardTitle>
          </div>
          <CardDescription>Intensidade da carga interna nas sessões realizadas.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ChartContainer config={chartConfig}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line 
                type="monotone" 
                dataKey="pse" 
                stroke="hsl(var(--primary))" 
                strokeWidth={3} 
                dot={{ r: 4, fill: 'hsl(var(--primary))' }} 
                activeDot={{ r: 6 }} 
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="col-span-full md:col-span-1">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-accent" />
            <CardTitle>Duração dos Treinos</CardTitle>
          </div>
          <CardDescription>Tempo investido em cada sessão (minutos).</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ChartContainer config={chartConfig}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="duration" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="col-span-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Smile className="h-5 w-5 text-chart-4" />
            <CardTitle>Escala de Prazer e Bem-estar</CardTitle>
          </div>
          <CardDescription>Nível de satisfação do aluno durante as sessões.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ChartContainer config={chartConfig}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} />
              <YAxis domain={[0, 10]} axisLine={false} tickLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="stepAfter" dataKey="pleasure" stroke="hsl(var(--chart-4))" strokeWidth={3} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
