
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirebase, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, serverTimestamp, addDoc } from 'firebase/firestore';
import { setDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Loader2, 
  Dumbbell, 
  ChevronRight, 
  ClipboardList, 
  Save,
  History,
  Send,
  UserPlus,
  ArrowLeft,
  FileText,
  ClipboardCheck,
  Activity,
  Info,
  Scale
} from 'lucide-react';
import { format, differenceInYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StudentAssessmentsViewProps {
  studentId: string;
}

const INITIAL_FORM_DATA = {
  fullName: '',
  birthDate: '',
  gender: 'male',
  weight: 0,
  height: 0,
  vo2max: 0,
  testNotes: '',
  tenRmTest: 0,
  sitToStand: 0,
  tug: 0,
  neck: 0,
  shoulder: 0,
  chest: 0,
  waist: 0,
  abdomen: 0,
  hip: 0,
  armRelaxedR: 0,
  armRelaxedL: 0,
  armContractedR: 0,
  armContractedL: 0,
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
};

export function StudentAssessmentsView({ studentId }: StudentAssessmentsViewProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState<any>(INITIAL_FORM_DATA);

  const assessmentsRef = useMemoFirebase(() => 
    query(
      collection(firestore, 'users', studentId, 'physicalAssessments'),
      orderBy('date', 'desc')
    )
  , [firestore, studentId]);

  const { data: assessments, isLoading: isLoadingList } = useCollection(assessmentsRef);

  const selectedAssessmentRef = useMemoFirebase(() => 
    selectedAssessmentId ? doc(firestore, 'users', studentId, 'physicalAssessments', selectedAssessmentId) : null
  , [firestore, studentId, selectedAssessmentId]);
  
  const { data: assessment } = useDoc(selectedAssessmentRef);

  const studentProfileRef = useMemoFirebase(() => doc(firestore, 'users', studentId), [firestore, studentId]);
  const { data: student } = useDoc(studentProfileRef);

  useEffect(() => {
    if (assessment) {
      setFormData({
        fullName: assessment.fullName || student?.name || '',
        birthDate: assessment.birthDate || '',
        gender: assessment.gender || student?.gender || 'male',
        weight: assessment.weight ?? 0,
        height: assessment.height ?? 0,
        vo2max: assessment.vo2max ?? 0,
        testNotes: assessment.testNotes ?? '',
        tenRmTest: assessment.tenRmTest ?? 0,
        sitToStand: assessment.sitToStand ?? 0,
        tug: assessment.tug ?? 0,
        neck: assessment.neck ?? 0,
        shoulder: assessment.shoulder ?? 0,
        chest: assessment.chest ?? 0,
        waist: assessment.waist ?? 0,
        abdomen: assessment.abdomen ?? 0,
        hip: assessment.hip ?? 0,
        armRelaxedR: assessment.armRelaxedR ?? 0,
        armRelaxedL: assessment.armRelaxedL ?? 0,
        armContractedR: assessment.armContractedR ?? 0,
        armContractedL: assessment.armContractedL ?? 0,
        forearmR: assessment.forearmR ?? 0,
        forearmL: assessment.forearmL ?? 0,
        thighR: assessment.thighR ?? 0,
        thighL: assessment.thighL ?? 0,
        legR: assessment.legR ?? 0,
        legL: assessment.legL ?? 0,
        subscapular: assessment.subscapular ?? 0,
        triceps: assessment.triceps ?? 0,
        biceps: assessment.biceps ?? 0,
        midAxillary: assessment.midAxillary ?? 0,
        pectoral: assessment.pectoral ?? 0,
        suprailiac: assessment.suprailiac ?? 0,
        abdominal: assessment.abdominal ?? 0,
        thigh: assessment.thigh ?? 0,
        midLeg: assessment.midLeg ?? 0,
      });
    } else {
      setFormData({
        ...INITIAL_FORM_DATA,
        fullName: student?.name || '',
        gender: student?.gender || 'male'
      });
    }
  }, [assessment, student]);

  const assessmentInsights = useMemo(() => {
    const w = Number(formData.weight) || 0;
    const h = Number(formData.height) || 0;
    const age = formData.birthDate ? differenceInYears(new Date(), new Date(formData.birthDate)) : 0;
    const gender = formData.gender || 'male';
    
    // IMC
    const imc = h > 0 ? (w / ((h / 100) ** 2)) : 0;
    let imcClassification = "--";
    if (imc > 0) {
      if (imc < 18.5) imcClassification = "Abaixo do peso";
      else if (imc < 25) imcClassification = "Peso normal";
      else if (imc < 30) imcClassification = "Sobrepeso";
      else if (imc < 35) imcClassification = "Obesidade grau I";
      else if (imc < 40) imcClassification = "Obesidade grau II";
      else imcClassification = "Obesidade grau III";
    }

    // RCQ
    const waist = Number(formData.waist) || 0;
    const hip = Number(formData.hip) || 0;
    const rcq = hip > 0 ? (waist / hip) : 0;
    let rcqRisk = "--";
    if (rcq > 0) {
      if (gender === 'male') {
        if (rcq < 0.90) rcqRisk = "Baixo";
        else if (rcq < 1.00) rcqRisk = "Moderado";
        else rcqRisk = "Alto";
      } else {
        if (rcq < 0.80) rcqRisk = "Baixo";
        else if (rcq < 0.85) rcqRisk = "Moderado";
        else rcqRisk = "Alto";
      }
    }

    // Composição Corporal
    let fatPerc = 0;
    let protocol = "Adulto";
    
    const sum7 = Number(formData.subscapular) + Number(formData.triceps) + Number(formData.midAxillary) + Number(formData.pectoral) + Number(formData.abdominal) + Number(formData.suprailiac) + Number(formData.thigh);
    const sum4 = Number(formData.biceps) + Number(formData.triceps) + Number(formData.subscapular) + Number(formData.suprailiac);
    
    if (age > 0 && age < 18) {
      protocol = "Adolescente (Slaughter)";
      const triceps = Number(formData.triceps);
      const calf = Number(formData.midLeg);
      if (gender === 'male') {
        fatPerc = 0.735 * (triceps + calf) + 1.0;
      } else {
        fatPerc = 0.610 * (triceps + calf) + 5.1;
      }
    } else if (age >= 18 && age < 60) {
      protocol = "Adulto (Jackson & Pollock 7 Dobras)";
      let dc = 0;
      if (gender === 'male') {
        dc = 1.112 - (0.00043499 * sum7) + (0.00000055 * (sum7 ** 2)) - (0.00028826 * age);
      } else {
        dc = 1.0970 - (0.00046971 * sum7) + (0.00000056 * (sum7 ** 2)) - (0.00012828 * age);
      }
      fatPerc = ((4.95 / dc) - 4.50) * 100;
    } else if (age >= 60) {
      protocol = "Idoso (Durnin & Womersley 4 Dobras)";
      if (sum4 > 0) {
        let c = gender === 'male' ? 1.1715 : 1.1339;
        let m = gender === 'male' ? 0.0779 : 0.0645;
        const dc = c - (m * Math.log10(sum4));
        fatPerc = ((4.95 / dc) - 4.50) * 100;
      }
    }

    fatPerc = Math.max(0, fatPerc);
    const fatKg = (w * fatPerc) / 100;
    const leanKg = w - fatKg;

    // Classificação Gordura
    let fatClass = "--";
    if (gender === 'male') {
      if (fatPerc < 5) fatClass = "Essencial";
      else if (fatPerc <= 13) fatClass = "Atleta";
      else if (fatPerc <= 17) fatClass = "Boa Forma";
      else if (fatPerc <= 24) fatClass = "Aceitável";
      else fatClass = "Obesidade";
    } else {
      if (fatPerc < 14) fatClass = "Essencial";
      else if (fatPerc <= 20) fatClass = "Atleta";
      else if (fatPerc <= 24) fatClass = "Boa Forma";
      else if (fatPerc <= 31) fatClass = "Aceitável";
      else fatClass = "Obesidade";
    }

    return { 
      imc: imc.toFixed(1), 
      imcClassification, 
      rcq: rcq.toFixed(2),
      rcqRisk,
      age, 
      protocol,
      fatPerc: fatPerc.toFixed(1),
      fatKg: fatKg.toFixed(1),
      leanKg: leanKg.toFixed(1),
      fatClass
    };
  }, [formData]);

  const handleSaveFullAssessment = async () => {
    if (!selectedAssessmentId || !firestore) return;
    setIsSaving(true);

    const assessmentRef = doc(firestore, 'users', studentId, 'physicalAssessments', selectedAssessmentId);
    
    const updateData = {
      ...formData,
      calculatedResults: { 
        imc: assessmentInsights.imc, 
        imcClassification: assessmentInsights.imcClassification,
        rcq: assessmentInsights.rcq,
        rcqRisk: assessmentInsights.rcqRisk,
        fatPerc: assessmentInsights.fatPerc,
        fatKg: assessmentInsights.fatKg,
        leanKg: assessmentInsights.leanKg,
        fatClass: assessmentInsights.fatClass
      },
      age: assessmentInsights.age,
      protocol: assessmentInsights.protocol,
      updatedAt: serverTimestamp(),
    };

    setDocumentNonBlocking(assessmentRef, updateData, { merge: true });

    const notificationRef = collection(firestore, 'users', studentId, 'notifications');
    addDocumentNonBlocking(notificationRef, {
      title: "Avaliação Física Atualizada",
      message: `Resultados disponíveis. % Gordura: ${assessmentInsights.fatPerc}% (${assessmentInsights.fatClass}).`,
      type: "assessment-result",
      read: false,
      createdAt: new Date().toISOString()
    });

    toast({ title: "Avaliação Salva!", description: "Dados técnicos registrados com sucesso." });
    setIsSaving(false);
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  if (isLoadingList) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (selectedAssessmentId && assessment) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 pb-20">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setSelectedAssessmentId(null)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <Button onClick={handleSaveFullAssessment} disabled={isSaving} className="rounded-full px-8 bg-primary shadow-xl">
            {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar Avaliação
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-primary/10 border-primary/20 text-center">
            <p className="text-[10px] font-black uppercase text-primary">Protocolo</p>
            <p className="text-xs font-black truncate">{assessmentInsights.protocol}</p>
          </Card>
          <Card className="p-4 bg-accent/10 border-accent/20 text-center">
            <p className="text-[10px] font-black uppercase text-accent-foreground">% Gordura</p>
            <p className="text-xl font-black">{assessmentInsights.fatPerc}%</p>
          </Card>
          <Card className="p-4 bg-muted/50 text-center">
            <p className="text-[10px] font-black uppercase text-muted-foreground">Status Fat</p>
            <p className="text-sm font-black">{assessmentInsights.fatClass}</p>
          </Card>
          <Card className="p-4 bg-primary/5 text-center">
            <p className="text-[10px] font-black uppercase text-primary">Massa Magra</p>
            <p className="text-xl font-black">{assessmentInsights.leanKg} kg</p>
          </Card>
        </div>

        <Card className="border-primary/20 shadow-2xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="text-xl font-black text-primary uppercase flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" /> Ficha Técnica
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Tabs defaultValue="identification">
              <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-muted rounded-2xl mb-8">
                <TabsTrigger value="identification" className="rounded-xl py-3 text-[10px] font-black uppercase">Identificação</TabsTrigger>
                <TabsTrigger value="anthropometry" className="rounded-xl py-3 text-[10px] font-black uppercase">Perímetros</TabsTrigger>
                <TabsTrigger value="skinfolds" className="rounded-xl py-3 text-[10px] font-black uppercase">Dobras</TabsTrigger>
                <TabsTrigger value="functional" className="rounded-xl py-3 text-[10px] font-black uppercase">Funcional</TabsTrigger>
              </TabsList>

              <TabsContent value="identification" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-primary">Nome Completo</Label>
                    <Input value={formData.fullName} onChange={e => updateField('fullName', e.target.value)} className="rounded-xl h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-primary">Data de Nascimento</Label>
                    <Input type="date" value={formData.birthDate} onChange={e => updateField('birthDate', e.target.value)} className="rounded-xl h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-primary">Gênero</Label>
                    <Select value={formData.gender} onValueChange={v => updateField('gender', v)}>
                      <SelectTrigger className="rounded-xl h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Masculino</SelectItem>
                        <SelectItem value="female">Feminino</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-primary">Peso (kg)</Label>
                    <Input type="number" step="0.1" value={formData.weight} onChange={e => updateField('weight', e.target.value)} className="rounded-xl h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-primary">Altura (cm)</Label>
                    <Input type="number" value={formData.height} onChange={e => updateField('height', e.target.value)} className="rounded-xl h-12" />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="anthropometry" className="space-y-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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
                  ].map(item => (
                    <div key={item.id} className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase">{item.label}</Label>
                      <Input type="number" step="0.1" value={formData[item.id]} onChange={e => updateField(item.id, e.target.value)} />
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="skinfolds" className="space-y-8">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
                  {[
                    { id: "subscapular", label: "Subescapular" },
                    { id: "triceps", label: "Tricipital" },
                    { id: "biceps", label: "Bicipital" },
                    { id: "midAxillary", label: "Axilar Média" },
                    { id: "pectoral", label: "Peitoral" },
                    { id: "abdominal", label: "Abdominal" },
                    { id: "suprailiac", label: "Supra-ilíaca" },
                    { id: "thigh", label: "Coxa" },
                    { id: "midLeg", label: "Perna Medial" }
                  ].map(item => (
                    <div key={item.id} className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-primary">{item.label}</Label>
                      <Input type="number" step="0.1" value={formData[item.id]} onChange={e => updateField(item.id, e.target.value)} />
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="functional" className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="p-6 bg-primary/5 border-primary/20 rounded-3xl">
                  <h4 className="font-black text-xs uppercase text-primary mb-4 flex items-center gap-2">
                    <Activity className="h-4 w-4" /> Força & VO2
                  </h4>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <Label className="text-[10px]">Teste 10 RM (kg)</Label>
                      <Input type="number" value={formData.tenRmTest} onChange={e => updateField('tenRmTest', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">VO2 Máx Estimado</Label>
                      <Input type="number" step="0.1" value={formData.vo2max} onChange={e => updateField('vo2max', e.target.value)} />
                    </div>
                  </div>
                </Card>
                <Card className="p-6 bg-accent/5 border-accent/20 rounded-3xl">
                  <h4 className="font-black text-xs uppercase text-accent mb-4 flex items-center gap-2">
                    <Scale className="h-4 w-4" /> Funcional
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[10px]">Sentar e Levantar</Label>
                      <Input type="number" value={formData.sitToStand} onChange={e => updateField('sitToStand', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">TUG (seg)</Label>
                      <Input type="number" step="0.1" value={formData.tug} onChange={e => updateField('tug', e.target.value)} />
                    </div>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-dashed border-2 bg-primary/5 hover:border-primary/50 transition-colors cursor-pointer group" onClick={handleCreateNewAssessment}>
           <CardHeader className="text-center p-8">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                 <UserPlus className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-lg font-black uppercase text-primary">Nova Ficha Manual</CardTitle>
              <CardDescription>Protocolos científicos completos</CardDescription>
           </CardHeader>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
           <ClipboardList className="h-4 w-4" /> Histórico de Avaliações
        </h3>
        {assessments && assessments.length > 0 ? (
           <div className="grid gap-4">
              {assessments.map(item => (
                <div key={item.id} className="nubank-card flex items-center justify-between py-6 px-8 cursor-pointer group" onClick={() => setSelectedAssessmentId(item.id)}>
                   <div>
                      <p className="font-black text-lg">{item.date ? format(new Date(item.date), "dd/MM/yyyy", { locale: ptBR }) : '--'}</p>
                      <div className="flex gap-2 mt-1">
                         <span className="text-[9px] font-black uppercase bg-primary/10 text-primary px-2 rounded-full">IMC: {item.calculatedResults?.imc}</span>
                         <span className="text-[9px] font-black uppercase bg-accent/20 text-accent-foreground px-2 rounded-full">% Gord: {item.calculatedResults?.fatPerc}%</span>
                      </div>
                   </div>
                   <ChevronRight className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-all" />
                </div>
              ))}
           </div>
        ) : (
           <div className="py-20 text-center border-2 border-dashed rounded-[3rem] bg-muted/10">
              <p className="text-sm font-black uppercase text-muted-foreground opacity-30">Nenhum registro encontrado</p>
           </div>
        )}
      </div>
    </div>
  );

  async function handleCreateNewAssessment() {
    setIsCreating(true);
    try {
      const colRef = collection(firestore, 'users', studentId, 'physicalAssessments');
      const docRef = await addDoc(colRef, {
        userId: studentId,
        date: new Date().toISOString(),
        fullName: student?.name || '',
        gender: student?.gender || 'male',
        createdAt: serverTimestamp(),
      });
      setSelectedAssessmentId(docRef.id);
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao criar avaliação" });
    } finally {
      setIsCreating(false);
    }
  }
}
