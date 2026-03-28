
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
import { Loader2, Save, Activity, Dumbbell, History, PlusCircle, ChevronRight, Info, Scale } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as ChartTooltip } from 'recharts'
import { format, differenceInYears } from "date-fns"
import { ScrollArea } from "@/components/ui/scroll-area"

const assessmentSchema = z.object({
  weight: z.coerce.number().min(0).default(0),
  height: z.coerce.number().min(0).default(0),
  birthDate: z.string().optional(),
  neck: z.coerce.number().default(0),
  shoulder: z.coerce.number().default(0),
  chest: z.coerce.number().default(0),
  waist: z.coerce.number().default(0),
  abdomen: z.coerce.number().default(0),
  hip: z.coerce.number().default(0),
  armRelaxedR: z.coerce.number().default(0),
  armRelaxedL: z.coerce.number().default(0),
  armContractedR: z.coerce.number().default(0),
  armContractedL: z.coerce.number().default(0),
  forearmR: z.coerce.number().default(0),
  forearmL: z.coerce.number().default(0),
  thighR: z.coerce.number().default(0),
  thighL: z.coerce.number().default(0),
  legR: z.coerce.number().default(0),
  legL: z.coerce.number().default(0),
  subscapular: z.coerce.number().default(0),
  triceps: z.coerce.number().default(0),
  biceps: z.coerce.number().default(0),
  midAxillary: z.coerce.number().default(0),
  pectoral: z.coerce.number().default(0),
  suprailiac: z.coerce.number().default(0),
  thigh: z.coerce.number().default(0),
  abdominal: z.coerce.number().default(0),
  midLeg: z.coerce.number().default(0),
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
      const a = history.find(item => item.id === selectedId)
      if (a) {
        form.reset({
          weight: a.weight || 0,
          height: a.height || 0,
          birthDate: a.birthDate || profile?.birthDate || '',
          neck: a.neck || 0,
          shoulder: a.shoulder || 0,
          chest: a.chest || 0,
          waist: a.waist || 0,
          abdomen: a.abdomen || 0,
          hip: a.hip || 0,
          armRelaxedR: a.armRelaxedR || 0,
          armRelaxedL: a.armRelaxedL || 0,
          armContractedR: a.armContractedR || 0,
          armContractedL: a.armContractedL || 0,
          forearmR: a.forearmR || 0,
          forearmL: a.forearmL || 0,
          thighR: a.thighR || 0,
          thighL: a.thighL || 0,
          legR: a.legR || 0,
          legL: a.legL || 0,
          subscapular: a.subscapular || 0,
          triceps: a.triceps || 0,
          biceps: a.biceps || 0,
          midAxillary: a.midAxillary || 0,
          pectoral: a.pectoral || 0,
          suprailiac: a.suprailiac || 0,
          thigh: a.thigh || 0,
          abdominal: a.abdominal || 0,
          midLeg: a.midLeg || 0,
          vo2max: a.vo2max || 0,
          tenRmTest: a.tenRmTest || 0,
          sitToStand: a.sitToStand || 0,
          tug: a.tug || 0,
        })
      }
    }
  }, [selectedId, history, form, profile])

  const watchedValues = form.watch()
  const gender = profile?.gender || "male"
  const birthDate = watchedValues.birthDate || profile?.birthDate || ''
  const age = birthDate ? differenceInYears(new Date(), new Date(birthDate)) : 30

  const results = useMemo(() => {
    const { 
      weight: w, height: h, waist, hip,
      subscapular: sub, triceps: tri, biceps: bic, midAxillary: max, pectoral: pec, 
      suprailiac: sup, abdominal: abd, thigh: t, midLeg: mlg
    } = watchedValues
    
    // IMC
    const imcValue = h > 0 ? (w / ((h / 100) ** 2)) : 0
    let imcClassification = ""
    if (imcValue < 18.5) imcClassification = "Abaixo do peso"
    else if (imcValue < 25) imcClassification = "Peso normal"
    else if (imcValue < 30) imcClassification = "Sobrepeso"
    else if (imcValue < 35) imcClassification = "Obesidade I"
    else if (imcValue < 40) imcClassification = "Obesidade II"
    else imcClassification = "Obesidade III"

    // RCQ
    const rcqValue = hip > 0 ? (waist / hip) : 0
    let rcqRisk = "--"
    if (gender === 'male') {
      if (rcqValue < 0.90) rcqRisk = "Baixo"
      else if (rcqValue < 1.00) rcqRisk = "Moderado"
      else rcqRisk = "Alto"
    } else {
      if (rcqValue < 0.80) rcqRisk = "Baixo"
      else if (rcqValue < 0.85) rcqRisk = "Moderado"
      else rcqRisk = "Alto"
    }

    // Composição Corporal
    let fatPerc = 0
    let protocol = "Adulto"

    const sum7 = Number(sub) + Number(tri) + Number(max) + Number(pec) + Number(abd) + Number(sup) + Number(t)
    const sum4 = Number(bic) + Number(tri) + Number(sub) + Number(sup)

    if (age < 18) {
      protocol = "Adolescente (Slaughter)"
      if (gender === 'male') {
        fatPerc = 0.735 * (Number(tri) + Number(mlg)) + 1.0
      } else {
        fatPerc = 0.610 * (Number(tri) + Number(mlg)) + 5.1
      }
    } else if (age >= 18 && age < 60) {
      protocol = "Adulto (J&P 7 Dobras)"
      let dc = 0
      if (gender === 'male') {
        dc = 1.112 - (0.00043499 * sum7) + (0.00000055 * (sum7 ** 2)) - (0.00028826 * age)
      } else {
        dc = 1.0970 - (0.00046971 * sum7) + (0.00000056 * (sum7 ** 2)) - (0.00012828 * age)
      }
      fatPerc = ((4.95 / dc) - 4.50) * 100
    } else {
      protocol = "Idoso (D&W 4 Dobras)"
      if (sum4 > 0) {
        let c = gender === 'male' ? 1.1715 : 1.1339
        let m = gender === 'male' ? 0.0779 : 0.0645
        const dc = c - (m * Math.log10(sum4))
        fatPerc = ((4.95 / dc) - 4.50) * 100
      }
    }

    fatPerc = Math.max(0, fatPerc)
    const fatKg = (w * fatPerc) / 100
    const leanKg = w - fatKg

    // Classificação Gordura
    let fatClass = "--"
    if (gender === 'male') {
      if (fatPerc < 5) fatClass = "Essencial"
      else if (fatPerc <= 13) fatClass = "Atleta"
      else if (fatPerc <= 17) fatClass = "Boa Forma"
      else if (fatPerc <= 24) fatClass = "Aceitável"
      else fatClass = "Obesidade"
    } else {
      if (fatPerc < 14) fatClass = "Essencial"
      else if (fatPerc <= 20) fatClass = "Atleta"
      else if (fatPerc <= 24) fatClass = "Boa Forma"
      else if (fatPerc <= 31) fatClass = "Aceitável"
      else fatClass = "Obesidade"
    }

    return { 
      imc: imcValue.toFixed(1), 
      imcClassification,
      rcq: rcqValue.toFixed(2),
      rcqRisk,
      fatPerc: fatPerc.toFixed(1), 
      fatKg: fatKg.toFixed(1), 
      leanKg: leanKg.toFixed(1),
      fatClass,
      protocol
    }
  }, [watchedValues, gender, age])

  const compositionData = [
    { name: 'Massa Magra', value: Math.max(0.1, Number(results.leanKg)), color: '#7E3F8F' },
    { name: 'Gordura', value: Math.max(0.1, Number(results.fatKg)), color: '#DFFF6E' }
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto pb-20">
      <Card className="lg:col-span-3 h-fit border-primary/10 rounded-3xl overflow-hidden shadow-lg">
        <CardHeader className="bg-primary/5 p-6 border-b">
          <CardTitle className="text-sm font-black flex items-center gap-2 uppercase">
            <History className="h-4 w-4 text-primary" /> Histórico
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleNew} className="w-full justify-start mt-2 h-10 rounded-xl hover:bg-primary/10 text-primary font-bold">
            <PlusCircle className="mr-2 h-4 w-4" /> Novo Registro
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
                    {item.weight}kg | {item.calculatedResults?.fatPerc}% Gordura
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
          <CardTitle className="text-3xl font-black text-primary uppercase tracking-tighter">ACOMPANHAMENTO FÍSICO</CardTitle>
          <CardDescription>Métricas de Composição e Performance</CardDescription>
        </CardHeader>
        
        <CardContent className="p-8">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "Protocolo", val: results.protocol, bg: "bg-muted/50" },
                { label: "% Gordura", val: `${results.fatPerc}%`, bg: "bg-accent/10", border: "border-accent/20" },
                { label: "Status Fat", val: results.fatClass, bg: "bg-muted/50" },
                { label: "Massa Magra", val: `${results.leanKg} kg`, bg: "bg-primary/10", border: "border-primary/20" },
                { label: "IMC", val: results.imc, bg: "bg-muted/50" }
              ].map((res, i) => (
                <div key={i} className={`${res.bg} p-4 rounded-3xl text-center border ${res.border || 'border-transparent'}`}>
                  <p className="text-[10px] font-black uppercase text-muted-foreground">{res.label}</p>
                  <p className="text-sm font-black truncate">{res.val}</p>
                </div>
              ))}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-muted rounded-2xl mb-8">
                <TabsTrigger value="antropometria" className="rounded-xl py-3 text-[10px] font-black uppercase">Perímetros</TabsTrigger>
                <TabsTrigger value="dobras" className="rounded-xl py-3 text-[10px] font-black uppercase">Dobras</TabsTrigger>
                <TabsTrigger value="funcional" className="rounded-xl py-3 text-[10px] font-black uppercase">Funcional</TabsTrigger>
                <TabsTrigger value="composicao" className="rounded-xl py-3 text-[10px] font-black uppercase">Gráfico</TabsTrigger>
              </TabsList>

              <TabsContent value="antropometria" className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase text-primary border-b pb-1">Básicos</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Peso (kg)</Label><Input type="number" step="0.1" {...form.register("weight")} /></div>
                      <div className="space-y-2"><Label>Altura (cm)</Label><Input type="number" {...form.register("height")} /></div>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2"><Label>Data Nasc.</Label><Input type="date" {...form.register("birthDate")} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Cintura (cm)</Label><Input type="number" step="0.1" {...form.register("waist")} /></div>
                      <div className="space-y-2"><Label>Quadril (cm)</Label><Input type="number" step="0.1" {...form.register("hip")} /></div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase text-primary border-b pb-1">Circunferências (cm)</h4>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                      {[
                        { id: "neck", label: "Pescoço" },
                        { id: "shoulder", label: "Ombro" },
                        { id: "armRelaxedR", label: "Br. Rel. D." },
                        { id: "armRelaxedL", label: "Br. Rel. E." },
                        { id: "forearmR", label: "Antebr. D." },
                        { id: "forearmL", label: "Antebr. E." },
                        { id: "thighR", label: "Coxa D." },
                        { id: "thighL", label: "Coxa E." },
                        { id: "legR", label: "Perna D." },
                        { id: "legL", label: "Perna E." }
                      ].map(f => (
                        <div key={f.id} className="flex items-center justify-between gap-2">
                          <Label className="text-[10px] uppercase font-bold">{f.label}</Label>
                          <Input type="number" step="0.1" {...form.register(f.id as any)} className="w-16 h-8" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="dobras" className="space-y-6">
                <div className="bg-primary/5 p-4 rounded-2xl flex items-start gap-3 mb-4">
                  <Info className="h-4 w-4 text-primary shrink-0 mt-1" />
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    <strong>Protocolo Ativo:</strong> {results.protocol} <br/>
                    Insira as dobras conforme a orientação do seu professor para cálculos precisos.
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {[
                    { id: "triceps", label: "Tríceps" },
                    { id: "biceps", label: "Bíceps" },
                    { id: "subscapular", label: "Subescap." },
                    { id: "abdominal", label: "Abdom." },
                    { id: "suprailiac", label: "Supraili." },
                    { id: "midAxillary", label: "Axilar M." },
                    { id: "pectoral", label: "Peitoral" },
                    { id: "thigh", label: "Coxa" },
                    { id: "midLeg", label: "Perna Med." }
                  ].map(d => (
                    <div key={d.id} className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-primary">{d.label}</Label>
                      <Input type="number" step="0.1" {...form.register(d.id as any)} className="h-10 font-bold" />
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="funcional" className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="rounded-3xl p-6 border-primary/10 bg-primary/5">
                  <h4 className="font-bold flex items-center gap-2 mb-4 text-primary"><Dumbbell className="h-5 w-5" /> Força & VO2</h4>
                  <div className="space-y-4">
                    <div className="space-y-2"><Label>Teste 10 RM (kg)</Label><Input type="number" {...form.register("tenRmTest")} /></div>
                    <div className="space-y-2"><Label>VO2 Máximo Estimado</Label><Input type="number" step="0.1" {...form.register("vo2max")} /></div>
                  </div>
                </Card>
                <Card className="rounded-3xl p-6 border-accent/10 bg-accent/5">
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
              SALVAR REGISTRO
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
