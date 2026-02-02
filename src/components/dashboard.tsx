"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import type { ChartConfig } from "@/components/ui/chart"
import { Dumbbell, Scale, Target } from "lucide-react"

const weightData = [
  { month: "Jan", weight: 88 },
  { month: "Fev", weight: 87 },
  { month: "Mar", weight: 86 },
  { month: "Abr", weight: 85.5 },
  { month: "Mai", weight: 85 },
  { month: "Jun", weight: 84 },
]

const strengthData = [
  { month: "Jan", benchPress: 90 },
  { month: "Fev", benchPress: 92 },
  { month: "Mar", benchPress: 95 },
  { month: "Abr", benchPress: 98 },
  { month: "Mai", benchPress: 100 },
  { month: "Jun", benchPress: 102 },
]

const chartConfig = {
  weight: {
    label: "Peso (kg)",
    color: "hsl(var(--chart-1))",
  },
  benchPress: {
    label: "Supino (kg)",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export function Dashboard() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Peso Atual</CardTitle>
          <Scale className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">84 kg</div>
          <p className="text-xs text-muted-foreground">-1kg desde o mês passado</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Supino 1RM</CardTitle>
          <Dumbbell className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">102 kg</div>
          <p className="text-xs text-muted-foreground">+2kg desde o mês passado</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Consistência nos Treinos</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">75%</div>
          <p className="text-xs text-muted-foreground">3 de 4 treinos planejados esta semana</p>
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Progresso de Peso</CardTitle>
          <CardDescription>Sua tendência de peso nos últimos 6 meses.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <LineChart data={weightData} margin={{ left: 12, right: 12, top: 5, bottom: 5 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => value.slice(0, 3)} />
              <YAxis domain={['dataMin - 2', 'dataMax + 2']} hide />
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
              <Line dataKey="weight" type="monotone" stroke="hsl(var(--primary))" strokeWidth={2} dot={true} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
       <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Ganhos de Força</CardTitle>
          <CardDescription>Tendência de 1RM no Supino.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart data={strengthData} margin={{ left: 0, right: 0, top: 5, bottom: 5 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => value.slice(0, 3)} />
              <YAxis domain={['dataMin - 10', 'dataMax + 5']} hide />
              <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
              <Bar dataKey="benchPress" fill="hsl(var(--accent))" radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
