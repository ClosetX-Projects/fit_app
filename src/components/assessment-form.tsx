
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useFirebase, useUser, useCollection, useMemoFirebase } from "@/firebase"
import { doc, collection, serverTimestamp, query, orderBy } from "firebase/firestore"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { Loader2, Save, Activity, Scale, Ruler, UserCircle, ChevronRight, Calculator, PieChart, HeartPulse } from "lucide-react"
import { format, differenceInYears } from "date-fns"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

const assessmentSchema = z.object({
  fullName: z.string().min(2, "Nome obrigatório"),
  birthDate: z.string().min(1, "Data de nascimento obrigatória"),
  gender: z.enum(["male", "female"]),
  weight: z.coerce.number().min(0).default(0),
  height: z.coerce.number().min(0).default(0),
  // Circunferências
  neck: z.coerce.number().default(0),
  shoulder: z.coerce.number().default(0),
  chest: z.coerce.number().default(0),
  waist: z.coerce.number().default(0),
  abdomen: z.coerce.number().default(0),
  hip: z.coerce.number().default(0),
  thighR: z.coerce.number().default(0),
  thighL: z.coerce.number().default(0),
  legR: z.coerce.number().default(0),
  legL: z.coerce.number().default(0),
  armRelaxedR: z.coerce.number().default(0),
  armRelaxedL: z.coerce.number().default(0),
  armContractedR: z.coerce.number().default(0),
  armContractedL: z.coerce.number().default(0),
  forearmR: z.coerce.number().default(0),
  forearmL: z.coerce.number().default(0),
  // Dobras
  subscapular: z.coerce.number().default(0),
  triceps: z.coerce.number().default(0),
  biceps: z.coerce.number().default(0),
  midAxillary: z.coerce.number().default(0),
  pectoral: z.coerce.number().default(0),
  abdominal: z.coerce.number().default(0),
  suprailiac: z.coerce.number().default(0),
  thigh: z.coerce.number().default(0),
  midLeg: z.coerce.number().default(0),
})

type AssessmentValues = z.infer<typeof assessmentSchema>

