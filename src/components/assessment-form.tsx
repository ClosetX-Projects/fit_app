
"use client"

import React, { useState, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/tabs-rebuilt" // Custom fixed tabs
import { useToast } from "@/hooks/use-toast"
import { useFirebase, useUser } from "@/firebase"
import { doc, collection, serverTimestamp } from "firebase/firestore"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { Loader2, Save, Activity, Zap, Ruler, Dumbbell, Beaker, ClipboardList } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as ChartTooltip } from 'recharts'

const assessmentSchema = z.object({
  weight: z.coerce.number().min(1),
  height: z.coerce.number().min(1),
  // Antropometria - Circunferências
  waist: z.coerce.number().default(0),
  armR: z.coerce.number().default(0),
  armL: z.coerce.number().default(0),
  forearmR: z.coerce.number().default(0),
  forearmL: z.coerce.number().default(0),
  thighR: z.coerce.number().default(0),
  thighL: z.coerce.number().default(0),
  legR: z.coerce.number().default(0),
  legL: z.coerce.number().default(0),
  // Antropometria - 9 Dobras
  subscapular: z.coerce.number().default(0),
  triceps: z.coerce.number().default(0),
  biceps: z.coerce.number().default(0),
  midAxillary: z.coerce.number().default(0),
  pectoral: z.coerce.number().default(0),
  suprailiac: z.coerce.number().default(0),
  abdominal: z.coerce.number().default(0),
  thigh: z.coerce.number().default(0),
  midLeg: z.coerce.number().default(0),
  // Metabólico
  vo2max: z.coerce.number().default(0),
  // Neuromotor
  tenRmTest: z.coerce.number().default(0),
  sitToStand: z.coerce.number().default(0),
  tug: z.coerce.number().default(0),
  fatPercentage: z.coerce.number().default(0),
})

