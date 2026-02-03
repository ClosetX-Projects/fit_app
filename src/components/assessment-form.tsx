"use client"

import React, { useState, useEffect } from "react"
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
import { Loader2, Save, Ruler, Activity, Percent, Dumbbell, Zap, HelpCircle, Info, Calculator } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const assessmentSchema = z.object({
  weight: z.coerce.number().min(1, "Peso é obrigatório"),
  height: z.coerce.number().min(1, "Estatura é obrigatória"),
  peitoral: z.coerce.number().optional(),
  cintura: z.coerce.number().optional(),
  abdomen: z.coerce.number().optional(),
  quadril: z.coerce.number().optional(),
  coxa: z.coerce.number().optional(),
  perna: z.coerce.number().optional(),
  braco: z.coerce.number().optional(),
  antebraco: z.coerce.number().optional(),
  threePollock: z.coerce.number().optional(),
  fourPollock: z.coerce.number().optional(),
  sevenPollock: z.coerce.number().optional(),
  upperLeftSegmentFat: z.coerce.number().optional(),
  upperRightSegmentFat: z.coerce.number().optional(),
  lowerLeftSegmentFat: z.coerce.number().optional(),
  lowerRightSegmentFat: z.coerce.number().optional(),
  trunkSegmentFat: z.coerce.number().optional(),
  upperLeftSegmentMass: z.coerce.number().optional(),
  upperRightSegmentMass: z.coerce.number().optional(),
  lowerLeftSegmentMass: z.coerce.number().optional(),
  lowerRightSegmentMass: z.coerce.number().optional(),
  trunkSegmentMass: z.coerce.number().optional(),
  imc: z.coerce.number().optional(),
  fatPercentage: z.coerce.number().optional(),
  muscleMass: z.coerce.number().optional(),
  fatMass: z.coerce.number().optional(),
  totalBodyWater: z.coerce.number().optional(),
  proteins: z.coerce.number().optional(),
  minerals: z.coerce.number().optional(),
  metabolicAge: z.coerce.number().optional(),
  bryzickRepetitionsMax: z.coerce.number().optional(),
  oneRmTest: z.coerce.number().optional(),
  vo2Max: z.coerce.number().optional(),
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
      imc: 0,
      fatPercentage: 0,
      muscleMass: 0,
      fatMass: 0,
    },
  })

  // Assistir campos para cálculos automáticos
  const watchedWeight = form.watch("weight")
  const watchedHeight = form.watch("height")
  const watchedFatPerc = form.watch("fatPercentage")

  useEffect(() => {
    // Cálculo Automático de IMC
    if (watchedWeight > 0 && watchedHeight > 0) {
      const heightInMeters = watchedHeight / 100
      const imc = watchedWeight / (heightInMeters * heightInMeters)
      form.setValue("imc", Number(imc.toFixed(2)))
    }

    // Cálculo de Massa Gorda e Massa Muscular Estimada
    if (watchedWeight > 0 && watchedFatPerc && watchedFatPerc > 0) {
      const fatMassValue = watchedWeight * (watchedFatPerc / 100)
      const muscleMassValue = watchedWeight - fatMassValue
      form.setValue("fatMass", Number(fatMassValue.toFixed(2)))
      form.setValue("muscleMass", Number(muscleMassValue.toFixed(2)))
    }
  }, [watchedWeight, watchedHeight, watchedFatPerc, form])

  const onSubmit = async (values: AssessmentValues) => {
    if (!user || !firestore) return
    setLoading(true)

    try {
      const assessmentRef = doc(collection(firestore, "users", user.uid, "physicalAssessments"))
      const assessmentId = assessmentRef.id

      setDocumentNonBlocking(assessmentRef, {
        id: assessmentId,
        userId: user.uid,
        date: new Date().toISOString(),
        weight: values.weight,
        height: values.height,
        createdAt: serverTimestamp(),
      }, { merge: true })

      const circRef = doc(collection(firestore, "users", user.uid, "physicalAssessments", assessmentId, "circumferenceMeasurements"))
      setDocumentNonBlocking(circRef, {
        id: circRef.id,
        physicalAssessmentId: assessmentId,
        peitoral: values.peitoral || 0,
        cintura: values.cintura || 0,
        abdomen: values.abdomen || 0,
        quadril: values.quadril || 0,
        coxa: values.coxa || 0,
        perna: values.perna || 0,
        braco: values.braco || 0,
        antebraco: values.antebraco || 0,
      }, { merge: true })

      const adipRef = doc(collection(firestore, "users", user.uid, "physicalAssessments", assessmentId, "adiposityMeasurements"))
      setDocumentNonBlocking(adipRef, {
        id: adipRef.id,
        physicalAssessmentId: assessmentId,
        threePollock: values.threePollock || 0,
        fourPollock: values.fourPollock || 0,
        sevenPollock: values.sevenPollock || 0,
      }, { merge: true })

      const bioRef = doc(collection(firestore, "users", user.uid, "physicalAssessments", assessmentId, "bioimpedanceAnalyses"))
      setDocumentNonBlocking(bioRef, {
        id: bioRef.id,
        physicalAssessmentId: assessmentId,
        upperLeftSegmentFat: values.upperLeftSegmentFat || 0,
        upperRightSegmentFat: values.upperRightSegmentFat || 0,
        lowerLeftSegmentFat: values.lowerLeftSegmentFat || 0,
        lowerRightSegmentFat: values.lowerRightSegmentFat || 0,
        trunkSegmentFat: values.trunkSegmentFat || 0,
        upperLeftSegmentMass: values.upperLeftSegmentMass || 0,
        upperRightSegmentMass: values.upperRightSegmentMass || 0,
        lowerLeftSegmentMass: values.lowerLeftSegmentMass || 0,
        lowerRightSegmentMass: values.lowerRightSegmentMass || 0,
        trunkSegmentMass: values.trunkSegmentMass || 0,
        imc: values.imc || 0,
        fatPercentage: values.fatPercentage || 0,
        bodyWeight: values.weight,
        muscleMass: values.muscleMass || 0,
        fatMass: values.fatMass || 0,
        totalBodyWater: values.totalBodyWater || 0,
        proteins: values.proteins || 0,
        minerals: values.minerals || 0,
        metabolicAge: values.metabolicAge || 0,
      }, { merge: true })

      if (values.bryzickRepetitionsMax !== undefined || values.oneRmTest !== undefined) {
        const strengthRef = doc(collection(firestore, "users", user.uid, "physicalAssessments", assessmentId, "strengthAssessments"))
        setDocumentNonBlocking(strengthRef, {
          id: strengthRef.id,
          physicalAssessmentId: assessmentId,
          bryzickRepetitionsMax: values.bryzickRepetitionsMax || 0,
          oneRmTest: values.oneRmTest || 0,
        }, { merge: true })
      }

      if (values.vo2Max !== undefined) {
        const vo2Ref = doc(collection(firestore, "users", user.uid, "physicalAssessments", assessmentId, "vo2MaxAssessments"))
        setDocumentNonBlocking(vo2Ref, {
          id: vo2Ref.id,
          physicalAssessmentId: assessmentId,
          vo2Max: values.vo2Max || 0,
        }, { merge: true })
      }

      toast({
        title: "Avaliação salva com sucesso!",
        description: "Seus dados de desempenho e físicos foram registrados.",
      })
      form.reset()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Ocorreu um problema ao registrar sua avaliação.",
      })
    } finally {
      setLoading(false)
    }
  }

  const LabelWithInfo = ({ label, info, id }: { label: string; info: string; id: string }) => (
    <div className="flex items-center gap-1 mb-2">
      <Label htmlFor={id}>{label}</Label>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-[200px]">
            <p className="text-xs">{info}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )

  return (
    <Card className="w-full max-w-5xl mx-auto border-primary/20 shadow-xl overflow-hidden">
      <CardHeader className="bg-primary/5">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          Nova Avaliação Física e de Desempenho
        </CardTitle>
        <CardDescription>
          Preencha os dados abaixo. Alguns campos são calculados automaticamente para facilitar.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto p-1 bg-muted">
              <TabsTrigger value="basic" className="flex items-center gap-2 py-2 text-xs md:text-sm">
                <Ruler className="h-4 w-4" /> Básicos
              </TabsTrigger>
              <TabsTrigger value="circumference" className="flex items-center gap-2 py-2 text-xs md:text-sm">
                <Dumbbell className="h-4 w-4" /> Medidas
              </TabsTrigger>
              <TabsTrigger value="skinfold" className="flex items-center gap-2 py-2 text-xs md:text-sm">
                <Percent className="h-4 w-4" /> Pollock
              </TabsTrigger>
              <TabsTrigger value="bio" className="flex items-center gap-2 py-2 text-xs md:text-sm">
                <Activity className="h-4 w-4" /> Bioimp.
              </TabsTrigger>
              <TabsTrigger value="performance" className="flex items-center gap-2 py-2 text-xs md:text-sm">
                <Zap className="h-4 w-4" /> Desemp.
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <LabelWithInfo id="weight" label="Peso (kg)" info="Sua massa corporal total medida na balança." />
                  <Input id="weight" type="number" step="0.01" {...form.register("weight")} placeholder="Ex: 80.5" />
                </div>
                <div className="space-y-2">
                  <LabelWithInfo id="height" label="Estatura (cm)" info="Sua altura total em centímetros." />
                  <Input id="height" type="number" {...form.register("height")} placeholder="Ex: 180" />
                </div>
                <div className="space-y-2 bg-primary/5 p-3 rounded-lg border border-primary/20">
                  <LabelWithInfo id="imc" label="IMC (Automático)" info="Índice de Massa Corporal calculado a partir do peso e altura." />
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-primary" />
                    <Input id="imc" type="number" step="0.01" {...form.register("imc")} readOnly className="bg-background font-bold text-primary" />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="circumference" className="space-y-4 pt-4">
              <div className="bg-primary/5 p-4 rounded-lg mb-4 flex gap-3 items-start">
                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  As circunferências (perímetros) ajudam a entender a distribuição da massa muscular e gordura. Use uma fita métrica flexível.
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="peitoral">Peitoral (cm)</Label>
                  <Input id="peitoral" type="number" step="0.1" {...form.register("peitoral")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cintura">Cintura (cm)</Label>
                  <Input id="cintura" type="number" step="0.1" {...form.register("cintura")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="abdomen">Abdômen (cm)</Label>
                  <Input id="abdomen" type="number" step="0.1" {...form.register("abdomen")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quadril">Quadril (cm)</Label>
                  <Input id="quadril" type="number" step="0.1" {...form.register("quadril")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coxa">Coxa (cm)</Label>
                  <Input id="coxa" type="number" step="0.1" {...form.register("coxa")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="perna">Perna (cm)</Label>
                  <Input id="perna" type="number" step="0.1" {...form.register("perna")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="braco">Braço (cm)</Label>
                  <Input id="braco" type="number" step="0.1" {...form.register("braco")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="antebraco">Antebraço (cm)</Label>
                  <Input id="antebraco" type="number" step="0.1" {...form.register("antebraco")} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="skinfold" className="space-y-4 pt-4">
              <div className="bg-primary/5 p-4 rounded-lg mb-4 flex gap-3 items-start">
                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-primary uppercase">Protocolo Pollock</p>
                  <p className="text-xs text-muted-foreground">
                    Mede-se a espessura da gordura subcutânea em mm usando um adipômetro. É um dos métodos mais precisos para atletas.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 border p-4 rounded-lg bg-accent/5">
                  <LabelWithInfo id="threePollock" label="3 Pollock (mm)" info="Soma das dobras: Peitoral, Abdômen e Coxa (homens) ou Tríceps, Supra-ilíaca e Coxa (mulheres)." />
                  <Input id="threePollock" type="number" step="0.1" {...form.register("threePollock")} />
                </div>
                <div className="space-y-2 border p-4 rounded-lg bg-accent/5">
                  <LabelWithInfo id="fourPollock" label="4 Pollock (mm)" info="Utiliza as dobras Tríceps, Supra-ilíaca, Abdômen e Coxa para uma estimativa mais abrangente." />
                  <Input id="fourPollock" type="number" step="0.1" {...form.register("fourPollock")} />
                </div>
                <div className="space-y-2 border p-4 rounded-lg bg-accent/5">
                  <LabelWithInfo id="sevenPollock" label="7 Pollock (mm)" info="O protocolo mais completo. Inclui Subescapular, Axilar Média, Peitoral, Tríceps, Supra-ilíaca, Abdômen e Coxa." />
                  <Input id="sevenPollock" type="number" step="0.1" {...form.register("sevenPollock")} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="bio" className="space-y-6 pt-4">
              <div className="bg-primary/5 p-4 rounded-lg mb-4 flex gap-3 items-start">
                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Dados obtidos geralmente através de balanças de impedância bioelétrica. Insira o percentual para calcular as massas.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="space-y-2 border p-4 rounded-lg bg-primary/5">
                    <LabelWithInfo id="fatPerc" label="% Gordura" info="Percentual total de gordura no corpo." />
                    <Input type="number" step="0.1" {...form.register("fatPercentage")} placeholder="Ex: 15.5" />
                  </div>
                  <div className="space-y-2 border p-4 rounded-lg bg-muted/50">
                    <LabelWithInfo id="fatmass" label="Massa Gorda (kg)" info="Calculado automaticamente: Peso x (% Gordura / 100)." />
                    <Input type="number" step="0.1" {...form.register("fatMass")} readOnly className="bg-background text-destructive font-semibold" />
                  </div>
                  <div className="space-y-2 border p-4 rounded-lg bg-muted/50">
                    <LabelWithInfo id="muscle" label="Massa Magra (kg)" info="Calculado automaticamente: Peso - Massa Gorda." />
                    <Input type="number" step="0.1" {...form.register("muscleMass")} readOnly className="bg-background text-green-600 font-semibold" />
                  </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-3 border-b pb-1 flex items-center gap-2">
                  Gordura Segmentar
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Distribuição de gordura em cada parte específica do corpo.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[11px]">Braço Esq.</Label>
                    <Input type="number" step="0.1" {...form.register("upperLeftSegmentFat")} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px]">Braço Dir.</Label>
                    <Input type="number" step="0.1" {...form.register("upperRightSegmentFat")} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px]">Perna Esq.</Label>
                    <Input type="number" step="0.1" {...form.register("lowerLeftSegmentFat")} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px]">Perna Dir.</Label>
                    <Input type="number" step="0.1" {...form.register("lowerRightSegmentFat")} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px]">Tronco</Label>
                    <Input type="number" step="0.1" {...form.register("trunkSegmentFat")} />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-3 border-b pb-1">Massa Magra Segmentar (kg)</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[11px]">Braço Esq.</Label>
                    <Input type="number" step="0.1" {...form.register("upperLeftSegmentMass")} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px]">Braço Dir.</Label>
                    <Input type="number" step="0.1" {...form.register("upperRightSegmentMass")} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px]">Perna Esq.</Label>
                    <Input type="number" step="0.1" {...form.register("lowerLeftSegmentMass")} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px]">Perna Dir.</Label>
                    <Input type="number" step="0.1" {...form.register("lowerRightSegmentMass")} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px]">Tronco</Label>
                    <Input type="number" step="0.1" {...form.register("trunkSegmentMass")} />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-3 border-b pb-1">Indicadores Gerais</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <LabelWithInfo id="water" label="Água Total (L)" info="Quantidade de líquidos no organismo." />
                    <Input type="number" step="0.1" {...form.register("totalBodyWater")} />
                  </div>
                  <div className="space-y-2">
                    <LabelWithInfo id="protein" label="Proteínas (kg)" info="Massa proteica presente nos tecidos." />
                    <Input type="number" step="0.1" {...form.register("proteins")} />
                  </div>
                  <div className="space-y-2">
                    <LabelWithInfo id="minerals" label="Minerais (kg)" info="Massa mineral óssea e circulante." />
                    <Input type="number" step="0.1" {...form.register("minerals")} />
                  </div>
                  <div className="space-y-2">
                    <LabelWithInfo id="metaAge" label="Idade Metabólica" info="Idade que seu metabolismo reflete em comparação com a média populacional." />
                    <Input type="number" {...form.register("metabolicAge")} />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-6 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 border p-4 rounded-lg bg-primary/5">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <Dumbbell className="h-4 w-4 text-primary" /> Avaliação de Força
                  </h4>
                  <div className="space-y-2">
                    <LabelWithInfo id="bryzick" label="Repetições Máximas (Bryzick)" info="Cálculo indireto de força máxima baseado em quantas vezes você consegue levantar um peso submáximo." />
                    <Input id="bryzick" type="number" {...form.register("bryzickRepetitionsMax")} placeholder="Ex: 10" />
                  </div>
                  <div className="space-y-2">
                    <LabelWithInfo id="oneRm" label="Teste de 1RM (kg)" info="One Repetition Maximum: A maior carga que você consegue levantar para uma única repetição completa." />
                    <Input id="oneRm" type="number" {...form.register("oneRmTest")} placeholder="Ex: 120" />
                  </div>
                </div>

                <div className="space-y-4 border p-4 rounded-lg bg-accent/5">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <Activity className="h-4 w-4 text-accent" /> Capacidade Aeróbica
                  </h4>
                  <div className="space-y-2">
                    <LabelWithInfo id="vo2Max" label="VO2max (ml/kg/min)" info="Consumo máximo de oxigênio: indica sua aptidão cardiovascular e fôlego." />
                    <Input id="vo2Max" type="number" step="0.1" {...form.register("vo2Max")} placeholder="Ex: 45.5" />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <Button type="submit" className="w-full flex items-center gap-2 h-12 text-lg shadow-lg" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Salvando Avaliação...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" /> Finalizar e Registrar Avaliação
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
