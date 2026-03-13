
"use client"

import React, { useState, useMemo, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useFirebase, useUser, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { doc, collection, serverTimestamp, query, orderBy } from "firebase/firestore"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { Loader2, Save, Activity, Zap, Dumbbell, Ruler, ClipboardCheck, History, PlusCircle, ChevronRight, Calendar, Info } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as ChartTooltip } from 'recharts'
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ScrollArea } from "@/components/ui/scroll-area"

const assessmentSchema = z.object({
  weight: z.coerce.number().min(0).default(0),
  height: z.coerce.number().min(0).default(0),
  // Circunferências
  waist: z.coerce.number().default(0),
  hip: z.coerce.number().default(0),
  armR: z.coerce.number().default(0),
  armL: z.coerce.number().default(0),
  armContractedR: z.coerce.number().default(0),
  armContractedL: z.coerce.number().default(0),
  thighR: z.coerce.number().default(0),
  thighL: z.coerce.number().default(0),
  calfR: z.coerce.number().default(0),
  calfL: z.coerce.number().default(0),
  // Dobras
  subscapular: z.coerce.number().default(0),
  triceps: z.coerce.number().default(0),
  pectoral: z.coerce.number().default(0),
  suprailiac: z.coerce.number().default(0),
  thigh: z.coerce.number().default(0),
  abdominal: z.coerce.number().default(0),
  // Resultados
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
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const profileRef = useMemoFirebase(() => user ? doc(firestore, "users", user.uid) : null, [firestore, user])
  const { data: profile } = useDoc(profileRef)

  const historyQuery = useMemoFirebase(() => 
    user ? query(collection(firestore, "users", user.uid, "physicalAssessments"), orderBy("date", "desc")) : null
  , [firestore, user])
  
  const { data: history, isLoading: isHistoryLoading } = useCollection(historyQuery)

  const form = useForm<z.infer<typeof assessmentSchema>>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: { weight: 0, height: 0 }
  })

  useEffect(() => {
    if (selectedId && history) {
      const assessment = history.find(a => a.id === selectedId)
      if (assessment) {
        form.reset({
          weight: assessment.weight || 0,
          height: assessment.height || 0,
          waist: assessment.waist || 0,
          hip: assessment.hip || 0,
          armR: assessment.armR || 0,
          armL: assessment.armL || 0,
          armContractedR: assessment.armContractedR || 0,
          armContractedL: assessment.armContractedL || 0,
          thighR: assessment.thighR || 0,
          thighL: assessment.thighL || 0,
          calfR: assessment.calfR || 0,
          calfL: assessment.calfL || 0,
          subscapular: assessment.subscapular || 0,
          triceps: assessment.triceps || 0,
          pectoral: assessment.pectoral || 0,
          suprailiac: assessment.suprailiac || 0,
          thigh: assessment.thigh || 0,
          abdominal: assessment.abdominal || 0,
          vo2max: assessment.vo2max || 0,
          tenRmTest: assessment.tenRmTest || 0,
          sitToStand: assessment.sitToStand || 0,
          tug: assessment.tug || 0,
        })
      }
    }
  }, [selectedId, history, form])

  const watchedValues = form.watch()
  const gender = profile?.gender || "male"
  const age = profile?.age || 30

  const results = useMemo(() => {
    const { weight: w, height: h, subscapular: sub, triceps: tri, pectoral: pec, suprailiac: sup, thigh: t } = watchedValues
    const imc = h > 0 ? (w / ((h / 100) ** 2)) : 0
    
    let fatPerc = 0
    if (gender === 'male') {
      const sum = sub + tri + pec
      const dens = 1.1125025 - (0.0013125 * sum) + (0.0000055 * (sum ** 2)) - (0.000244 * age)
      fatPerc = ((4.95 / dens) - 4.5) * 100
    } else {
      const sum = tri + sup + t
      const dens = 1.099492 - (0.0009929 * sum) + (0.0000023 * (sum ** 2)) - (0.0001392 * age)
      fatPerc = ((4.95 / dens) - 4.5) * 100
    }

    const fatKg = (w * fatPerc) / 100
    const leanKg = w - fatKg

    let classification = ""
    if (gender === 'male') {
      if (fatPerc < 12) classification = "Abaixo do normal"
      else if (fatPerc <= 18) classification = "Normal"
      else if (fatPerc <= 25) classification = "Acima do normal"
      else classification = "Tendência a obesidade"
    } else {
      if (fatPerc < 16) classification = "Abaixo do normal"
      else if (fatPerc <= 25) classification = "Normal"
      else if (fatPerc <= 33) classification = "Acima do normal"
      else classification = "Tendência a obesidade"
    }

    return { 
      imc: imc.toFixed(1), 
      fatPerc: Math.max(0, fatPerc).toFixed(1), 
      fatKg: Math.max(0, fatKg).toFixed(1), 
      leanKg: Math.max(0, leanKg).toFixed(1),
      classification 
    }
  }, [watchedValues, gender, age])

  const compositionData = [
    { name: 'Massa Magra', value: Math.max(0.1, Number(results.leanKg)), color: '#7E3F8F' },
    { name: 'Gordura', value: Math.max(0.1, Number(results.fatKg)), color: '#E2E2E2' }
  ]

  const onSubmit = async (values: any) => {
    if (!user || !firestore) return
    setLoading(true)
    
    const assessmentRef = selectedId 
      ? doc(firestore, "users", user.uid, "physicalAssessments", selectedId)
      : doc(collection(firestore, "users", user.uid, "physicalAssessments"))
    
    setDocumentNonBlocking(assessmentRef, {
      ...values,
      id: assessmentRef.id,
      userId: user.uid,
      date: selectedId ? history?.find(h => h.id === selectedId)?.date : new Date().toISOString(),
      updatedAt: serverTimestamp(),
      calculatedResults: results,
      gender,
      age
    }, { merge: true })

    toast({ title: selectedId ? "Avaliação atualizada!" : "Nova avaliação salva!" })
    if (!selectedId) setSelectedId(assessmentRef.id)
    setLoading(false)
  }

  const handleNew = () => {
    setSelectedId(null)
    form.reset({ weight: 0, height: 0 })
    setActiveTab("antropometria")
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto">
      <Card className="lg:col-span-3 h-fit border-primary/10 rounded-3xl overflow-hidden shadow-lg">
        <CardHeader className="bg-primary/5 p-6 border-b">
          <CardTitle className="text-sm font-black flex items-center gap-2 uppercase">
            <History className="h-4 w-4 text-primary" /> Histórico
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleNew} className="w-full justify-start mt-2 h-10 rounded-xl hover:bg-primary/10 text-primary font-bold">
            <PlusCircle className="mr-2 h-4 w-4" /> Nova Avaliação
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {isHistoryLoading ? (
              <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
            ) : history?.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={`w-full text-left p-4 transition-all hover:bg-primary/5 flex items-center justify-between group ${selectedId === item.id ? 'bg-primary/10 border-l-4 border-l-primary' : ''}`}
              >
                <div>
                  <p className="text-sm font-bold">{format(new Date(item.date), "dd/MM/yyyy")}</p>
                  <p className="text-[10px] uppercase font-black text-muted-foreground mt-1">
                    {item.weight}kg | {item.calculatedResults?.fatPerc}% Gord.
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="lg:col-span-9 border-primary/20 shadow-2xl rounded-[2.5rem] overflow-hidden bg-background">
        <CardHeader className="bg-primary/5 p-8 border-b border-primary/10 text-center">
          <CardTitle className="text-3xl font-black text-primary uppercase tracking-tighter">AVALIAÇÃO ANTROPOMÉTRICA</CardTitle>
          <CardDescription>Protocolo Jackson & Pollock (3 Dobras)</CardDescription>
        </CardHeader>
        
        <CardContent className="p-8">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "IMC", val: results.imc, bg: "bg-muted/50" },
                { label: "% Gordura", val: `${results.fatPerc}%`, bg: "bg-primary/10", border: "border-primary/20" },
                { label: "Massa Magra", val: `${results.leanKg} kg`, bg: "bg-accent/10", border: "border-accent/20" },
                { label: "Classificação", val: results.classification, bg: "bg-muted/50", full: true }
              ].map((res, i) => (
                <div key={i} className={`${res.bg} p-4 rounded-3xl text-center border ${res.border || 'border-transparent'} ${res.full ? 'col-span-2' : ''}`}>
                  <p className="text-[10px] font-black uppercase text-muted-foreground">{res.label}</p>
                  <p className="text-lg font-black">{res.val}</p>
                </div>
              ))}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-muted rounded-2xl mb-8">
                <TabsTrigger value="antropometria" className="rounded-xl py-3 text-xs font-bold uppercase">Antropometria</TabsTrigger>
                <TabsTrigger value="dobras" className="rounded-xl py-3 text-xs font-bold uppercase">Dobras</TabsTrigger>
                <TabsTrigger value="neuromotor" className="rounded-xl py-3 text-xs font-bold uppercase">Funcional</TabsTrigger>
                <TabsTrigger value="composicao" className="rounded-xl py-3 text-xs font-bold uppercase">Gráfico</TabsTrigger>
              </TabsList>

              <TabsContent value="antropometria" className="space-y-8 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-sm font-black uppercase text-primary border-b pb-1">Básicos</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Peso (kg)</Label><Input type="number" step="0.1" {...form.register("weight")} /></div>
                      <div className="space-y-2"><Label>Altura (cm)</Label><Input type="number" {...form.register("height")} /></div>
                    </div>
                    <div className="space-y-2"><Label>Quadril (cm)</Label><Input type="number" step="0.1" {...form.register("hip")} /></div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-sm font-black uppercase text-primary border-b pb-1">Membros (cm)</h4>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                      {[
                        { id: "waist", label: "Abdominal" },
                        { id: "armR", label: "Braço D." },
                        { id: "armContractedR", label: "B. Cont. D." },
                        { id: "armContractedL", label: "B. Cont. E." },
                        { id: "thighR", label: "Coxa D." },
                        { id: "calfR", label: "Pant. D." },
                        { id: "calfL", label: "Pant. E." }
                      ].map(f => (
                        <div key={f.id} className="flex items-center justify-between gap-2">
                          <Label className="text-[11px]">{f.label}</Label>
                          <Input {...form.register(f.id as any)} className="w-16 h-8" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="dobras" className="space-y-6">
                <div className="bg-primary/5 p-4 rounded-2xl flex items-start gap-3 mb-4">
                  <Info className="h-4 w-4 text-primary shrink-0 mt-1" />
                  <p className="text-xs text-muted-foreground leading-tight">
                    O cálculo automático utiliza: <br/>
                    <strong>Homens:</strong> Peitoral, Tríceps, Subescapular. <br/>
                    <strong>Mulheres:</strong> Tríceps, Supra-ilíaca, Coxa.
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {[
                    { id: "triceps", label: "Tríceps" },
                    { id: "subscapular", label: "Subescapular" },
                    { id: "pectoral", label: "Peitoral" },
                    { id: "suprailiac", label: "Supra-ilíaca" },
                    { id: "abdominal", label: "Abdominal" },
                    { id: "thigh", label: "Coxa" }
                  ].map(d => (
                    <div key={d.id} className="space-y-2">
                      <Label className="text-xs font-bold uppercase">{d.label} (mm)</Label>
                      <Input type="number" step="0.1" {...form.register(d.id as any)} className="h-12 text-lg font-bold" />
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="neuromotor" className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="rounded-3xl p-6 border-primary/10">
                  <h4 className="font-bold flex items-center gap-2 mb-4 text-primary"><Dumbbell className="h-5 w-5" /> Força & VO2</h4>
                  <div className="space-y-4">
                    <div className="space-y-2"><Label>Teste 10 RM (kg)</Label><Input type="number" {...form.register("tenRmTest")} /></div>
                    <div className="space-y-2"><Label>VO2 Máximo Estimado</Label><Input type="number" step="0.1" {...form.register("vo2max")} /></div>
                  </div>
                </Card>
                <Card className="rounded-3xl p-6 border-accent/10">
                  <h4 className="font-bold flex items-center gap-2 mb-4 text-accent"><Activity className="h-5 w-5" /> Funcional</h4>
                  <div className="space-y-4">
                    <div className="space-y-2"><Label>Sentar e Levantar (reps)</Label><Input type="number" {...form.register("sitToStand")} /></div>
                    <div className="space-y-2"><Label>TUG (segundos)</Label><Input type="number" step="0.1" {...form.register("tug")} /></div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="composicao" className="flex flex-col items-center py-4">
                <div className="h-[300px] w-full max-w-md bg-secondary/10 rounded-[3rem] p-8 shadow-inner">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={compositionData} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value">
                        {compositionData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                      </Pie>
                      <ChartTooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
            </Tabs>

            <Button type="submit" className="w-full h-20 rounded-full text-2xl font-black bg-primary shadow-xl hover:scale-[1.01] transition-transform" disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-3 h-8 w-8" />}
              SALVAR AVALIAÇÃO
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
