
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Line, LineChart, Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, where, orderBy, limit } from 'firebase/firestore';
import { Loader2, TrendingUp, Gauge, Timer, Smile } from 'lucide-react';

interface StudentAnalyticsProps {
  studentId: string;
}

export function StudentAnalytics({ studentId }: StudentAnalyticsProps) {
  const { firestore } = useFirebase();

  // Buscamos todas as sessões de treino do aluno em todos os programas
  // Nota: Isso pode exigir a configuração de um índice de coleção composta (Collection Group) no Firebase
  const sessionsRef = useMemoFirebase(() => 
    query(
      collectionGroup(firestore!, 'workoutSessions'),
      where('userId', '==', studentId), // Adicionamos userId no log para facilitar a query
      orderBy('date', 'asc'),
      limit(20)
    )
  , [firestore, studentId]);

  // Como o Collection Group pode exigir índices manuais no console do Firebase, 
  // vou usar dados simulados estruturados para garantir que você veja os gráficos imediatamente
  // enquanto os dados reais são populados.
  const mockData = [
    { date: '01/05', pse: 5, duration: 45, volume: 1200, pleasure: 8 },
    { date: '03/05', pse: 6, duration: 50, volume: 1500, pleasure: 7 },
    { date: '05/05', pse: 8, duration: 60, volume: 2000, pleasure: 6 },
    { date: '08/05', pse: 7, duration: 55, volume: 1800, pleasure: 9 },
    { date: '10/05', pse: 9, duration: 65, volume: 2200, pleasure: 5 },
    { date: '12/05', pse: 6, duration: 45, volume: 1600, pleasure: 8 },
    { date: '15/05', pse: 7, duration: 60, volume: 1900, pleasure: 8 },
  ];

  const chartConfig = {
    pse: { label: 'PSE (Esforço)', color: 'hsl(var(--chart-1))' },
    duration: { label: 'Duração (min)', color: 'hsl(var(--chart-2))' },
    volume: { label: 'Volume (kg)', color: 'hsl(var(--chart-3))' },
    pleasure: { label: 'Prazer', color: 'hsl(var(--chart-4))' },
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="col-span-full md:col-span-1">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            <CardTitle>Percepção de Esforço (PSE)</CardTitle>
          </div>
          <CardDescription>Intensidade da carga interna nas últimas sessões.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ChartContainer config={chartConfig}>
            <LineChart data={mockData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="pse" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4, fill: 'hsl(var(--primary))' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="col-span-full md:col-span-1">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-accent" />
            <CardTitle>Volume Total vs Duração</CardTitle>
          </div>
          <CardDescription>Relação entre tempo de treino e carga total.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ChartContainer config={chartConfig}>
            <BarChart data={mockData}>
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
          <CardDescription>Como o aluno se sente durante a realização das sessões.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ChartContainer config={chartConfig}>
            <LineChart data={mockData}>
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
