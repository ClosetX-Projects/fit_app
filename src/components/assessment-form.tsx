
"use client"

import React, { useState, useMemo } from "react"
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
import { Loader2, Save, Activity, Zap, Dumbbell, Ruler, ClipboardCheck } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as ChartTooltip } from 'recharts'

const assessmentSchema = z.object({
  weight: z.coerce.number().min(1, "Peso é obrigatório"),
  height: z.coerce.number().min(1, "Estatura é obrigatória"),
  // Circunferências
  waist: z.coerce.number().default(0),
  armR: z.coerce.number().default(0),
  armL: z.coerce.number().default(0),
  forearmR: z.coerce.number().default(0),
  forearmL: z.coerce.number().default(0),
  thighR: z.coerce.number().default(0),
  thighL: z.coerce.number().default(0),
  legR: z.coerce.number().default(0),
  legL: z.coerce.number().default(0),
  // 9 Dobras
  subscapular: z.coerce.number().default(0),
  triceps: z.coerce.number().default(0),
  biceps: z.coerce.number().default(0),
  midAxillary: z.coerce.number().default(0),
  pectoral: z.coerce.number().default(0),
  suprailiac: z.coerce.number().default(0),
  abdominal: z.coerce.number().default(0),
  thigh: z.coerce.number().default(0),
  midLeg: z.coerce.number().default(0),
  // Bio/Resultados
  fatPercentage: z.coerce.number().default(0),
  vo2max: z.coerce.number().default(0),
  tenRmTest: z.coerce.number().default(0),
  sitToStand: z.coerce.number().default(0),
  tug: z.coerce.number().default(0),
})

