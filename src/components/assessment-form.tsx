
"use client"

import React, { useState, useMemo, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { useFirebase, useUser, useCollection, useMemoFirebase, useDoc } from "@/firebase"
import { doc, collection, serverTimestamp, query, orderBy } from "firebase/firestore"
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates"
import { Loader2, Save, Activity, Dumbbell, History, PlusCircle, ChevronRight, Info, Scale, Camera, HeartPulse, ScanFace, Timer, Ruler, PlayCircle } from "lucide-react"
import { format, differenceInYears } from "date-fns"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

const assessmentSchema = z.object({
  weight: z.coerce.number().min(0).default(0),
  height: z.coerce.number().min(0).default(0),
  birthDate: z.string().optional(),
  gender: z.string().default("male"),
  isHypertensive: z.boolean().default(false),
  isDiabetic: z.boolean().default(false),
  systolic: z.coerce.number().default(0),
  diastolic: z.coerce.number().default(0),
  // Bioimpedancia
  bmr: z.coerce.number().default(0),
  hydration: z.coerce.number().default(0),
  bioBodyFat: z.coerce.number().default(0),
  // Perimetros
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
  // Dobras
  subscapular: z.coerce.number().default(0),
  triceps: z.coerce.number().default(0),
  biceps: z.coerce.number().default(0),
  midAxillary: z.coerce.number().default(0),
  pectoral: z.coerce.number().default(0),
  suprailiac: z.coerce.number().default(0),
  thigh: z.coerce.number().default(0),
  abdominal: z.coerce.number().default(0),
  midLeg: z.coerce.number().default(0),
  // Testes Físicos
  tenRmExercise: z.string().default("Supino Reto"),
  tenRmWeight: z.coerce.number().default(0),
  tenRmReps: z.coerce.number().default(0),
  cooperDistance: z.coerce.number().default(0),
  yoYoDistance: z.coerce.number().default(0),
  bruceTime: z.coerce.number().default(0),
  wellsDistance: z.coerce.number().default(0),
  verticalJump: z.coerce.number().default(0),
  horizontalJump: z.coerce.number().default(0),
  absOneMin: z.coerce.number().default(0),
  pushUps: z.coerce.number().default(0),
  conconiData: z.string().default(""), // JSON string para simplificar
})

export function AssessmentForm() {
  const { toast } = useToast()
  const { firestore } = useFirebase()
  const { user } = useUser()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("antropometria")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null)

  const profileRef = useMemoFirebase(() => user ? doc(firestore, "users", user.uid) : null, [firestore, user])
  const { data: profile } = useDoc(profileRef)

  const historyQuery = useMemoFirebase(() => 
    user ? query(collection(firestore, "users", user.uid, "physicalAssessments"), orderBy("date", "desc")) : null
  , [firestore, user])
  
  const { data: history, isLoading: isHistoryLoading } = useCollection(historyQuery)

  const form = useForm<z.infer<typeof assessmentSchema>>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: { weight: 0, height: 0, isHypertensive: false, isDiabetic: false, tenRmExercise: "Supino Reto" }
  })

  useEffect(() => {
    if (activeTab === "escaneamento") {
      const getCameraPermission = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({video: true});
          setHasCameraPermission(true);
          if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (error) {
          setHasCameraPermission(false);
        }
      };
      getCameraPermission();
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedId && history) {
      const a = history.find(item => item.id === selectedId)
      if (a) form.reset({ ...a })
    }
  }, [selectedId, history, form])

  const watchedValues = form.watch()
  const gender = watchedValues.gender || profile?.gender || "male"
  const birthDate = watchedValues.birthDate || profile?.birthDate || ''
  const age = birthDate ? differenceInYears(new Date(), new Date(birthDate)) : 30

  const results = useMemo(() => {
    const { 
      weight: w, height: h, waist, hip, tenRmWeight, tenRmReps, cooperDistance, yoYoDistance, bruceTime, wellsDistance,
      subscapular: sub, triceps: tri, biceps: bic, midAxillary: max, pectoral: pec, 
      suprailiac: sup, abdominal: abd, thigh: t, midLeg: mlg, bioBodyFat
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

    // 1RM (Brzycki)
    const oneRm = tenRmReps > 0 ? (tenRmWeight / (1.0278 - (0.0278 * tenRmReps))) : 0
    const oneRmTable = [95, 90, 85, 80, 75, 70, 60, 50].map(p => ({
      perc: p,
      val: (oneRm * (p / 100)).toFixed(1)
    }))

    // VO2 Max Estimativas
    const vo2Cooper = cooperDistance > 0 ? (cooperDistance - 504.9) / 44.73 : 0
    const vo2YoYo = yoYoDistance > 0 ? (yoYoDistance * 0.0084) + 36.4 : 0
    let vo2Bruce = 0
    if (bruceTime > 0) {
      if (gender === 'male') vo2Bruce = 14.8 - (1.379 * bruceTime) + (0.451 * (bruceTime ** 2)) - (0.012 * (bruceTime ** 3))
      else vo2Bruce = (4.38 * bruceTime) - 3.9
    }

    // Wells Flexibilidade
    let wellsClass = "--"
    if (wellsDistance > 0) {
      if (gender === 'male') {
        if (wellsDistance > 38) wellsClass = "Excelente"; else if (wellsDistance >= 28) wellsClass = "Bom"; else if (wellsDistance >= 19) wellsClass = "Regular"; else wellsClass = "Fraco"
      } else {
        if (wellsDistance > 41) wellsClass = "Excelente"; else if (wellsDistance >= 33) wellsClass = "Bom"; else if (wellsDistance >= 23) wellsClass = "Regular"; else wellsClass = "Fraco"
      }
    }

    // Composição Corporal
    let fatPerc = 0
    const sum7 = Number(sub) + Number(tri) + Number(max) + Number(pec) + Number(abd) + Number(sup) + Number(t)
    if (age < 18) {
      if (gender === 'male') fatPerc = 0.735 * (Number(tri) + Number(mlg)) + 1.0
      else fatPerc = 0.610 * (Number(tri) + Number(mlg)) + 5.1
    } else {
      let dc = 0
      if (gender === 'male') dc = 1.112 - (0.00043499 * sum7) + (0.00000055 * (sum7 ** 2)) - (0.00028826 * age)
      else dc = 1.0970 - (0.00046971 * sum7) + (0.00000056 * (sum7 ** 2)) - (0.00012828 * age)
      fatPerc = ((4.95 / dc) - 4.50) * 100
    }

    const finalFatPerc = bioBodyFat > 0 ? bioBodyFat : Math.max(0, fatPerc)
    
    return { 
      imc: imcValue.toFixed(1), 
      imcClassification,
      rcq: rcqValue.toFixed(2),
      rcqRisk,
      oneRm: oneRm.toFixed(1),
      oneRmTable,
      vo2Cooper: vo2Cooper.toFixed(1),
      vo2YoYo: vo2YoYo.toFixed(1),
      vo2Bruce: vo2Bruce.toFixed(1),
      wellsClass,
      fatPerc: finalFatPerc.toFixed(1)
    }
  }, [watchedValues, gender, age])

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

    toast({ title: "Avaliação salva com sucesso!" })
    if (!selectedId) setSelectedId(assessmentRef.id)
    setLoading(false)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto pb-20">
      <Card className="lg:col-span-3 h-fit border-primary/10 rounded-3xl overflow-hidden shadow-lg bg-card">
        <CardHeader className="bg-primary/5 p-6 border-b">
          <CardTitle className="text-sm font-black flex items-center gap-2 uppercase">
            <History className="h-4 w-4 text-primary" /> Histórico
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => { setSelectedId(null); form.reset(); }} className="w-full justify-start mt-2 h-10 rounded-xl hover:bg-primary/10 text-primary font-bold">
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
        <CardHeader className="bg-primary/5 p-8 border-b border-primary/10">
          <CardTitle className="text-2xl font-black text-primary uppercase tracking-tighter">AVALIAÇÃO MULTIDISCIPLINAR</CardTitle>
          <CardDescription>Protocolos científicos, performance e triagem clínica.</CardDescription>
        </CardHeader>
        
        <CardContent className="p-8">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-muted/50 p-4 rounded-3xl text-center border">
                <p className="text-[10px] font-black uppercase text-muted-foreground">IMC</p>
                <p className="text-sm font-black">{results.imc} ({results.imcClassification})</p>
              </div>
              <div className="bg-primary/10 p-4 rounded-3xl text-center border border-primary/20">
                <p className="text-[10px] font-black uppercase text-primary">RCQ Risco</p>
                <p className="text-sm font-black">{results.rcqRisk}</p>
              </div>
              <div className="bg-accent/10 p-4 rounded-3xl text-center border border-accent/20">
                <p className="text-[10px] font-black uppercase text-accent-foreground">1RM Est.</p>
                <p className="text-sm font-black">{results.oneRm} kg</p>
              </div>
              <div className="bg-muted/50 p-4 rounded-3xl text-center border">
                <p className="text-[10px] font-black uppercase text-muted-foreground">% Gordura</p>
                <p className="text-sm font-black">{results.fatPerc}%</p>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 md:grid-cols-7 h-auto p-1 bg-muted rounded-2xl mb-8">
                <TabsTrigger value="antropometria" className="rounded-xl py-3 text-[9px] font-black uppercase">Clínica</TabsTrigger>
                <TabsTrigger value="perimetros" className="rounded-xl py-3 text-[9px] font-black uppercase">Perímetros</TabsTrigger>
                <TabsTrigger value="dobras" className="rounded-xl py-3 text-[9px] font-black uppercase">Dobras</TabsTrigger>
                <TabsTrigger value="bioimpedancia" className="rounded-xl py-3 text-[9px] font-black uppercase">Bioimp.</TabsTrigger>
                <TabsTrigger value="testes" className="rounded-xl py-3 text-[9px] font-black uppercase">Testes</TabsTrigger>
                <TabsTrigger value="escaneamento" className="rounded-xl py-3 text-[9px] font-black uppercase">Scan</TabsTrigger>
                <TabsTrigger value="funcional" className="rounded-xl py-3 text-[9px] font-black uppercase">Func.</TabsTrigger>
              </TabsList>

              <TabsContent value="antropometria" className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h4 className="text-xs font-black uppercase text-primary border-b pb-1">Identificação & Vital</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Peso (kg)</Label><Input type="number" step="0.1" {...form.register("weight")} /></div>
                      <div className="space-y-2"><Label>Altura (cm)</Label><Input type="number" {...form.register("height")} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Sistólica</Label><Input type="number" {...form.register("systolic")} /></div>
                      <div className="space-y-2"><Label>Diastólica</Label><Input type="number" {...form.register("diastolic")} /></div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <h4 className="text-xs font-black uppercase text-primary border-b pb-1">Triagem de Risco</h4>
                    <div className="p-6 bg-destructive/5 border border-destructive/10 rounded-3xl space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="font-bold">Hipertenso</Label>
                        <Switch checked={watchedValues.isHypertensive} onCheckedChange={v => form.setValue('isHypertensive', v)} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="font-bold">Diabético</Label>
                        <Switch checked={watchedValues.isDiabetic} onCheckedChange={v => form.setValue('isDiabetic', v)} />
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="testes" className="space-y-10">
                <div className="grid gap-8">
                  {/* Teste 1RM */}
                  <Card className="rounded-[2rem] border-primary/10 overflow-hidden">
                    <CardHeader className="bg-primary/5 flex flex-row items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Dumbbell className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-black uppercase">Predição de 1RM (Brzycki)</CardTitle>
                          <CardDescription className="text-[10px]">Cálculo da força máxima dinâmica.</CardDescription>
                        </div>
                      </div>
                      <Badge variant="outline" className="rounded-full">Protocolo Força</Badge>
                    </CardHeader>
                    <CardContent className="p-6 grid md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase">Exercício Base</Label>
                          <Input {...form.register("tenRmExercise")} placeholder="Ex: Supino Reto" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase">Carga (kg)</Label>
                            <Input type="number" {...form.register("tenRmWeight")} />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase">Reps Realizadas</Label>
                            <Input type="number" {...form.register("tenRmReps")} />
                          </div>
                        </div>
                        <Alert className="bg-accent/5 border-accent/20">
                          <Info className="h-4 w-4 text-accent" />
                          <AlertDescription className="text-[10px]">Realize o maior número de repetições possíveis com uma carga submáxima (ideal entre 2 a 10 reps).</AlertDescription>
                        </Alert>
                      </div>
                      <div className="bg-muted/30 rounded-2xl p-4">
                        <p className="text-[10px] font-black uppercase mb-3 text-center">Tabela de Percentuais</p>
                        <div className="grid grid-cols-2 gap-2">
                          {results.oneRmTable.map(row => (
                            <div key={row.perc} className="flex justify-between p-2 bg-background rounded-lg border text-[11px]">
                              <span className="font-bold">{row.perc}%</span>
                              <span className="font-black text-primary">{row.val} kg</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Testes VO2 */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <Card className="rounded-[2rem] border-primary/10">
                      <CardHeader className="bg-primary/5">
                        <CardTitle className="text-xs font-black uppercase flex items-center gap-2"><Activity className="h-4 w-4" /> Cooper 12 Min</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <div className="space-y-2">
                          <Label>Distância Total (metros)</Label>
                          <Input type="number" {...form.register("cooperDistance")} />
                        </div>
                        <div className="p-3 bg-primary/10 rounded-xl text-center">
                          <p className="text-[10px] font-black uppercase opacity-60">VO2 Máx Estimado</p>
                          <p className="text-xl font-black text-primary">{results.vo2Cooper} ml/kg/min</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-[2rem] border-primary/10">
                      <CardHeader className="bg-primary/5">
                        <CardTitle className="text-xs font-black uppercase flex items-center gap-2"><Timer className="h-4 w-4" /> Teste de Bruce</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <div className="space-y-2">
                          <Label>Tempo Total (minutos decimais)</Label>
                          <Input type="number" step="0.01" {...form.register("bruceTime")} />
                        </div>
                        <div className="p-3 bg-primary/10 rounded-xl text-center">
                          <p className="text-[10px] font-black uppercase opacity-60">VO2 Máx Bruce</p>
                          <p className="text-xl font-black text-primary">{results.vo2Bruce} ml/kg/min</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Flexibilidade Wells */}
                  <Card className="rounded-[2rem] border-primary/10 overflow-hidden">
                    <CardHeader className="bg-primary/5">
                      <CardTitle className="text-xs font-black uppercase flex items-center gap-2"><Ruler className="h-4 w-4" /> Banco de Wells</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 flex flex-col md:flex-row items-center gap-8">
                      <div className="flex-1 space-y-4">
                        <div className="space-y-2">
                          <Label>Alcance alcançado (cm)</Label>
                          <Input type="number" {...form.register("wellsDistance")} />
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex-1 p-3 bg-accent/10 rounded-xl text-center">
                            <p className="text-[10px] font-black uppercase">Classificação</p>
                            <p className="text-lg font-black text-accent-foreground">{results.wellsClass}</p>
                          </div>
                        </div>
                      </div>
                      <div className="w-full md:w-64 aspect-video bg-black rounded-xl flex items-center justify-center relative group cursor-pointer overflow-hidden">
                        <div className="absolute inset-0 bg-primary/20 group-hover:bg-primary/40 transition-colors flex items-center justify-center">
                          <PlayCircle className="h-12 w-12 text-white shadow-xl" />
                        </div>
                        <span className="absolute bottom-2 text-[8px] font-black text-white uppercase tracking-widest">Vídeo Instrutivo</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* ... Outros TabsContents mantidos ... */}
              <TabsContent value="perimetros" className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {["neck", "waist", "hip", "armContractedR", "armContractedL", "thighR", "thighL", "legR", "legL"].map(f => (
                  <div key={f} className="space-y-1">
                    <Label className="text-[10px] uppercase font-bold">{f}</Label>
                    <Input type="number" step="0.1" {...form.register(f as any)} />
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="dobras" className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {["triceps", "subscapular", "abdominal", "suprailiac", "pectoral", "thigh", "midLeg"].map(d => (
                  <div key={d} className="space-y-1">
                    <Label className="text-[10px] font-black uppercase text-primary">{d}</Label>
                    <Input type="number" step="0.1" {...form.register(d as any)} />
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="escaneamento" className="space-y-6">
                <div className="relative aspect-video bg-black rounded-[2rem] overflow-hidden">
                  <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                  {!hasCameraPermission && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white font-black uppercase text-xs">Aguardando Câmera...</div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="funcional" className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="rounded-3xl p-6 border-primary/10 bg-primary/5">
                  <h4 className="font-bold flex items-center gap-2 mb-4 text-primary"><Timer className="h-5 w-5" /> Resistência 1 Min</h4>
                  <div className="space-y-4">
                    <div className="space-y-2"><Label>Abdominais (Reps)</Label><Input type="number" {...form.register("absOneMin")} /></div>
                    <div className="space-y-2"><Label>Flexões de Braço (Reps)</Label><Input type="number" {...form.register("pushUps")} /></div>
                  </div>
                </Card>
                <Card className="rounded-3xl p-6 border-accent/10 bg-accent/5">
                  <h4 className="font-bold flex items-center gap-2 mb-4 text-accent"><Scale className="h-5 w-5" /> Impulsão</h4>
                  <div className="space-y-4">
                    <div className="space-y-2"><Label>Vertical (cm)</Label><Input type="number" {...form.register("verticalJump")} /></div>
                    <div className="space-y-2"><Label>Horizontal (cm)</Label><Input type="number" {...form.register("horizontalJump")} /></div>
                  </div>
                </Card>
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
