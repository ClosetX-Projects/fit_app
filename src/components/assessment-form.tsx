"use client"

import React, { useState } from "react"
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
import { Loader2, Save, Ruler, Activity, Percent, Dumbbell, Zap } from "lucide-react"

const assessmentSchema = z.object({
  // Dados Básicos
  weight: z.coerce.number().min(1, "Peso é obrigatório"),
  height: z.coerce.number().min(1, "Estatura é obrigatória"),
  // Circunferências
  peitoral: z.coerce.number().optional(),
  cintura: z.coerce.number().optional(),
  abdomen: z.coerce.number().optional(),
  quadril: z.coerce.number().optional(),
  coxa: z.coerce.number().optional(),
  perna: z.coerce.number().optional(),
  braco: z.coerce.number().optional(),
  antebraco: z.coerce.number().optional(),
  // Adiposidade (Pollock)
  threePollock: z.coerce.number().optional(),
  fourPollock: z.coerce.number().optional(),
  sevenPollock: z.coerce.number().optional(),
  // Bioimpedância - Segmentar Gordura
  upperLeftSegmentFat: z.coerce.number().optional(),
  upperRightSegmentFat: z.coerce.number().optional(),
  lowerLeftSegmentFat: z.coerce.number().optional(),
  lowerRightSegmentFat: z.coerce.number().optional(),
  trunkSegmentFat: z.coerce.number().optional(),
  // Bioimpedância - Segmentar Massa
  upperLeftSegmentMass: z.coerce.number().optional(),
  upperRightSegmentMass: z.coerce.number().optional(),
  lowerLeftSegmentMass: z.coerce.number().optional(),
  lowerRightSegmentMass: z.coerce.number().optional(),
  trunkSegmentMass: z.coerce.number().optional(),
  // Bioimpedância - Gerais
  imc: z.coerce.number().optional(),
  fatPercentage: z.coerce.number().optional(),
  muscleMass: z.coerce.number().optional(),
  fatMass: z.coerce.number().optional(),
  totalBodyWater: z.coerce.number().optional(),
  proteins: z.coerce.number().optional(),
  minerals: z.coerce.number().optional(),
  metabolicAge: z.coerce.number().optional(),
  // Avaliação de Força
  bryzickRepetitionsMax: z.coerce.number().optional(),
  oneRmTest: z.coerce.number().optional(),
  // VO2max
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
    },
  })

  const onSubmit = async (values: AssessmentValues) => {
    if (!user || !firestore) return
    setLoading(true)

    try {
      const assessmentRef = doc(collection(firestore, "users", user.uid, "physicalAssessments"))
      const assessmentId = assessmentRef.id

      // 1. Salvar Avaliação Base
      setDocumentNonBlocking(assessmentRef, {
        id: assessmentId,
        userId: user.uid,
        date: new Date().toISOString(),
        weight: values.weight,
        height: values.height,
        createdAt: serverTimestamp(),
      }, { merge: true })

      // 2. Salvar Circunferências
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

      // 3. Salvar Adiposidade
      const adipRef = doc(collection(firestore, "users", user.uid, "physicalAssessments", assessmentId, "adiposityMeasurements"))
      setDocumentNonBlocking(adipRef, {
        id: adipRef.id,
        physicalAssessmentId: assessmentId,
        threePollock: values.threePollock || 0,
        fourPollock: values.fourPollock || 0,
        sevenPollock: values.sevenPollock || 0,
      }, { merge: true })

      // 4. Salvar Bioimpedância
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

      // 5. Salvar Avaliação de Força
      if (values.bryzickRepetitionsMax !== undefined || values.oneRmTest !== undefined) {
        const strengthRef = doc(collection(firestore, "users", user.uid, "physicalAssessments", assessmentId, "strengthAssessments"))
        setDocumentNonBlocking(strengthRef, {
          id: strengthRef.id,
          physicalAssessmentId: assessmentId,
          bryzickRepetitionsMax: values.bryzickRepetitionsMax || 0,
          oneRmTest: values.oneRmTest || 0,
        }, { merge: true })
      }

      // 6. Salvar VO2max
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

  return (
    <Card className="w-full max-w-5xl mx-auto border-primary/20 shadow-xl">
      <CardHeader className="bg-primary/5">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          Nova Avaliação Física e de Desempenho
        </CardTitle>
        <CardDescription>
          Preencha os dados abaixo para acompanhar sua evolução física e performance.
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">Peso (kg)</Label>
                  <Input id="weight" type="number" step="0.01" {...form.register("weight")} placeholder="Ex: 80.5" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Estatura (cm)</Label>
                  <Input id="height" type="number" {...form.register("height")} placeholder="Ex: 180" />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="circumference" className="space-y-4 pt-4">
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 border p-4 rounded-lg bg-accent/10">
                  <Label htmlFor="threePollock">3 Pollock (mm)</Label>
                  <Input id="threePollock" type="number" step="0.1" {...form.register("threePollock")} />
                  <p className="text-[10px] text-muted-foreground mt-1">Peitoral, Abdômen, Coxa</p>
                </div>
                <div className="space-y-2 border p-4 rounded-lg bg-accent/10">
                  <Label htmlFor="fourPollock">4 Pollock (mm)</Label>
                  <Input id="fourPollock" type="number" step="0.1" {...form.register("fourPollock")} />
                  <p className="text-[10px] text-muted-foreground mt-1">Tríceps, Supra-ilíaca, Abdômen, Coxa</p>
                </div>
                <div className="space-y-2 border p-4 rounded-lg bg-accent/10">
                  <Label htmlFor="sevenPollock">7 Pollock (mm)</Label>
                  <Input id="sevenPollock" type="number" step="0.1" {...form.register("sevenPollock")} />
                  <p className="text-[10px] text-muted-foreground mt-1">Subescapular, Axilar, Peitoral, etc.</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="bio" className="space-y-6 pt-4">
              <div>
                <h4 className="text-sm font-semibold mb-3 border-b pb-1">Análise de Gordura Segmentar (kg/%)</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[11px]">Sup. Esquerdo</Label>
                    <Input type="number" step="0.1" {...form.register("upperLeftSegmentFat")} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px]">Sup. Direito</Label>
                    <Input type="number" step="0.1" {...form.register("upperRightSegmentFat")} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px]">Inf. Esquerdo</Label>
                    <Input type="number" step="0.1" {...form.register("lowerLeftSegmentFat")} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px]">Inf. Direito</Label>
                    <Input type="number" step="0.1" {...form.register("lowerRightSegmentFat")} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px]">Tronco</Label>
                    <Input type="number" step="0.1" {...form.register("trunkSegmentFat")} />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-3 border-b pb-1">Análise de Massa Segmentar (kg)</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[11px]">Sup. Esquerdo</Label>
                    <Input type="number" step="0.1" {...form.register("upperLeftSegmentMass")} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px]">Sup. Direito</Label>
                    <Input type="number" step="0.1" {...form.register("upperRightSegmentMass")} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px]">Inf. Esquerdo</Label>
                    <Input type="number" step="0.1" {...form.register("lowerLeftSegmentMass")} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px]">Inf. Direito</Label>
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
                    <Label>IMC</Label>
                    <Input type="number" step="0.1" {...form.register("imc")} />
                  </div>
                  <div className="space-y-2">
                    <Label>% Gordura</Label>
                    <Input type="number" step="0.1" {...form.register("fatPercentage")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Massa Muscular (kg)</Label>
                    <Input type="number" step="0.1" {...form.register("muscleMass")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Massa Gorda (kg)</Label>
                    <Input type="number" step="0.1" {...form.register("fatMass")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Água Total (L)</Label>
                    <Input type="number" step="0.1" {...form.register("totalBodyWater")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Proteínas (kg)</Label>
                    <Input type="number" step="0.1" {...form.register("proteins")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Minerais (kg)</Label>
                    <Input type="number" step="0.1" {...form.register("minerals")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Idade Metabólica</Label>
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
                    <Label htmlFor="bryzick">Repetições Máximas (Bryzick)</Label>
                    <Input id="bryzick" type="number" {...form.register("bryzickRepetitionsMax")} placeholder="Ex: 10" />
                    <p className="text-[10px] text-muted-foreground">Número de repetições com carga submáxima.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="oneRm">Teste de 1RM (kg)</Label>
                    <Input id="oneRm" type="number" {...form.register("oneRmTest")} placeholder="Ex: 120" />
                    <p className="text-[10px] text-muted-foreground">Carga máxima para uma repetição única.</p>
                  </div>
                </div>

                <div className="space-y-4 border p-4 rounded-lg bg-accent/5">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <Activity className="h-4 w-4 text-accent" /> Capacidade Aeróbica
                  </h4>
                  <div className="space-y-2">
                    <Label htmlFor="vo2Max">VO2max (ml/kg/min)</Label>
                    <Input id="vo2Max" type="number" step="0.1" {...form.register("vo2Max")} placeholder="Ex: 45.5" />
                    <p className="text-[10px] text-muted-foreground">Consumo máximo de oxigênio.</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <Button type="submit" className="w-full flex items-center gap-2" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> Finalizar Avaliação
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