export function AssessmentForm() {
  const { toast } = useToast()
  const { firestore } = useFirebase()
  const { user } = useUser()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("antropometria")

  const form = useForm<z.infer<typeof assessmentSchema>>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      weight: 0,
      height: 0,
      fatPercentage: 0,
    }
  })

  const watchedWeight = form.watch("weight")
  const watchedHeight = form.watch("height")
  const watchedFatPerc = form.watch("fatPercentage")

  // Cálculos Automáticos
  const results = useMemo(() => {
    const w = Number(watchedWeight) || 0
    const h = Number(watchedHeight) || 0
    const f = Number(watchedFatPerc) || 0

    const imc = h > 0 ? (w / ((h / 100) ** 2)).toFixed(1) : "0.0"
    const fatKg = ((w * f) / 100).toFixed(1)
    const leanPerc = (100 - f).toFixed(1)
    const leanKg = (w - Number(fatKg)).toFixed(1)

    return { imc, fatKg, leanPerc, leanKg, fatPerc: f.toFixed(1) }
  }, [watchedWeight, watchedHeight, watchedFatPerc])

  const compositionData = [
    { name: 'Massa Magra', value: Number(results.leanKg), color: '#8A05BE' },
    { name: 'Gordura', value: Number(results.fatKg), color: '#E2E2E2' }
  ]

  const onSubmit = async (values: any) => {
    if (!user || !firestore) return
    setLoading(true)
    const assessmentRef = doc(collection(firestore, "users", user.uid, "physicalAssessments"))
    
    setDocumentNonBlocking(assessmentRef, {
      ...values,
      id: assessmentRef.id,
      userId: user.uid,
      date: new Date().toISOString(),
      createdAt: serverTimestamp(),
      calculatedResults: results,
    }, { merge: true })

    toast({ title: "Avaliação salva com sucesso!" })
    setLoading(false)
  }

  return (
    <Card className="border-primary/20 shadow-xl rounded-[2rem] overflow-hidden bg-background">
      <CardHeader className="bg-primary/5 p-8 border-b border-primary/10 text-center">
        <CardTitle className="text-3xl font-black text-primary uppercase tracking-tighter">
          AVALIAÇÃO DA APTIDÃO FÍSICA
        </CardTitle>
        <CardDescription>Protocolo completo de Antropometria e Composição Corporal</CardDescription>
      </CardHeader>
      
      <CardContent className="p-8">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
          
          {/* Painel de Resultados Rápidos */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-muted/50 p-4 rounded-3xl text-center border border-primary/5">
              <p className="text-[10px] font-black uppercase text-muted-foreground">IMC</p>
              <p className="text-2xl font-black text-primary">{results.imc}</p>
            </div>
            <div className="bg-primary/10 p-4 rounded-3xl text-center border border-primary/20">
              <p className="text-[10px] font-black uppercase text-primary">% Gordura</p>
              <p className="text-2xl font-black">{results.fatPerc}%</p>
            </div>
            <div className="bg-muted/50 p-4 rounded-3xl text-center">
              <p className="text-[10px] font-black uppercase text-muted-foreground">Gordura (kg)</p>
              <p className="text-2xl font-black">{results.fatKg} kg</p>
            </div>
            <div className="bg-primary/10 p-4 rounded-3xl text-center border border-primary/20">
              <p className="text-[10px] font-black uppercase text-primary">% Magra</p>
              <p className="text-2xl font-black">{results.leanPerc}%</p>
            </div>
            <div className="bg-muted/50 p-4 rounded-3xl text-center">
              <p className="text-[10px] font-black uppercase text-muted-foreground">Magra (kg)</p>
              <p className="text-2xl font-black">{results.leanKg} kg</p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-muted rounded-2xl mb-8">
              <TabsTrigger value="antropometria" className="rounded-xl py-3 text-xs font-bold uppercase">Antropometria</TabsTrigger>
              <TabsTrigger value="metabolico" className="rounded-xl py-3 text-xs font-bold uppercase">Metabólico</TabsTrigger>
              <TabsTrigger value="neuromotor" className="rounded-xl py-3 text-xs font-bold uppercase">Neuromotor</TabsTrigger>
              <TabsTrigger value="composicao" className="rounded-xl py-3 text-xs font-bold uppercase">Composição</TabsTrigger>
            </TabsList>

            <TabsContent value="antropometria" className="space-y-8 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-sm font-black uppercase text-primary border-b pb-1 flex items-center gap-2">
                    <Ruler className="h-4 w-4" /> Dados Básicos
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Massa Corporal (kg)</Label>
                      <Input type="number" step="0.1" {...form.register("weight")} className="rounded-xl h-12 text-lg font-bold" />
                    </div>
                    <div className="space-y-2">
                      <Label>Estatura (cm)</Label>
                      <Input type="number" {...form.register("height")} className="rounded-xl h-12 text-lg font-bold" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-black uppercase text-primary border-b pb-1">Circunferências (cm)</h4>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-[11px] whitespace-nowrap">Abdominal</Label>
                      <Input {...form.register("waist")} className="w-20 h-9" />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-[11px] whitespace-nowrap">Braço D.</Label>
                      <Input {...form.register("armR")} className="w-20 h-9" />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-[11px] whitespace-nowrap">Braço E.</Label>
                      <Input {...form.register("armL")} className="w-20 h-9" />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-[11px] whitespace-nowrap">Antebraço D.</Label>
                      <Input {...form.register("forearmR")} className="w-20 h-9" />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-[11px] whitespace-nowrap">Antebraço E.</Label>
                      <Input {...form.register("forearmL")} className="w-20 h-9" />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-[11px] whitespace-nowrap">Coxa D.</Label>
                      <Input {...form.register("thighR")} className="w-20 h-9" />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-[11px] whitespace-nowrap">Coxa E.</Label>
                      <Input {...form.register("thighL")} className="w-20 h-9" />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-[11px] whitespace-nowrap">Perna D.</Label>
                      <Input {...form.register("legR")} className="w-20 h-9" />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-[11px] whitespace-nowrap">Perna E.</Label>
                      <Input {...form.register("legL")} className="w-20 h-9" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-black uppercase text-primary border-b pb-1">Dobras Cutâneas (mm) - As 9 Dobras</h4>
                <div className="grid grid-cols-3 md:grid-cols-9 gap-4">
                  {[
                    { id: "subscapular", label: "Sub" },
                    { id: "triceps", label: "Tric" },
                    { id: "biceps", label: "Bic" },
                    { id: "midAxillary", label: "AxM" },
                    { id: "pectoral", label: "Peit" },
                    { id: "suprailiac", label: "SI" },
                    { id: "abdominal", label: "Abd" },
                    { id: "thigh", label: "Cox" },
                    { id: "midLeg", label: "Per" }
                  ].map(d => (
                    <div key={d.id} className="space-y-1 text-center">
                      <Label className="text-[10px] font-bold">{d.label}</Label>
                      <Input type="number" step="0.1" {...form.register(d.id as any)} className="h-10 text-center" />
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="metabolico" className="space-y-6">
              <div className="p-8 bg-primary/5 rounded-[2rem] border border-primary/20 text-center">
                <Zap className="h-8 w-8 mx-auto mb-4 text-primary" />
                <h4 className="text-xl font-bold mb-2">Capacidade Aeróbica (VO2 Máx)</h4>
                <div className="max-w-xs mx-auto space-y-4">
                  <div className="space-y-2">
                    <Label>VO2 Máximo Estimado (ml/kg/min)</Label>
                    <Input type="number" step="0.1" {...form.register("vo2max")} className="h-16 text-2xl text-center font-black rounded-2xl" />
                  </div>
                  <p className="text-xs text-muted-foreground italic">Use protocolos como Cooper (12 min) ou Rockport para preencher.</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="neuromotor" className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="rounded-3xl p-6 border-primary/10">
                <h4 className="font-bold flex items-center gap-2 mb-4"><Dumbbell className="h-5 w-5 text-primary" /> Força Muscular</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Teste 10 RM (Peso em kg)</Label>
                    <Input type="number" {...form.register("tenRmTest")} placeholder="Carga para 10 reps" />
                  </div>
                  <div className="p-3 bg-muted rounded-xl text-xs">
                    <p className="font-bold text-primary">Estimativa de 1 RM:</p>
                    <p className="text-lg font-black">{(Number(form.watch("tenRmTest")) * 1.33).toFixed(1)} kg</p>
                  </div>
                </div>
              </Card>
              <Card className="rounded-3xl p-6 border-primary/10">
                <h4 className="font-bold flex items-center gap-2 mb-4"><Activity className="h-5 w-5 text-primary" /> Funcionalidade</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Sentar e Levantar (Reps/30s)</Label>
                    <Input type="number" {...form.register("sitToStand")} />
                  </div>
                  <div className="space-y-2">
                    <Label>TUG - Time Up and Go (Segundos)</Label>
                    <Input type="number" step="0.1" {...form.register("tug")} />
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="composicao" className="flex flex-col items-center gap-8 py-4">
              <div className="w-full max-w-sm space-y-4 text-center">
                <Label className="font-black uppercase tracking-widest text-primary">Percentual de Gordura Final (%)</Label>
                <Input type="number" step="0.1" {...form.register("fatPercentage")} className="h-24 text-5xl text-center font-black rounded-[2.5rem] border-primary shadow-xl" />
                <p className="text-xs text-muted-foreground">Insira o dado da bioimpedância ou do cálculo por dobras.</p>
              </div>
              
              <div className="h-[300px] w-full max-w-md bg-secondary/20 rounded-[3rem] p-8 shadow-inner relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={compositionData} 
                      innerRadius={60} 
                      outerRadius={90} 
                      paddingAngle={5} 
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={1500}
                    >
                      {compositionData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                    </Pie>
                    <ChartTooltip />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
          </Tabs>

          <Button type="submit" className="w-full h-20 rounded-full text-2xl font-black bg-primary shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform" disabled={loading}>
            {loading ? <Loader2 className="animate-spin mr-2" /> : <ClipboardCheck className="mr-3 h-8 w-8" />}
            SALVAR AVALIAÇÃO COMPLETA
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
