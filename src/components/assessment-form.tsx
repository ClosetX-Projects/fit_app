"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useFirebase, useUser } from "@/firebase"
import { doc, collection, serverTimestamp } from "firebase/firestore"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { Loader2, Save, Ruler, Activity, Percent, Dumbbell, Zap, HelpCircle, Info, Calculator, PieChart as PieIcon } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as ChartTooltip } from 'recharts'

const assessmentSchema = z.object({
  weight: z.coerce.number().min(1, "Peso é obrigatório"),
  height: z.coerce.number().min(1, "Estatura é obrigatória"),
  // Circunferências Bilaterais
  peitoral: z.coerce.number().default(0),
  cintura: z.coerce.number().default(0),
  abdomen: z.coerce.number().default(0),
  quadril: z.coerce.number().default(0),
  bracoD: z.coerce.number().default(0),
  bracoE: z.coerce.number().default(0),
  antebracoD: z.coerce.number().default(0),
  antebracoE: z.coerce.number().default(0),
  coxaD: z.coerce.number().default(0),
  coxaE: z.coerce.number().default(0),
  pernaD: z.coerce.number().default(0),
  pernaE: z.coerce.number().default(0),
  // Dobras Cutâneas
  subescapular: z.coerce.number().default(0),
  tricipital: z.coerce.number().default(0),
  bicipital: z.coerce.number().default(0),
  axilarMedia: z.coerce.number().default(0),
  peitoralDobra: z.coerce.number().default(0),
  supraIliaca: z.coerce.number().default(0),
  abdominalDobra: z.coerce.number().default(0),
  coxaDobra: z.coerce.number().default(0),
  pernaMedial: z.coerce.number().default(0),
  // Bio/Desempenho
  fatPercentage: z.coerce.number().default(0),
  vo2Max: z.coerce.number().default(0),
  oneRmTest: z.coerce.number().default(0),
})

type AssessmentValues = z.infer<typeof assessmentSchema>