export function AssessmentForm() {
  const { toast } = useToast()
  const { firestore } = useFirebase()
  const { user } = useUser()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const historyQuery = useMemoFirebase(() =>
    user ? query(collection(firestore, "users", user.uid, "physicalAssessments"), orderBy("date", "desc")) : null
  , [firestore, user])

  const { data: history, isLoading: isHistoryLoading } = useCollection(historyQuery)

  const form = useForm<AssessmentValues>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: { 
      fullName: "", 
      birthDate: "", 
      gender: "male",
      weight: 0, 
      height: 0 
    }
  })

  useEffect(() => {
    if (selectedId && history) {
      const a = history.find(item => item.id === selectedId)
      if (a) {
        form.reset({ ...a })
        setStep(2)
      }
    }
  }, [selectedId, history, form])

  const watched = form.watch()
  const age = watched.birthDate ? differenceInYears(new Date(), new Date(watched.birthDate)) : 0
  const protocol = age < 18 ? "Adolescente" : age < 60 ? "Adulto" : "Idoso"

  const results = useMemo(() => {
    const { 
      weight: w, height: h, waist, hip, gender,
      subscapular: sub, triceps: tri, biceps: bic, midAxillary: max, pectoral: pec,
      abdominal: abd, suprailiac: sup, thigh: t, midLeg: mlg
    } = watched

    // 1. IMC
    const imcValue = h > 0 ? (w / ((h / 100) ** 2)) : 0
    let imcClass = "--"
    if (imcValue > 0) {
      if (imcValue < 18.5) imcClass = "Abaixo do peso"
      else if (imcValue < 25) imcClass = "Saudável"
      else if (imcValue < 30) imcClass = "Sobrepeso"
      else if (imcValue < 35) imcClass = "Obesidade I"
      else if (imcValue < 40) imcClass = "Obesidade II"
      else imcClass = "Obesidade III"
    }

    // 2. RCQ
    const rcqValue = hip > 0 ? (waist / hip) : 0
    let rcqRisk = "--"
    if (rcqValue > 0) {
      if (gender === 'male') {
        if (rcqValue < 0.90) rcqRisk = "Baixo"
        else if (rcqValue < 1.00) rcqRisk = "Moderado"
        else rcqRisk = "Alto"
      } else {
        if (rcqValue < 0.80) rcqRisk = "Baixo"
        else if (rcqValue < 0.85) rcqRisk = "Moderado"
        else rcqRisk = "Alto"
      }
    }

    // 3. Composição Corporal
    let fatPerc = 0
    const sum7 = Number(sub) + Number(tri) + Number(max) + Number(pec) + Number(abd) + Number(sup) + Number(t)
    const sum4Idoso = Number(sub) + Number(tri) + Number(sup) + Number(mlg)

    if (age > 0) {
      if (age < 18) {
        // Slaughter
        if (gender === 'male') fatPerc = 0.735 * (Number(tri) + Number(mlg)) + 1.0
        else fatPerc = 0.610 * (Number(tri) + Number(mlg)) + 5.1
      } else if (age >= 60) {
        // Petroski 1995
        let dc = 0
        if (gender === 'male') {
          dc = 1.10726863 - (0.00081201 * sum4Idoso) + (0.00000212 * (sum4Idoso ** 2)) - (0.00041761 * age)
        } else {
          dc = 1.02902361 - (0.00067159 * sum4Idoso) + (0.00000242 * (sum4Idoso ** 2)) - (0.0002073 * age) - (0.00056009 * w) + (0.00054649 * h)
        }
        fatPerc = ((4.95 / dc) - 4.50) * 100
      } else {
        // Jackson & Pollock 7
        let dc = 0
        if (gender === 'male') dc = 1.112 - (0.00043499 * sum7) + (0.00000055 * (sum7 ** 2)) - (0.00028826 * age)
        else dc = 1.0970 - (0.00046971 * sum7) + (0.00000056 * (sum7 ** 2)) - (0.00012828 * age)
        fatPerc = ((4.95 / dc) - 4.50) * 100
      }
    }

    const finalFatPerc = Math.max(0, fatPerc)
    const fatMass = w * (finalFatPerc / 100)
    const leanMass = w - fatMass

    // Classificação Gordura
    let fatClass = "--"
    if (age >= 18) {
      if (gender === 'male') {
        if (finalFatPerc < 5) fatClass = "Essencial"; else if (finalFatPerc <= 13) fatClass = "Atleta"; else if (finalFatPerc <= 17) fatClass = "Boa Forma"; else if (finalFatPerc <= 24) fatClass = "Aceitável"; else fatClass = "Obesidade"
      } else {
        if (finalFatPerc < 14) fatClass = "Essencial"; else if (finalFatPerc <= 20) fatClass = "Atleta"; else if (finalFatPerc <= 24) fatClass = "Boa Forma"; else if (finalFatPerc <= 31) fatClass = "Aceitável"; else fatClass = "Obesidade"
      }
    }

    return {
      imc: imcValue.toFixed(1),
      imcClass,
      rcq: rcqValue.toFixed(2),
      rcqRisk,
      fatPerc: finalFatPerc.toFixed(1),
      fatClass,
      fatMass: fatMass.toFixed(1),
      leanMass: leanMass.toFixed(1),
      protocol,
      age
    }
  }, [watched, age, protocol])

  const onSubmit = async (values: AssessmentValues) => {
    if (!user || !firestore) return
    setLoading(true)
    const assessmentRef = selectedId
      ? doc(firestore, "users", user.uid, "physicalAssessments", selectedId)
      : doc(collection(firestore, "users", user.uid, "physicalAssessments"))

    setDocumentNonBlocking(assessmentRef, {
      ...values,
      id: assessmentRef.id,
      userId: user.uid,
      date: new Date().toISOString(),
      updatedAt: serverTimestamp(),
      calculatedResults: results,
    }, { merge: true })

    toast({ title: "Avaliação salva com sucesso!" })
    setSelectedId(assessmentRef.id)
    setLoading(false)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto pb-24">
      {/* Sidebar Histórico */}
      <Card className="lg:col-span-3 border-primary/10 rounded-3xl overflow-hidden shadow-lg bg-card h-fit">
        <CardHeader className="bg-primary/5 p-6 border-b">
          <CardTitle className="text-xs font-black flex items-center gap-2 uppercase tracking-widest">
            <Activity className="h-4 w-4 text-primary" /> Histórico
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => { setSelectedId(null); form.reset(); setStep(1); }} 
            className="w-full justify-start mt-2 h-10 rounded-xl hover:bg-primary/10 text-primary font-bold"
          >
            + Novo Registro
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            {isHistoryLoading ? (
              <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
            ) : history?.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={`w-full text-left p-4 transition-all hover:bg-primary/5 flex items-center justify-between group border-b border-primary/5 ${selectedId === item.id ? 'bg-primary/10 border-l-4 border-l-primary' : ''}`}
              >
                <div>
                  <p className="text-xs font-bold">{format(new Date(item.date), "dd/MM/yyyy")}</p>
                  <p className="text-[10px] uppercase font-black text-muted-foreground mt-1">
                    {item.calculatedResults?.imc} IMC | {item.calculatedResults?.fatPerc}% Gordura
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Formulário Principal */}
      <Card className="lg:col-span-9 border-primary/20 shadow-2xl rounded-[2.5rem] overflow-hidden bg-background">
        <CardHeader className="bg-primary/5 p-8 border-b border-primary/10">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl font-black text-primary uppercase tracking-tighter">Avaliação Antropométrica</CardTitle>
              <CardDescription>Protocolos científicos Jackson & Pollock, Slaughter e Petroski.</CardDescription>
            </div>
            {step === 2 && (
              <div className="bg-accent/20 text-accent-foreground px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest border border-accent/30">
                Protocolo: {results.protocol}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-8">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
            {step === 1 ? (
              <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-primary tracking-widest">Nome Completo do Aluno</Label>
                    <Input {...form.register("fullName")} placeholder="Digite o nome..." className="h-12 rounded-xl" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase text-primary tracking-widest">Nascimento</Label>
                      <Input type="date" {...form.register("birthDate")} className="h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase text-primary tracking-widest">Gênero</Label>
                      <Select value={watched.gender} onValueChange={(v: any) => form.setValue("gender", v)}>
                        <SelectTrigger className="h-12 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Masculino</SelectItem>
                          <SelectItem value="female">Feminino</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <Button 
                  type="button" 
                  onClick={() => setStep(2)} 
                  disabled={!watched.fullName || !watched.birthDate}
                  className="w-full h-16 rounded-full text-lg font-black bg-primary gap-2 shadow-xl hover:scale-[1.01] transition-transform"
                >
                  INICIAR MEDIDAS <ChevronRight className="h-6 w-6" />
                </Button>
              </div>
            ) : (
              <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-muted/50 p-4 rounded-3xl text-center border">
                    <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">IMC</p>
                    <p className="text-lg font-black text-primary">{results.imc}</p>
                    <p className="text-[8px] font-bold uppercase opacity-60">{results.imcClass}</p>
                  </div>
                  <div className="bg-primary/10 p-4 rounded-3xl text-center border border-primary/20">
                    <p className="text-[9px] font-black uppercase text-primary tracking-widest mb-1">Risco RCQ</p>
                    <p className="text-lg font-black">{results.rcq}</p>
                    <p className="text-[8px] font-bold uppercase text-primary">{results.rcqRisk}</p>
                  </div>
                  <div className="bg-accent/10 p-4 rounded-3xl text-center border border-accent/20">
                    <p className="text-[9px] font-black uppercase text-accent-foreground tracking-widest mb-1">% Gordura</p>
                    <p className="text-lg font-black">{results.fatPerc}%</p>
                    <p className="text-[8px] font-bold uppercase text-accent-foreground">{results.fatClass}</p>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-3xl text-center border">
                    <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">Massa Magra</p>
                    <p className="text-lg font-black">{results.leanMass} kg</p>
                    <p className="text-[8px] font-bold uppercase opacity-60">Peso da Gordura: {results.fatMass}kg</p>
                  </div>
                </div>

                <Tabs defaultValue="medidas" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-muted rounded-2xl mb-8">
                    <TabsTrigger value="medidas" className="rounded-xl py-3 text-[10px] font-black uppercase gap-2">
                      <Scale className="h-4 w-4" /> Peso & Altura
                    </TabsTrigger>
                    <TabsTrigger value="perimetros" className="rounded-xl py-3 text-[10px] font-black uppercase gap-2">
                      <Ruler className="h-4 w-4" /> Circunferências
                    </TabsTrigger>
                    <TabsTrigger value="dobras" className="rounded-xl py-3 text-[10px] font-black uppercase gap-2">
                      <Calculator className="h-4 w-4" /> Dobras Cutâneas
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="medidas" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <Label>Peso Corporal (kg)</Label>
                        <Input type="number" step="0.1" {...form.register("weight")} className="h-14 text-xl font-bold rounded-2xl" />
                      </div>
                      <div className="space-y-2">
                        <Label>Estatura (cm)</Label>
                        <Input type="number" {...form.register("height")} className="h-14 text-xl font-bold rounded-2xl" />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="perimetros" className="space-y-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      {[
                        { id: "neck", label: "Pescoço" },
                        { id: "shoulder", label: "Ombro" },
                        { id: "chest", label: "Tórax" },
                        { id: "waist", label: "Cintura" },
                        { id: "abdomen", label: "Abdômen" },
                        { id: "hip", label: "Quadril" },
                        { id: "armRelaxedR", label: "Br. Relax. D" },
                        { id: "armRelaxedL", label: "Br. Relax. E" },
                        { id: "armContractedR", label: "Br. Contr. D" },
                        { id: "armContractedL", label: "Br. Contr. E" },
                        { id: "forearmR", label: "Ant.braço D" },
                        { id: "forearmL", label: "Ant.braço E" },
                        { id: "thighR", label: "Coxa D" },
                        { id: "thighL", label: "Coxa E" },
                        { id: "legR", label: "Perna D" },
                        { id: "legL", label: "Perna E" },
                      ].map((f) => (
                        <div key={f.id} className="space-y-1">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground">{f.label}</Label>
                          <Input type="number" step="0.1" {...form.register(f.id as any)} className="h-10 rounded-xl" />
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="dobras" className="space-y-8">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                      {[
                        { id: "subscapular", label: "Subescapular" },
                        { id: "triceps", label: "Tricipital" },
                        { id: "biceps", label: "Bicipital" },
                        { id: "midAxillary", label: "Axilar Média" },
                        { id: "pectoral", label: "Peitoral" },
                        { id: "abdominal", label: "Abdominal" },
                        { id: "suprailiac", label: "Supra-ilíaca" },
                        { id: "thigh", label: "Coxa" },
                        { id: "midLeg", label: "Perna Medial" },
                      ].map((d) => (
                        <div key={d.id} className="space-y-1">
                          <Label className="text-[10px] font-black uppercase text-primary">{d.label} (mm)</Label>
                          <Input type="number" step="0.1" {...form.register(d.id as any)} className="h-10 rounded-xl border-primary/20" />
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex gap-4">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1 h-16 rounded-full font-bold">VOLTAR</Button>
                  <Button type="submit" disabled={loading} className="flex-[2] h-16 rounded-full text-xl font-black bg-primary gap-2 shadow-xl">
                    {loading ? <Loader2 className="animate-spin" /> : <Save className="h-6 w-6" />} SALVAR AVALIAÇÃO
                  </Button>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
