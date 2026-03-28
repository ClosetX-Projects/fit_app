
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
import { Loader2, Save, Activity, Dumbbell, History, PlusCircle, ChevronRight, Info, Scale, Camera, HeartPulse, ScanFace } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as ChartTooltip } from 'recharts'
import { format, differenceInYears } from "date-fns"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

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
  // Funcional
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
    defaultValues: { weight: 0, height: 0, isHypertensive: false, isDiabetic: false }
  })

  useEffect(() => {
    if (activeTab === "escaneamento") {
      const getCameraPermission = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({video: true});
          setHasCameraPermission(true);

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Camera Access Denied',
            description: 'Please enable camera permissions in your browser settings to use this app.',
          });
        }
      };
      getCameraPermission();
    }
  }, [activeTab, toast]);

  useEffect(() => {
    if (selectedId && history) {
      const a = history.find(item => item.id === selectedId)
      if (a) {
        form.reset({
          ...a,
          isHypertensive: a.isHypertensive || profile?.isHypertensive || false,
          isDiabetic: a.isDiabetic || profile?.isDiabetic || false,
        })
      }
    } else if (profile) {
      form.setValue('gender', profile.gender || 'male')
      form.setValue('isHypertensive', profile.isHypertensive || false)
      form.setValue('isDiabetic', profile.isDiabetic || false)
    }
  }, [selectedId, history, form, profile])

  const watchedValues = form.watch()
  const gender = watchedValues.gender || profile?.gender || "male"
  const birthDate = watchedValues.birthDate || profile?.birthDate || ''
  const age = birthDate ? differenceInYears(new Date(), new Date(birthDate)) : 30

  const results = useMemo(() => {
    const { 
      weight: w, height: h, waist, hip,
      subscapular: sub, triceps: tri, biceps: bic, midAxillary: max, pectoral: pec, 
      suprailiac: sup, abdominal: abd, thigh: t, midLeg: mlg, bioBodyFat
    } = watchedValues
    
    const imcValue = h > 0 ? (w / ((h / 100) ** 2)) : 0
    let imcClassification = ""
    if (imcValue < 18.5) imcClassification = "Abaixo do peso"
    else if (imcValue < 25) imcClassification = "Peso normal"
    else if (imcValue < 30) imcClassification = "Sobrepeso"
    else if (imcValue < 35) imcClassification = "Obesidade I"
    else if (imcValue < 40) imcClassification = "Obesidade II"
    else imcClassification = "Obesidade III"

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

    let fatPerc = 0
    let protocol = "Adulto"

    const sum7 = Number(sub) + Number(tri) + Number(max) + Number(pec) + Number(abd) + Number(sup) + Number(t)
    const sum4 = Number(bic) + Number(tri) + Number(sub) + Number(sup)

    if (age < 18) {
      protocol = "Adolescente (Slaughter)"
      if (gender === 'male') fatPerc = 0.735 * (Number(tri) + Number(mlg)) + 1.0
      else fatPerc = 0.610 * (Number(tri) + Number(mlg)) + 5.1
    } else if (age >= 18 && age < 60) {
      protocol = "Adulto (J&P 7 Dobras)"
      let dc = 0
      if (gender === 'male') dc = 1.112 - (0.00043499 * sum7) + (0.00000055 * (sum7 ** 2)) - (0.00028826 * age)
      else dc = 1.0970 - (0.00046971 * sum7) + (0.00000056 * (sum7 ** 2)) - (0.00012828 * age)
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

    // Se houver valor de bioimpedancia, podemos dar destaque ou usar como comparação
    const finalFatPerc = bioBodyFat > 0 ? bioBodyFat : Math.max(0, fatPerc)
    const fatKg = (w * finalFatPerc) / 100
    const leanKg = w - fatKg

    let fatClass = "--"
    if (gender === 'male') {
      if (finalFatPerc < 5) fatClass = "Essencial"
      else if (finalFatPerc <= 13) fatClass = "Atleta"
      else if (finalFatPerc <= 17) fatClass = "Boa Forma"
      else if (finalFatPerc <= 24) fatClass = "Aceitável"
      else fatClass = "Obesidade"
    } else {
      if (finalFatPerc < 14) fatClass = "Essencial"
      else if (finalFatPerc <= 20) fatClass = "Atleta"
      else if (finalFatPerc <= 24) fatClass = "Boa Forma"
      else if (finalFatPerc <= 31) fatClass = "Aceitável"
      else fatClass = "Obesidade"
    }

    return { 
      imc: imcValue.toFixed(1), 
      imcClassification,
      rcq: rcqValue.toFixed(2),
      rcqRisk,
      fatPerc: finalFatPerc.toFixed(1), 
      fatKg: fatKg.toFixed(1), 
      leanKg: leanKg.toFixed(1),
      fatClass,
      protocol: bioBodyFat > 0 ? "Bioimpedância" : protocol
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

    // Atualizar sinalizadores de saude no perfil do usuario tambem
    const userRef = doc(firestore, "users", user.uid)
    setDocumentNonBlocking(userRef, {
      isHypertensive: values.isHypertensive,
      isDiabetic: values.isDiabetic,
    }, { merge: true })

    toast({ title: selectedId ? "Avaliação atualizada!" : "Nova avaliação salva!" })
    if (!selectedId) setSelectedId(assessmentRef.id)
    setLoading(false)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto pb-20">
      <Card className="lg:col-span-3 h-fit border-primary/10 rounded-3xl overflow-hidden shadow-lg">
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
          <CardTitle className="text-2xl font-black text-primary uppercase tracking-tighter">AVALIAÇÃO ANTROPOMÉTRICA & CLÍNICA</CardTitle>
          <CardDescription>Protocolos de composição, bioimpedância e triagem de saúde.</CardDescription>
        </CardHeader>
        
        <CardContent className="p-8">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: "Protocolo", val: results.protocol, bg: "bg-muted/50" },
                { label: "% Gordura", val: `${results.fatPerc}%`, bg: "bg-accent/10", border: "border-accent/20" },
                { label: "Status Fat", val: results.fatClass, bg: "bg-muted/50" },
                { label: "RCQ / Risco", val: `${results.rcq} (${results.rcqRisk})`, bg: "bg-primary/10", border: "border-primary/20" },
                { label: "IMC", val: results.imc, bg: "bg-muted/50" }
              ].map((res, i) => (
                <div key={i} className={`${res.bg} p-4 rounded-3xl text-center border ${res.border || 'border-transparent'}`}>
                  <p className="text-[10px] font-black uppercase text-muted-foreground">{res.label}</p>
                  <p className="text-sm font-black truncate">{res.val}</p>
                </div>
              ))}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-6 h-auto p-1 bg-muted rounded-2xl mb-8">
                <TabsTrigger value="antropometria" className="rounded-xl py-3 text-[9px] font-black uppercase">Ficha</TabsTrigger>
                <TabsTrigger value="perimetros" className="rounded-xl py-3 text-[9px] font-black uppercase">Perímetros</TabsTrigger>
                <TabsTrigger value="dobras" className="rounded-xl py-3 text-[9px] font-black uppercase">Dobras</TabsTrigger>
                <TabsTrigger value="bioimpedancia" className="rounded-xl py-3 text-[9px] font-black uppercase">Bioimp.</TabsTrigger>
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
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2"><Label>Data Nasc.</Label><Input type="date" {...form.register("birthDate")} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Sistólica (PA)</Label><Input type="number" {...form.register("systolic")} /></div>
                      <div className="space-y-2"><Label>Diastólica (PA)</Label><Input type="number" {...form.register("diastolic")} /></div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <h4 className="text-xs font-black uppercase text-primary border-b pb-1">Triagem de Risco</h4>
                    <Card className="p-6 bg-destructive/5 border-destructive/10 rounded-3xl space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="font-bold flex items-center gap-2"><HeartPulse className="h-4 w-4 text-destructive" /> Hipertenso</Label>
                          <p className="text-[10px] text-muted-foreground">Monitoramento de PA obrigatório</p>
                        </div>
                        <Switch checked={watchedValues.isHypertensive} onCheckedChange={v => form.setValue('isHypertensive', v)} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="font-bold flex items-center gap-2"><Activity className="h-4 w-4 text-destructive" /> Diabético</Label>
                          <p className="text-[10px] text-muted-foreground">Monitoramento de Glicemia obrigatório</p>
                        </div>
                        <Switch checked={watchedValues.isDiabetic} onCheckedChange={v => form.setValue('isDiabetic', v)} />
                      </div>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="perimetros" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {[
                    { id: "neck", label: "Pescoço" },
                    { id: "shoulder", label: "Ombro" },
                    { id: "chest", label: "Tórax" },
                    { id: "waist", label: "Cintura" },
                    { id: "abdomen", label: "Abdômen" },
                    { id: "hip", label: "Quadril" },
                    { id: "armRelaxedR", label: "B. Rel D." },
                    { id: "armRelaxedL", label: "B. Rel E." },
                    { id: "armContractedR", label: "B. Con D." },
                    { id: "armContractedL", label: "B. Con E." },
                    { id: "forearmR", label: "Anteb D." },
                    { id: "forearmL", label: "Anteb E." },
                    { id: "thighR", label: "Coxa D." },
                    { id: "thighL", label: "Coxa E." },
                    { id: "legR", label: "Perna D." },
                    { id: "legL", label: "Perna E." }
                  ].map(f => (
                    <div key={f.id} className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold">{f.label}</Label>
                      <Input type="number" step="0.1" {...form.register(f.id as any)} className="h-10 rounded-xl" />
                    </div>
                  ))}
              </TabsContent>

              <TabsContent value="dobras" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
              </TabsContent>

              <TabsContent value="bioimpedancia" className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-primary">Taxa Metabólica Basal (kcal)</Label>
                    <Input type="number" {...form.register("bmr")} className="h-12 rounded-xl text-lg font-black" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-primary">Hidratação (%)</Label>
                    <Input type="number" step="0.1" {...form.register("hydration")} className="h-12 rounded-xl text-lg font-black" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-primary">% Gordura Equipamento</Label>
                    <Input type="number" step="0.1" {...form.register("bioBodyFat")} className="h-12 rounded-xl text-lg font-black" />
                  </div>
                </div>
                <Alert className="bg-primary/5 border-primary/10 rounded-2xl">
                  <Info className="h-4 w-4 text-primary" />
                  <AlertTitle className="text-xs font-bold uppercase">Nota sobre Bioimpedância</AlertTitle>
                  <AlertDescription className="text-[11px] opacity-80 italic">Se preenchido, o % de gordura do equipamento terá prioridade sobre o cálculo de dobras cutâneas.</AlertDescription>
                </Alert>
              </TabsContent>

              <TabsContent value="escaneamento" className="space-y-6">
                <div className="relative aspect-video bg-black rounded-[2rem] overflow-hidden group shadow-2xl">
                  <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                  
                  {!(hasCameraPermission) && (
                    <div className="absolute inset-0 flex items-center justify-center p-8 text-center bg-black/60">
                      <div className="space-y-4">
                        <ScanFace className="h-16 w-16 text-white/20 mx-auto" />
                        <p className="text-white font-bold">Aguardando permissão de câmera para escaneamento corporal...</p>
                        <Button variant="outline" className="rounded-full border-white/20 text-white hover:bg-white/10" onClick={() => window.location.reload()}>
                          Solicitar Permissão
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                    <Badge className="bg-primary/80 backdrop-blur-md px-4 py-2 rounded-full font-bold uppercase tracking-widest">Postura Anterior</Badge>
                    <Button size="icon" className="h-16 w-16 rounded-full bg-accent text-accent-foreground shadow-xl">
                      <Camera className="h-8 w-8" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['Anterior', 'Posterior', 'Lateral D.', 'Lateral E.'].map((view) => (
                    <div key={view} className="aspect-square bg-muted rounded-2xl border-2 border-dashed border-primary/10 flex flex-col items-center justify-center text-center p-4">
                      <Camera className="h-6 w-6 text-muted-foreground mb-2" />
                      <span className="text-[10px] font-black uppercase tracking-tighter opacity-60">{view}</span>
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
