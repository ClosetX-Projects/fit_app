
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
import { Loader2, Save, Activity, Zap, HelpCircle, Info, Calculator, PieChart as PieIcon, Ruler } from "lucide-react"
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
  // Dobras Cutâneas (Composição Corporal)
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
      bracoD: 0, bracoE: 0, coxaD: 0, coxaE: 0,
    },
  })

  const watchedWeight = form.watch("weight")
  const watchedFatPerc = form.watch("fatPercentage")
  const watchedHeight = form.watch("height")

  const imc = useMemo(() => {
    if (!watchedWeight || !watchedHeight) return 0;
    const h = watchedHeight / 100;
    return (watchedWeight / (h * h)).toFixed(1);
  }, [watchedWeight, watchedHeight]);

  const compositionData = useMemo(() => {
    if (!watchedWeight || !watchedFatPerc) return [{ name: 'Massa Magra', value: 100, color: '#8A05BE' }, { name: 'Gordura', value: 0, color: '#E2E2E2' }];
    const fatKg = (watchedWeight * watchedFatPerc) / 100;
    const muscleKg = watchedWeight - fatKg;
    return [
      { name: 'Massa Magra (kg)', value: Number(muscleKg.toFixed(1)), color: '#8A05BE' },
      { name: 'Gordura (kg)', value: Number(fatKg.toFixed(1)), color: '#E2E2E2' }
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
      <Label htmlFor={id} className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</Label>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-3 w-3 text-primary cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-[200px] bg-primary text-white p-3 rounded-xl shadow-xl"><p className="text-xs">{info}</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )

  return (
    <Card className="w-full max-w-5xl mx-auto border-primary/20 shadow-2xl rounded-[2rem] overflow-hidden">
      <CardHeader className="bg-primary/5 p-8 border-b border-primary/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-3xl font-black text-primary flex items-center gap-3">
              <Activity className="h-8 w-8" /> Avaliação Física Profissional
            </CardTitle>
            <CardDescription className="text-sm font-medium">Protocolos avançados e controle de composição corporal.</CardDescription>
          </div>
          <div className="flex items-center gap-3 bg-white p-4 rounded-2xl shadow-sm border">
            <Calculator className="h-5 w-5 text-primary" />
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground">IMC Estimado</p>
              <p className="text-xl font-black text-primary">{imc}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-8">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
          <Tabs defaultValue="composition" className="w-full">
            <TabsList className="flex flex-wrap h-auto p-1.5 bg-muted rounded-2xl mb-10 gap-1">
              <TabsTrigger value="basic" className="rounded-xl py-3 px-6 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">Básicos</TabsTrigger>
              <TabsTrigger value="composition" className="rounded-xl py-3 px-6 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">Composição Corporal</TabsTrigger>
              <TabsTrigger value="circumference" className="rounded-xl py-3 px-6 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">Circunferências</TabsTrigger>
              <TabsTrigger value="performance" className="rounded-xl py-3 px-6 font-bold data-[state=active]:bg-primary data-[state=active]:text-white">Performance</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="space-y-2">
                  <LabelWithInfo id="weight" label="Peso Total (kg)" info="Massa corporal total medida na balança." />
                  <Input id="weight" type="number" step="0.1" {...form.register("weight")} className="h-14 text-lg font-bold rounded-2xl" />
                </div>
                <div className="space-y-2">
                  <LabelWithInfo id="height" label="Estatura (cm)" info="Sua altura total em centímetros." />
                  <Input id="height" type="number" {...form.register("height")} className="h-14 text-lg font-bold rounded-2xl" />
                </div>
                <div className="p-6 bg-primary/5 rounded-3xl border border-primary/20">
                   <h4 className="text-xs font-black uppercase tracking-widest text-primary mb-4">Dica de Medição</h4>
                   <p className="text-sm italic">"Para melhores resultados, realize a pesagem em jejum, preferencialmente no mesmo horário."</p>
                </div>
              </div>
              <div className="bg-secondary/30 rounded-[2.5rem] p-10 flex flex-col items-center justify-center shadow-inner">
                 <p className="text-sm font-black text-primary uppercase tracking-widest mb-6">Divisão de Massa Corporal</p>
                 <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={compositionData} innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value">
                        {compositionData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                      </Pie>
                      <ChartTooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                 </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="composition" className="space-y-10">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
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
                  <div key={dobra.id} className="space-y-2 group">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground group-focus-within:text-primary transition-colors">{dobra.label} (mm)</Label>
                    <Input type="number" step="0.1" {...form.register(dobra.id as any)} className="h-12 rounded-xl border-primary/10 focus:border-primary/50" />
                  </div>
                ))}
              </div>
              <div className="p-8 bg-primary text-white rounded-[2rem] shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                  <h4 className="text-lg font-black uppercase tracking-tight">Cálculo de Composição</h4>
                  <p className="text-xs opacity-80 font-medium">Informe o percentual final para gerar o gráfico de KG.</p>
                </div>
                <div className="w-full md:w-48 space-y-2">
                  <Label className="text-xs font-black uppercase text-white/70">Gordura Corporal (%)</Label>
                  <Input type="number" step="0.1" {...form.register("fatPercentage")} className="h-14 bg-white/20 border-none text-white text-2xl font-black rounded-2xl placeholder:text-white/40" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="circumference" className="grid grid-cols-1 md:grid-cols-2 gap-10">
               <div className="space-y-6">
                  <h4 className="text-sm font-black uppercase text-primary border-b-2 border-primary/10 pb-2">Membros Superiores (cm)</h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2"><Label className="text-[10px] font-bold">Braço Dir.</Label><Input {...form.register("bracoD")} className="rounded-xl" /></div>
                    <div className="space-y-2"><Label className="text-[10px] font-bold">Braço Esq.</Label><Input {...form.register("bracoE")} className="rounded-xl" /></div>
                    <div className="space-y-2"><Label className="text-[10px] font-bold">Antebr. Dir.</Label><Input {...form.register("antebracoD")} className="rounded-xl" /></div>
                    <div className="space-y-2"><Label className="text-[10px] font-bold">Antebr. Esq.</Label><Input {...form.register("antebracoE")} className="rounded-xl" /></div>
                  </div>
               </div>
               <div className="space-y-6">
                  <h4 className="text-sm font-black uppercase text-primary border-b-2 border-primary/10 pb-2">Tronco e Inferiores (cm)</h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2"><Label className="text-[10px] font-bold">Peitoral</Label><Input {...form.register("peitoral")} className="rounded-xl" /></div>
                    <div className="space-y-2"><Label className="text-[10px] font-bold">Quadril</Label><Input {...form.register("quadril")} className="rounded-xl" /></div>
                    <div className="space-y-2"><Label className="text-[10px] font-bold">Coxa Dir.</Label><Input {...form.register("coxaD")} className="rounded-xl" /></div>
                    <div className="space-y-2"><Label className="text-[10px] font-bold">Coxa Esq.</Label><Input {...form.register("coxaE")} className="rounded-xl" /></div>
                  </div>
               </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-8">
               <div className="p-8 bg-accent/5 rounded-[2.5rem] border-2 border-dashed border-accent/20">
                  <h4 className="text-xl font-black text-accent flex items-center gap-3 mb-6">
                     <Zap className="h-6 w-6" /> Performance e VO2 Max
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                     <div className="space-y-6">
                        <LabelWithInfo id="vo2" label="VO2 Máximo (ml/kg/min)" info="Capacidade aeróbica máxima." />
                        <Input id="vo2" type="number" step="0.1" {...form.register("vo2Max")} placeholder="Ex: 45.5" className="h-14 rounded-2xl text-lg font-bold" />
                        <div className="text-sm bg-white p-6 rounded-3xl border shadow-sm">
                           <p className="font-black text-primary uppercase text-xs mb-2">Instruções do Teste</p>
                           <ul className="space-y-2 text-xs text-muted-foreground list-disc pl-4">
                              <li>Realize o teste de Cooper (corrida de 12 min) para estimar este valor.</li>
                              <li>Mantenha um ritmo constante para maior precisão.</li>
                              <li>Utilize a fórmula: VO2 = (Distância em metros - 504.9) / 44.73</li>
                           </ul>
                        </div>
                     </div>
                     <div className="space-y-6">
                        <LabelWithInfo id="onerm" label="Força Máxima (1RM kg)" info="Carga máxima para uma repetição completa." />
                        <Input id="onerm" type="number" {...form.register("oneRmTest")} placeholder="Ex: 120" className="h-14 rounded-2xl text-lg font-bold" />
                        <div className="p-6 bg-accent/10 rounded-3xl">
                           <p className="text-xs font-bold text-accent italic">"O teste de 1RM é fundamental para prescrever as zonas de intensidade de treinamento corretas."</p>
                        </div>
                     </div>
                  </div>
               </div>
            </TabsContent>
          </Tabs>

          <Button type="submit" className="w-full h-20 text-xl rounded-full font-black shadow-2xl bg-primary hover:bg-primary/90 transition-all active:scale-[0.98]" disabled={loading}>
            {loading ? <Loader2 className="h-8 w-8 animate-spin mr-3" /> : <Save className="h-8 w-8 mr-3" />}
            FINALIZAR E SALVAR AVALIAÇÃO
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
