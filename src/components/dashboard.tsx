
"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import type { ChartConfig } from "@/components/ui/chart"
import { Dumbbell, Scale, Target, Loader2, TrendingUp } from "lucide-react"
import { useFirebase, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, limit, collectionGroup, where } from "firebase/firestore"
import { format } from "date-fns"

export function Dashboard() {
  const { user } = useUser()
  const { firestore } = useFirebase()

  // 1. Buscar Histórico de Peso (Avaliações)
  const assessmentsRef = useMemoFirebase(() => 
    user ? query(
      collection(firestore, 'users', user.uid, 'physicalAssessments'),
      orderBy('date', 'asc'),
      limit(10)
    ) : null
  , [firestore, user])
  
  const { data: assessments, isLoading: isAssessmentsLoading } = useCollection(assessmentsRef)

  // 2. Buscar Histórico de Força (Exercícios de Sessões)
  const strengthLogsRef = useMemoFirebase(() => 
    user ? query(
      collectionGroup(firestore, 'exercises'),
      where('workoutSessionId', '!=', ''), // Filtro dummy para permitir orderBy
      orderBy('createdAt', 'asc'),
      limit(20)
    ) : null
  , [firestore, user])
  
  // Nota: Collection Group queries para o próprio usuário podem ser complexas se não filtradas pelo userId
  // Por simplicidade no MVP, vamos focar no progresso de peso e consistência primeiro
  
  const weightData = useMemo(() => {
    if (!assessments) return []
    return assessments.map(a => ({
      date: format(new Date(a.date), 'dd/MM'),
      weight: a.weight
    }))
  }, [assessments])

  const chartConfig = {
    weight: {
      label: "Peso (kg)",
      color: "hsl(var(--primary))",
    }
  } satisfies ChartConfig

  if (isAssessmentsLoading) {
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
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Peso Atual</CardTitle>
          <Scale className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{currentWeight} kg</div>
          <p className={`text-xs ${Number(weightDiff) <= 0 ? 'text-green-500' : 'text-destructive'}`}>
            {Number(weightDiff) > 0 ? `+${weightDiff}` : weightDiff}kg desde a última avaliação
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avaliações Feitas</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{assessments?.length || 0}</div>
          <p className="text-xs text-muted-foreground">Registros no seu histórico</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Status de Saúde</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">Ativo</div>
          <p className="text-xs text-muted-foreground">Continue com o bom trabalho!</p>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Evolução de Peso Corporal</CardTitle>
          <CardDescription>Baseado nas suas avaliações físicas registradas.</CardDescription>
        </CardHeader>
        <CardContent>
          {weightData.length > 1 ? (
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
            <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground border border-dashed rounded-lg">
              <Scale className="h-12 w-12 mb-4 opacity-20" />
              <p>Registre pelo menos duas avaliações para ver o gráfico de progresso.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