export function AssessmentForm() {
  const { toast } = useToast()
  const { firestore } = useFirebase()
  const { user } = useUser()
  const [loading, setLoading] = useState(false)

  const form = useForm<AssessmentValues>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      weight: 0,
      height: 0,
      fatPercentage: 0,
    },
  })

  const watchedWeight = form.watch("weight")
  const watchedFatPerc = form.watch("fatPercentage")

  const pieData = useMemo(() => {
    if (!watchedWeight || !watchedFatPerc) return [{ name: 'Massa Magra', value: 100 }, { name: 'Gordura', value: 0 }];
    const fatKg = (watchedWeight * watchedFatPerc) / 100;
    const muscleKg = watchedWeight - fatKg;
    return [
      { name: 'Massa Magra', value: muscleKg, color: '#8A05BE' },
      { name: 'Gordura', value: fatKg, color: '#E2E2E2' }
    ];
  }, [watchedWeight, watchedFatPerc]);

  const onSubmit = async (values: AssessmentValues) => {
    if (!user || !firestore) return
    setLoading(true)
    try {
      const assessmentRef = doc(collection(firestore, "users", user.uid, "physicalAssessments"))
      setDocumentNonBlocking(assessmentRef, {
        ...values,
        id: assessmentRef.id,
        userId: user.uid,
        date: new Date().toISOString(),
        createdAt: serverTimestamp(),
      }, { merge: true })

      toast({ title: "Avaliação salva!", description: "Dados registrados com sucesso." })
      form.reset()
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao salvar." })
    } finally {
      setLoading(false)
    }
  }

  const LabelWithInfo = ({ label, info, id }: { label: string; info: string; id: string }) => (
    <div className="flex items-center gap-1 mb-1">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-[200px]"><p className="text-xs">{info}</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )

  return (
    <Card className="w-full max-w-5xl mx-auto border-primary/20 shadow-xl rounded-3xl overflow-hidden">
      <CardHeader className="bg-primary/5 p-8">
        <CardTitle className="text-2xl font-bold text-primary flex items-center gap-3">
          <Activity className="h-7 w-7" /> Avaliação de Composição Corporal
        </CardTitle>
        <CardDescription>Protocolos avançados e análise de performance.</CardDescription>
      </CardHeader>
      <CardContent className="p-8">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Tabs defaultValue="composition" className="w-full">
            <TabsList className="flex flex-wrap h-auto p-1 bg-muted rounded-2xl mb-8">
              <TabsTrigger value="basic" className="rounded-xl py-2 px-4">Básicos</TabsTrigger>
              <TabsTrigger value="composition" className="rounded-xl py-2 px-4">Composição Corporal</TabsTrigger>
              <TabsTrigger value="circumference" className="rounded-xl py-2 px-4">Circunferências</TabsTrigger>
              <TabsTrigger value="performance" className="rounded-xl py-2 px-4">Performance (VO2)</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="space-y-2">
                  <LabelWithInfo id="weight" label="Peso Total (kg)" info="Massa corporal total na balança." />
                  <Input id="weight" type="number" step="0.1" {...form.register("weight")} />
                </div>
                <div className="space-y-2">
                  <LabelWithInfo id="height" label="Estatura (cm)" info="Altura total em centímetros." />
                  <Input id="height" type="number" {...form.register("height")} />
                </div>
              </div>
              <div className="flex flex-col items-center justify-center p-6 bg-secondary rounded-3xl">
                 <p className="text-sm font-bold text-primary mb-2">Composição Estimada (kg)</p>
                 <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color || '#8A05BE'} />)}
                      </Pie>
                      <ChartTooltip />
                      <Legend />
                    </PieChart>
                 </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="composition" className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { id: "tricipital", label: "Tricipital" },
                  { id: "bicipital", label: "Bicipital" },
                  { id: "subescapular", label: "Subescapular" },
                  { id: "axilarMedia", label: "Axilar Média" },
                  { id: "peitoralDobra", label: "Peitoral" },
                  { id: "supraIliaca", label: "Supra-ilíaca" },
                  { id: "abdominalDobra", label: "Abdominal" },
                  { id: "coxaDobra", label: "Coxa" },
                  { id: "pernaMedial", label: "Perna Medial" }
                ].map(dobra => (
                  <div key={dobra.id} className="space-y-1">
                    <Label className="text-[11px] uppercase text-muted-foreground font-bold">{dobra.label} (mm)</Label>
                    <Input type="number" step="0.1" {...form.register(dobra.id as any)} />
                  </div>
                ))}
              </div>
              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20">
                <LabelWithInfo id="fatPerc" label="% Gordura Final" info="Percentual calculado conforme protocolo ou balança." />
                <Input id="fatPerc" type="number" step="0.1" {...form.register("fatPercentage")} className="font-bold text-primary" />
              </div>
            </TabsContent>

            <TabsContent value="circumference" className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-4">
                  <h4 className="text-sm font-bold border-b pb-2">Membros Superiores (cm)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><Label className="text-[10px]">Braço Dir.</Label><Input {...form.register("bracoD")} /></div>
                    <div className="space-y-1"><Label className="text-[10px]">Braço Esq.</Label><Input {...form.register("bracoE")} /></div>
                    <div className="space-y-1"><Label className="text-[10px]">Antebr. Dir.</Label><Input {...form.register("antebracoD")} /></div>
                    <div className="space-y-1"><Label className="text-[10px]">Antebr. Esq.</Label><Input {...form.register("antebracoE")} /></div>
                  </div>
               </div>
               <div className="space-y-4">
                  <h4 className="text-sm font-bold border-b pb-2">Tronco e Inferiores (cm)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><Label className="text-[10px]">Peitoral</Label><Input {...form.register("peitoral")} /></div>
                    <div className="space-y-1"><Label className="text-[10px]">Cintura</Label><Input {...form.register("cintura")} /></div>
                    <div className="space-y-1"><Label className="text-[10px]">Abdômen</Label><Input {...form.register("abdomen")} /></div>
                    <div className="space-y-1"><Label className="text-[10px]">Quadril</Label><Input {...form.register("quadril")} /></div>
                    <div className="space-y-1"><Label className="text-[10px]">Coxa Dir.</Label><Input {...form.register("coxaD")} /></div>
                    <div className="space-y-1"><Label className="text-[10px]">Coxa Esq.</Label><Input {...form.register("coxaE")} /></div>
                  </div>
               </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-6">
               <div className="p-6 bg-accent/5 rounded-3xl border border-accent/20">
                  <h4 className="font-bold text-accent flex items-center gap-2 mb-4">
                     <Zap className="h-5 w-5" /> Capacidade Cardiorrespiratória (VO2)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-4">
                        <LabelWithInfo id="vo2" label="VO2 Máximo (ml/kg/min)" info="Consumo máximo de oxigênio por minuto por kg de peso." />
                        <Input id="vo2" type="number" step="0.1" {...form.register("vo2Max")} placeholder="Ex: 45.5" />
                        <div className="text-xs text-muted-foreground bg-background p-4 rounded-xl border">
                           <p className="font-bold mb-1">Como calcular?</p>
                           <p>Use o teste de Cooper (12 min) ou teste de caminhada Rockport. Insira o valor resultante aqui.</p>
                        </div>
                     </div>
                     <div className="space-y-4">
                        <LabelWithInfo id="onerm" label="Teste de 1RM (kg)" info="Carga máxima para uma única repetição." />
                        <Input id="onerm" type="number" {...form.register("oneRmTest")} placeholder="Ex: 100" />
                     </div>
                  </div>
               </div>
            </TabsContent>
          </Tabs>

          <Button type="submit" className="w-full h-14 text-lg rounded-full font-bold shadow-lg bg-primary hover:bg-primary/90" disabled={loading}>
            {loading ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : <Save className="h-6 w-6 mr-2" />}
            Finalizar e Salvar Avaliação
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}