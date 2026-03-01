
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
import { useFirebase, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { doc, collection, serverTimestamp, query, orderBy } from "firebase/firestore"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { Loader2, Save, Activity, Zap, Dumbbell, Ruler, ClipboardCheck, History, PlusCircle, ChevronRight, Calendar } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as ChartTooltip } from 'recharts'
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ScrollArea } from "@/components/ui/scroll-area"

const assessmentSchema = z.object({
  weight: z.coerce.number().min(0).default(0),
  height: z.coerce.number().min(0).default(0),
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
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Buscar Histórico Real
  const historyQuery = useMemoFirebase(() => 
    user ? query(collection(firestore, "users", user.uid, "physicalAssessments"), orderBy("date", "desc")) : null
  , [firestore, user])
  
  const { data: history, isLoading: isHistoryLoading } = useCollection(historyQuery)

  const form = useForm<z.infer<typeof assessmentSchema>>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      weight: 0,
      height: 0,
      fatPercentage: 0,
    }
  })

  // Carregar dados ao selecionar do histórico
  useEffect(() => {
    if (selectedId && history) {
      const assessment = history.find(a => a.id === selectedId)
      if (assessment) {
        form.reset({
          weight: assessment.weight || 0,
          height: assessment.height || 0,
          waist: assessment.waist || 0,
          armR: assessment.armR || 0,
          armL: assessment.armL || 0,
          forearmR: assessment.forearmR || 0,
          forearmL: assessment.forearmL || 0,
          thighR: assessment.thighR || 0,
          thighL: assessment.thighL || 0,
          legR: assessment.legR || 0,
          legL: assessment.legL || 0,
          subscapular: assessment.subscapular || 0,
          triceps: assessment.triceps || 0,
          biceps: assessment.biceps || 0,
          midAxillary: assessment.midAxillary || 0,
          pectoral: assessment.pectoral || 0,
          suprailiac: assessment.suprailiac || 0,
          abdominal: assessment.abdominal || 0,
          thigh: assessment.thigh || 0,
          midLeg: assessment.midLeg || 0,
          fatPercentage: assessment.fatPercentage || 0,
          vo2max: assessment.vo2max || 0,
          tenRmTest: assessment.tenRmTest || 0,
          sitToStand: assessment.sitToStand || 0,
          tug: assessment.tug || 0,
        })
      }
    }
  }, [selectedId, history, form])

  const watchedWeight = form.watch("weight")
  const watchedHeight = form.watch("height")
  const watchedFatPerc = form.watch("fatPercentage")

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
    { name: 'Massa Magra', value: Math.max(0.1, Number(results.leanKg)), color: '#8A05BE' },
    { name: 'Gordura', value: Math.max(0.1, Number(results.fatKg)), color: '#E2E2E2' }
  ]

  const onSubmit = async (values: any) => {
    if (!user || !firestore) return
    setLoading(true)
    
    // Se tiver ID selecionado, atualiza, senão cria novo
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
    }, { merge: true })

    toast({ 
      title: selectedId ? "Avaliação atualizada!" : "Nova avaliação salva!", 
      description: "Os dados foram sincronizados com seu professor." 
    })
    
    if (!selectedId) setSelectedId(assessmentRef.id)
    setLoading(false)
  }

  const handleNew = () => {
    setSelectedId(null)
    form.reset({
      weight: 0,
      height: 0,
      fatPercentage: 0,
      waist: 0,
      armR: 0,
      armL: 0,
      forearmR: 0,
      forearmL: 0,
      thighR: 0,
      thighL: 0,
      legR: 0,
      legL: 0,
      subscapular: 0,
      triceps: 0,
      biceps: 0,
      midAxillary: 0,
      pectoral: 0,
      suprailiac: 0,
      abdominal: 0,
      thigh: 0,
      midLeg: 0,
      fatPercentage: 0,
      vo2max: 0,
      tenRmTest: 0,
      sitToStand: 0,
      tug: 0,
    })
    setActiveTab("antropometria")
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto">
      {/* Sidebar de Histórico */}
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
            ) : history && history.length > 0 ? (
              <div className="divide-y divide-primary/5">
                {history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full text-left p-4 transition-all hover:bg-primary/5 flex items-center justify-between group ${selectedId === item.id ? 'bg-primary/10 border-l-4 border-l-primary' : ''}`}
                  >
                    <div>
                      <p className="text-sm font-bold flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {format(new Date(item.date), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                      <p className="text-[10px] uppercase font-black text-muted-foreground mt-1">
                        {item.weight}kg | {item.fatPercentage}% Gord.
                      </p>
                    </div>
                    <ChevronRight className={`h-4 w-4 transition-transform ${selectedId === item.id ? 'text-primary translate-x-1' : 'text-muted-foreground opacity-0 group-hover:opacity-100'}`} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-muted-foreground italic">Nenhuma avaliação encontrada.</div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Formulário Principal */}
      <Card className="lg:col-span-9 border-primary/20 shadow-2xl rounded-[2.5rem] overflow-hidden bg-background">
        <CardHeader className="bg-primary/5 p-8 border-b border-primary/10 text-center">
          <CardTitle className="text-3xl font-black text-primary uppercase tracking-tighter">
            {selectedId ? "EDITAR AVALIAÇÃO" : "NOVA AVALIAÇÃO DA APTIDÃO"}
          </CardTitle>
          <CardDescription>Dados antropométricos e funcionais completos</CardDescription>
        </CardHeader>
        
        <CardContent className="p-8">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
            
            {/* Painel de Resultados Rápidos */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "IMC", val: results.imc, bg: "bg-muted/50", text: "text-muted-foreground" },
                { label: "% Gordura", val: `${results.fatPerc}%`, bg: "bg-primary/10", text: "text-primary", border: "border-primary/20" },
                { label: "Gordura (kg)", val: `${results.fatKg} kg`, bg: "bg-muted/50", text: "text-muted-foreground" },
                { label: "% Magra", val: `${results.leanPerc}%`, bg: "bg-primary/10", text: "text-primary", border: "border-primary/20" },
                { label: "Magra (kg)", val: `${results.leanKg} kg`, bg: "bg-muted/50", text: "text-muted-foreground" }
              ].map((res, i) => (
                <div key={i} className={`${res.bg} p-4 rounded-3xl text-center border ${res.border || 'border-transparent'}`}>
                  <p className={`text-[10px] font-black uppercase ${res.text}`}>{res.label}</p>
                  <p className="text-xl font-black">{res.val}</p>
                </div>
              ))}
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
                      {[
                        { id: "waist", label: "Abdominal" },
                        { id: "armR", label: "Braço D." },
                        { id: "armL", label: "Braço E." },
                        { id: "forearmR", label: "Antebraço D." },
                        { id: "forearmL", label: "Antebraço E." },
                        { id: "thighR", label: "Coxa D." },
                        { id: "thighL", label: "Coxa E." },
                        { id: "legR", label: "Perna D." },
                        { id: "legL", label: "Perna E." }
                      ].map(f => (
                        <div key={f.id} className="flex items-center justify-between gap-2">
                          <Label className="text-[11px] whitespace-nowrap">{f.label}</Label>
                          <Input {...form.register(f.id as any)} className="w-20 h-9" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-black uppercase text-primary border-b pb-1">Dobras Cutâneas (mm)</h4>
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
                    <p className="text-xs text-muted-foreground italic">Nota: Este campo pode ser preenchido por você ou seu Personal Trainer.</p>
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
                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                      <p className="text-[10px] font-black uppercase text-primary">Estimativa de 1 RM:</p>
                      <p className="text-2xl font-black">{(Number(form.watch("tenRmTest")) * 1.33).toFixed(1)} kg</p>
                    </div>
                  </div>
                </Card>
                <Card className="rounded-3xl p-6 border-accent/10">
                  <h4 className="font-bold flex items-center gap-2 mb-4"><Activity className="h-5 w-5 text-accent" /> Funcionalidade</h4>
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
                  <Label className="font-black uppercase tracking-widest text-primary">Percentual de Gordura (%)</Label>
                  <Input type="number" step="0.1" {...form.register("fatPercentage")} className="h-24 text-5xl text-center font-black rounded-[2.5rem] border-primary shadow-xl" />
                </div>
                
                <div className="h-[300px] w-full max-w-md bg-secondary/10 rounded-[3rem] p-8 shadow-inner relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={compositionData} 
                        innerRadius={60} 
                        outerRadius={90} 
                        paddingAngle={5} 
                        dataKey="value"
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

            <Button type="submit" className="w-full h-20 rounded-full text-2xl font-black bg-primary shadow-xl shadow-primary/20 hover:scale-[1.01] transition-transform" disabled={loading}>
              {loading ? <Loader2 className="animate-spin mr-2" /> : <ClipboardCheck className="mr-3 h-8 w-8" />}
              {selectedId ? "ATUALIZAR AVALIAÇÃO" : "SALVAR AVALIAÇÃO COMPLETA"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