export function AssessmentForm() {
  const { toast } = useToast()
  const { firestore } = useFirebase()
  const { user } = useUser()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("antropometria")

  const form = useForm<z.infer<typeof assessmentSchema>>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: { weight: 0, height: 0, fatPercentage: 0 }
  })

  const watchedWeight = form.watch("weight")
  const watchedFatPerc = form.watch("fatPercentage")

  const compositionData = useMemo(() => {
    if (!watchedWeight || !watchedFatPerc) return [{ name: 'Massa Magra', value: 100, color: '#8A05BE' }, { name: 'Gordura', value: 0, color: '#E2E2E2' }];
    const fatKg = (watchedWeight * watchedFatPerc) / 100;
    const muscleKg = watchedWeight - fatKg;
    return [
      { name: 'Massa Magra (kg)', value: Number(muscleKg.toFixed(1)), color: '#8A05BE' },
      { name: 'Gordura (kg)', value: Number(fatKg.toFixed(1)), color: '#E2E2E2' }
    ];
  }, [watchedWeight, watchedFatPerc]);

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
    }, { merge: true })
    toast({ title: "Avaliação salva!" })
    setLoading(false)
  }

  return (
    <Card className="border-primary/20 shadow-xl rounded-[2rem] overflow-hidden">
      <CardHeader className="bg-primary/5 p-8 border-b border-primary/10">
        <CardTitle className="text-2xl font-black text-primary flex items-center gap-3">
          <Activity className="h-7 w-7" /> Avaliação da Aptidão Física
        </CardTitle>
        <CardDescription>Antropometria, Metabólico e Neuromotor</CardDescription>
      </CardHeader>
      <CardContent className="p-8">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="flex flex-wrap gap-2 mb-6">
            {["antropometria", "metabolico", "neuromotor", "composicao"].map((tab) => (
              <Button
                key={tab}
                type="button"
                variant={activeTab === tab ? "default" : "outline"}
                onClick={() => setActiveTab(tab)}
                className="rounded-full capitalize font-bold"
              >
                {tab}
              </Button>
            ))}
          </div>

          {activeTab === "antropometria" && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Massa Corporal (kg)</Label>
                  <Input type="number" step="0.1" {...form.register("weight")} className="rounded-xl h-12" />
                </div>
                <div className="space-y-2">
                  <Label>Estatura (cm)</Label>
                  <Input type="number" {...form.register("height")} className="rounded-xl h-12" />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-black uppercase text-primary border-b pb-1">Circunferências (cm)</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1"><Label className="text-[10px]">Abdominal</Label><Input {...form.register("waist")} /></div>
                  <div className="space-y-1"><Label className="text-[10px]">Braço Dir.</Label><Input {...form.register("armR")} /></div>
                  <div className="space-y-1"><Label className="text-[10px]">Braço Esq.</Label><Input {...form.register("armL")} /></div>
                  <div className="space-y-1"><Label className="text-[10px]">Coxa Dir.</Label><Input {...form.register("thighR")} /></div>
                  <div className="space-y-1"><Label className="text-[10px]">Coxa Esq.</Label><Input {...form.register("thighL")} /></div>
                  <div className="space-y-1"><Label className="text-[10px]">Perna Dir.</Label><Input {...form.register("legR")} /></div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-black uppercase text-primary border-b pb-1">Dobras Cutâneas (mm) - As 9 Dobras</h4>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                  {[
                    { id: "triceps", label: "Tric" },
                    { id: "subscapular", label: "Sub" },
                    { id: "biceps", label: "Bic" },
                    { id: "midAxillary", label: "AxM" },
                    { id: "pectoral", label: "Peit" },
                    { id: "suprailiac", label: "SI" },
                    { id: "abdominal", label: "Abd" },
                    { id: "thigh", label: "Cox" },
                    { id: "midLeg", label: "Per" }
                  ].map(d => (
                    <div key={d.id} className="space-y-1">
                      <Label className="text-[10px] font-bold">{d.label}</Label>
                      <Input type="number" step="0.1" {...form.register(d.id as any)} className="h-10" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "metabolico" && (
            <div className="space-y-6">
              <div className="p-6 bg-primary/5 rounded-3xl border border-primary/20">
                <h4 className="text-lg font-bold flex items-center gap-2 mb-4"><Zap className="h-5 w-5" /> Capacidade Aeróbica</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>VO2 Máximo Estimado (ml/kg/min)</Label>
                    <Input type="number" step="0.1" {...form.register("vo2max")} className="h-14 text-xl font-black" />
                  </div>
                  <p className="text-xs text-muted-foreground italic">"Utilize o Teste de Cooper (12 min) ou Rockport (1 milha) para preencher este dado."</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "neuromotor" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 border rounded-3xl space-y-4">
                <h4 className="font-bold flex items-center gap-2"><Dumbbell className="h-5 w-5" /> Força Muscular</h4>
                <div className="space-y-2">
                  <Label>Teste 10 RM (Peso em kg)</Label>
                  <Input type="number" {...form.register("tenRmTest")} placeholder="Carga para 10 repetições" />
                </div>
              </div>
              <div className="p-6 border rounded-3xl space-y-4">
                <h4 className="font-bold flex items-center gap-2"><Activity className="h-5 w-5" /> Funcionalidade</h4>
                <div className="space-y-2">
                  <Label>Sentar e Levantar (Reps/30s)</Label>
                  <Input type="number" {...form.register("sitToStand")} />
                </div>
                <div className="space-y-2">
                  <Label>TUG - Time Up and Go (Segundos)</Label>
                  <Input type="number" step="0.1" {...form.register("tug")} />
                </div>
              </div>
            </div>
          )}

          {activeTab === "composicao" && (
            <div className="flex flex-col items-center gap-8 py-8">
              <div className="w-full max-w-sm space-y-4">
                <Label className="text-center block font-black uppercase tracking-widest text-primary">% de Gordura Estimado</Label>
                <Input type="number" step="0.1" {...form.register("fatPercentage")} className="h-20 text-4xl text-center font-black rounded-3xl border-primary" />
              </div>
              <div className="h-[300px] w-full max-w-md bg-secondary/20 rounded-[3rem] p-8 shadow-inner">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={compositionData} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                      {compositionData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                    </Pie>
                    <ChartTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full h-16 rounded-full text-xl font-black bg-primary" disabled={loading}>
            {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-6 w-6" />}
            SALVAR AVALIAÇÃO COMPLETA
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
