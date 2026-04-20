
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
import { useUser } from "@/contexts/auth-provider"
import { useApi } from "@/hooks/use-api"
import { fetchApi } from "@/lib/api-client"
import { Loader2, Save, Activity, Scale, Ruler, ChevronRight, Calculator, Users, Mail, UserPlus, Info, Trash2 } from "lucide-react"
import { format, differenceInYears } from "date-fns"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

const assessmentSchema = z.object({
  studentId: z.string().min(1, "Selecione um aluno"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  fullName: z.string().min(2, "Nome obrigatório"),
  birthDate: z.string().min(1, "Data de nascimento obrigatória"),
  gender: z.enum(["male", "female"]),
  weight: z.coerce.number().min(0).default(0),
  height: z.coerce.number().min(0).default(0),
  // Circunferências (16 campos)
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
  // Dobras Cutâneas (9 campos)
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

const DEFAULT_VALUES: AssessmentValues = {
  studentId: "",
  email: "",
  fullName: "",
  birthDate: "",
  gender: "male",
  weight: 0,
  height: 0,
  neck: 0,
  shoulder: 0,
  chest: 0,
  waist: 0,
  abdomen: 0,
  hip: 0,
  thighR: 0,
  thighL: 0,
  legR: 0,
  legL: 0,
  armRelaxedR: 0,
  armRelaxedL: 0,
  armContractedR: 0,
  armContractedL: 0,
  forearmR: 0,
  forearmL: 0,
  subscapular: 0,
  triceps: 0,
  biceps: 0,
  midAxillary: 0,
  pectoral: 0,
  abdominal: 0,
  suprailiac: 0,
  thigh: 0,
  midLeg: 0,
}

interface AssessmentFormProps {
  initialStudentId?: string;
  initialAssessmentId?: string;
}

export function AssessmentForm({ initialStudentId, initialAssessmentId }: AssessmentFormProps) {
  const { toast } = useToast()
  const { user } = useUser()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(initialAssessmentId ? 2 : 1)
  const [selectedId, setSelectedId] = useState<string | null>(initialAssessmentId || null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const isProfessor = user?.role === 'professor';
  const { data: students } = useApi<any[]>(isProfessor ? `/users/alunos` : null);

  const form = useForm<AssessmentValues>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      ...DEFAULT_VALUES,
      studentId: initialStudentId || ""
    }
  })

  const watched = form.watch()
  const isNewStudent = watched.studentId === "new_student";

  const targetId = isProfessor ? watched.studentId : user?.id;
  const { data: history, loading: isHistoryLoading, mutate: mutateHistory } = useApi<any[]>(targetId && targetId !== 'new_student' ? `/avaliacoes_antropo/aluno/${targetId}` : null);

  useEffect(() => {
    if (isProfessor && watched.studentId && watched.studentId !== "new_student" && students) {
      const student = students.find(s => s.id === watched.studentId);
      if (student) {
        form.setValue("fullName", student.nome || "");
        form.setValue("email", student.email || "");
        if (student.biotipo) form.setValue("gender", student.biotipo);
        if (student.data_nascimento) form.setValue("birthDate", student.data_nascimento);
      }
    } else if (!isProfessor && user && isClient) {
      form.setValue("studentId", user.id || "");
      form.setValue("fullName", user.nome || "");
      form.setValue("email", user.email || "");
    }
  }, [watched.studentId, students, isProfessor, user, form, isClient]);

  useEffect(() => {
    if (selectedId && history) {
      const a = history.find(item => item.id === selectedId)
      if (a) {
        form.reset({
          ...DEFAULT_VALUES,
          studentId: a.aluno_id || "",
          weight: a.peso_corporal_kg || 0,
          height: a.estatura_cm || 0,
          neck: a.circ_pescoco_cm || 0,
          shoulder: a.circ_ombro_cm || 0,
          chest: a.circ_torax_cm || 0,
          waist: a.circ_cintura_cm || 0,
          abdomen: a.circ_abdomen_cm || 0,
          hip: a.circ_quadril_cm || 0,
          thighR: a.circ_coxa_dir_cm || 0,
          thighL: a.circ_coxa_esq_cm || 0,
          legR: a.circ_perna_dir_cm || 0,
          legL: a.circ_perna_esq_cm || 0,
          armRelaxedR: a.circ_braco_relax_dir_cm || 0,
          armRelaxedL: a.circ_braco_relax_esq_cm || 0,
          armContractedR: a.circ_braco_contr_dir_cm || 0,
          armContractedL: a.circ_braco_contr_esq_cm || 0,
          forearmR: a.circ_antebraco_dir_cm || 0,
          forearmL: a.circ_antebraco_esq_cm || 0,
          subscapular: a.dobra_subescapular_mm || 0,
          triceps: a.dobra_tricipital_mm || 0,
          biceps: a.dobra_bicipital_mm || 0,
          midAxillary: a.dobra_axilar_media_mm || 0,
          pectoral: a.dobra_peitoral_mm || 0,
          abdominal: a.dobra_abdominal_mm || 0,
          suprailiac: a.dobra_suprailiaca_mm || 0,
          thigh: a.dobra_coxa_mm || 0,
          midLeg: a.dobra_perna_medial_mm || 0,
        })
        setStep(2)
      }
    }
  }, [selectedId, history, form])
  
  const age = useMemo(() => {
    if (!isClient || !watched.birthDate) return 0
    try {
      return differenceInYears(new Date(), new Date(watched.birthDate))
    } catch {
      return 0
    }
  }, [watched.birthDate, isClient])

  const protocol = useMemo(() => {
    if (age === 0) return "..."
    if (age < 18) return "Adolescente (Slaughter)"
    if (age < 60) return "Adulto (Jackson & Pollock 7)"
    return "Idoso (Petroski 1995)"
  }, [age])

  const results = useMemo(() => {
    const { 
      weight: w, height: h, waist, hip, gender,
      subscapular: sub, triceps: tri, midAxillary: max, pectoral: pec,
      abdominal: abd, suprailiac: sup, thigh: t, midLeg: mlg
    } = watched

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

    let fatPerc = 0
    const sum7 = Number(sub) + Number(tri) + Number(max) + Number(pec) + Number(abd) + Number(sup) + Number(t)
    const sum4Idoso = Number(sub) + Number(tri) + Number(sup) + Number(mlg)

    if (age > 0) {
      if (age < 18) {
        if (gender === 'male') fatPerc = 0.735 * (Number(tri) + Number(mlg)) + 1.0
        else fatPerc = 0.610 * (Number(tri) + Number(mlg)) + 5.1
      } else if (age >= 60) {
        let dc = 0
        if (gender === 'male') {
          dc = 1.10726863 - (0.00081201 * sum4Idoso) + (0.00000212 * (sum4Idoso ** 2)) - (0.00041761 * age)
        } else {
          dc = 1.02902361 - (0.00067159 * sum4Idoso) + (0.00000242 * (sum4Idoso ** 2)) - (0.0002073 * age) - (0.00056009 * w) + (0.00054649 * h)
        }
        fatPerc = ((4.95 / dc) - 4.50) * 100
      } else {
        let dc = 0
        if (gender === 'male') dc = 1.112 - (0.00043499 * sum7) + (0.00000055 * (sum7 ** 2)) - (0.00028826 * age)
        else dc = 1.0970 - (0.00046971 * sum7) + (0.00000056 * (sum7 ** 2)) - (0.00012828 * age)
        fatPerc = ((4.95 / dc) - 4.50) * 100
      }
    }

    const finalFatPerc = Math.max(0, fatPerc)
    const fatMass = w * (finalFatPerc / 100)
    const leanMass = w - fatMass

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

  const handleNewRecord = () => {
    setSelectedId(null)
    const currentStudentId = watched.studentId;
    form.reset({ ...DEFAULT_VALUES, studentId: currentStudentId })
    setStep(1)
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Deseja realmente excluir este registro permanentemente?")) return;
    try {
      await fetchApi(`/avaliacoes_antropo/${id}`, { method: 'DELETE' });
      toast({ title: "Registro excluído com sucesso." });
      mutateHistory();
      if (selectedId === id) handleNewRecord();
    } catch (err) {
      toast({ variant: "destructive", title: "Erro ao excluir." });
    }
  };

  const onSubmit = async (values: AssessmentValues) => {
    if (!user || !values.studentId) return
    setLoading(true)
    
    try {
      let targetUserId = values.studentId;

      if (isNewStudent) {
        // Criar aluno via API se for professor
        const payload = {
          nome: values.fullName,
          email: values.email?.toLowerCase().trim(),
          senha: 'senha Padrao A Mudar', // Mock senha placeholder
          biotipo: values.gender === 'male' ? 'masculino' : 'feminino',
          data_nascimento: values.birthDate || '1990-01-01',
          professor_id: user.id,
        };
        const res = await fetchApi('/users/register/aluno', {
          method: 'POST',
          data: payload
        });
        targetUserId = res?.id || targetUserId;
      }

      const apiPayload = {
        aluno_id: targetUserId,
        data_avaliacao: new Date().toISOString(),
        peso_corporal_kg: values.weight,
        estatura_cm: values.height,
        imc: results.imc || 0,
        rcq: results.rcq || 0,
        risco_rcq: results.rcqRisk || '',
        percentual_gordura: Number(results.fatPerc) || 0,
        massa_magra_kg: Number(results.leanMass) || 0,
        peso_gordura_kg: Number(results.fatMass) || 0,
        circ_pescoco_cm: values.neck,
        circ_ombro_cm: values.shoulder,
        circ_torax_cm: values.chest,
        circ_cintura_cm: values.waist,
        circ_abdomen_cm: values.abdomen,
        circ_quadril_cm: values.hip,
        circ_coxa_dir_cm: values.thighR,
        circ_coxa_esq_cm: values.thighL,
        circ_perna_dir_cm: values.legR,
        circ_perna_esq_cm: values.legL,
        circ_braco_relax_dir_cm: values.armRelaxedR,
        circ_braco_relax_esq_cm: values.armRelaxedL,
        circ_braco_contr_dir_cm: values.armContractedR,
        circ_braco_contr_esq_cm: values.armContractedL,
        circ_antebraco_dir_cm: values.forearmR,
        circ_antebraco_esq_cm: values.forearmL,
        dobra_subescapular_mm: values.subscapular,
        dobra_tricipital_mm: values.triceps,
        dobra_bicipital_mm: values.biceps,
        dobra_axilar_media_mm: values.midAxillary,
        dobra_peitoral_mm: values.pectoral,
        dobra_abdominal_mm: values.abdominal,
        dobra_suprailiaca_mm: values.suprailiac,
        dobra_coxa_mm: values.thigh,
        dobra_perna_medial_mm: values.midLeg,
      };

      await fetchApi(selectedId ? `/avaliacoes_antropo/${selectedId}` : '/avaliacoes_antropo/', {
        method: selectedId ? 'PUT' : 'POST',
        data: apiPayload
      });

      toast({ title: isNewStudent ? "Aluno cadastrado e avaliação salva!" : "Avaliação salva com sucesso!" });
      mutateHistory();
      if (isNewStudent) form.setValue("studentId", targetUserId);
    } catch(err) {
      toast({ variant: 'destructive', title: 'Erro ao salvar avaliação.' });
    } finally {
      setLoading(false);
    }
  }

  if (!isClient) return null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto pb-24 px-4">
      <Card className="lg:col-span-3 border-primary/10 rounded-3xl overflow-hidden shadow-lg bg-card h-fit">
        <CardHeader className="bg-primary/5 p-6 border-b">
          <CardTitle className="text-xs font-black flex items-center gap-2 uppercase tracking-widest">
            <Activity className="h-4 w-4 text-primary" /> Histórico {watched.studentId && !isNewStudent ? "(Aluno)" : ""}
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            type="button"
            onClick={handleNewRecord} 
            className="w-full justify-start mt-2 h-10 rounded-xl hover:bg-primary/10 text-primary font-bold"
          >
            + Novo Registro
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            {isHistoryLoading ? (
              <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
            ) : history && history.length > 0 ? history.map((item) => (
              <div
                key={item.id}
                className={`w-full text-left p-4 transition-all hover:bg-primary/5 flex items-center justify-between group border-b border-primary/5 cursor-pointer ${selectedId === item.id ? 'bg-primary/10 border-l-4 border-l-primary' : ''}`}
                onClick={() => setSelectedId(item.id)}
              >
                <div>
                  <p className="text-xs font-bold">{format(new Date(item.data_avaliacao || item.date || new Date().toISOString()), "dd/MM/yyyy")}</p>
                  <p className="text-[10px] uppercase font-black text-muted-foreground mt-1">
                    {item.imc || item.calculatedResults?.imc || 0} IMC | {item.percentual_gordura || item.calculatedResults?.fatPerc || 0}% Gordura
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" 
                    onClick={(e) => handleDelete(item.id, e)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            )) : (
              <div className="p-8 text-center text-[10px] uppercase font-bold text-muted-foreground opacity-50 italic">
                {watched.studentId === "new_student" ? "Cadastrando novo aluno..." : watched.studentId ? "Nenhuma avaliação encontrada." : "Selecione um aluno para ver o histórico."}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="lg:col-span-9 border-primary/20 shadow-2xl rounded-[2.5rem] overflow-hidden bg-background">
        <CardHeader className="bg-primary/5 p-8 border-b border-primary/10">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-black text-primary uppercase tracking-tighter">Avaliação Antropométrica</CardTitle>
              <CardDescription>{selectedId ? "Editando registro histórico." : "Gerenciamento técnico de composição corporal e riscos à saúde."}</CardDescription>
            </div>
            {step === 2 && (
              <div className="bg-primary/10 text-primary px-4 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-primary/20 flex items-center gap-2">
                <Info className="h-3 w-3" /> Protocolo: {results.protocol}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-8">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
            {step === 1 ? (
              <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase text-primary tracking-widest flex items-center gap-2">
                        <Users className="h-3 w-3" /> Selecionar Aluno
                      </Label>
                      {isProfessor ? (
                        <Select 
                          value={watched.studentId} 
                          onValueChange={(v) => form.setValue("studentId", v)}
                          disabled={!!initialStudentId}
                        >
                          <SelectTrigger className="h-12 rounded-xl">
                            <SelectValue placeholder="Escolha um aluno cadastrado..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new_student" className="font-bold text-primary">
                              <div className="flex items-center gap-2">
                                <UserPlus className="h-4 w-4" /> + Novo Aluno (Cadastrar agora)
                              </div>
                            </SelectItem>
                            {students?.map(student => (
                              <SelectItem key={student.id} value={student.id}>{student.nome || student.name || 'Sem nome'}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input value={watched.fullName} readOnly className="h-12 rounded-xl bg-muted" />
                      )}
                    </div>

                    {(isNewStudent || !isProfessor) && (
                      <div className="space-y-2 animate-in slide-in-from-top-2">
                        <Label className="text-xs font-black uppercase text-primary tracking-widest flex items-center gap-2">
                          <Mail className="h-3 w-3" /> E-mail do Aluno
                        </Label>
                        <Input 
                          placeholder="aluno@email.com" 
                          {...form.register("email")} 
                          className="h-12 rounded-xl"
                          readOnly={!isNewStudent && isProfessor}
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase text-primary tracking-widest">Nome Completo</Label>
                      <Input 
                        placeholder="Nome do aluno" 
                        {...form.register("fullName")} 
                        className="h-12 rounded-xl" 
                        readOnly={!isNewStudent && isProfessor}
                      />
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
                </div>
                <Button 
                  type="button" 
                  onClick={() => setStep(2)} 
                  disabled={!watched.studentId || !watched.birthDate || !watched.fullName || (isNewStudent && !watched.email)}
                  className="w-full h-16 rounded-full text-lg font-black bg-primary gap-2 shadow-xl hover:scale-[1.01] transition-transform"
                >
                  INICIAR MEDIDAS TÉCNICAS <ChevronRight className="h-6 w-6" />
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
                    <p className="text-[8px] font-bold uppercase opacity-60">Peso Gordura: {results.fatMass}kg</p>
                  </div>
                </div>

                <Tabs defaultValue="geral" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-muted rounded-2xl mb-8">
                    <TabsTrigger value="geral" className="rounded-xl py-3 text-[10px] font-black uppercase gap-2">
                      <Scale className="h-4 w-4" /> Peso & Altura
                    </TabsTrigger>
                    <TabsTrigger value="perimetros" className="rounded-xl py-3 text-[10px] font-black uppercase gap-2">
                      <Ruler className="h-4 w-4" /> Circunferências
                    </TabsTrigger>
                    <TabsTrigger value="dobras" className="rounded-xl py-3 text-[10px] font-black uppercase gap-2">
                      <Calculator className="h-4 w-4" /> Dobras Cutâneas
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="geral" className="space-y-6 animate-in fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest">Peso Corporal (kg)</Label>
                        <Input type="number" step="0.1" {...form.register("weight")} className="h-14 text-xl font-bold rounded-2xl" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest">Estatura (cm)</Label>
                        <Input type="number" {...form.register("height")} className="h-14 text-xl font-bold rounded-2xl" />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="perimetros" className="space-y-8 animate-in fade-in duration-300">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      {[
                        { id: "neck", label: "Pescoço" },
                        { id: "shoulder", label: "Ombro" },
                        { id: "chest", label: "Tórax" },
                        { id: "waist", label: "Cintura" },
                        { id: "abdomen", label: "Abdômen" },
                        { id: "hip", label: "Quadril" },
                        { id: "thighR", label: "Coxa Dir." },
                        { id: "thighL", label: "Coxa Esq." },
                        { id: "legR", label: "Perna Dir." },
                        { id: "legL", label: "Perna Esq." },
                        { id: "armRelaxedR", label: "Br. Relax. D" },
                        { id: "armRelaxedL", label: "Br. Relax. E" },
                        { id: "armContractedR", label: "Br. Contr. D" },
                        { id: "armContractedL", label: "Br. Contr. E" },
                        { id: "forearmR", label: "Ant.Braço D" },
                        { id: "forearmL", label: "Ant.Braço E" },
                      ].map((f) => (
                        <div key={f.id} className="space-y-1">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground">{f.label} (cm)</Label>
                          <Input type="number" step="0.1" {...form.register(f.id as any)} className="h-10 rounded-xl" />
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="dobras" className="space-y-8 animate-in fade-in duration-300">
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
                    {loading ? <Loader2 className="animate-spin" /> : <Save className="h-6 w-6" />} {selectedId ? "SALVAR ALTERAÇÕES" : isNewStudent ? "CADASTRAR E SALVAR" : "SALVAR AVALIAÇÃO"}
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
