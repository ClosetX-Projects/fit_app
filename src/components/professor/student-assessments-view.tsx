
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
  TrendingUp,
  History,
  Send,
  UserPlus,
  ArrowLeft,
  FileText,
  ClipboardCheck,
  Activity
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
  fatPercentage: 0,
  vo2max: 0,
  testNotes: '',
  tenRmTest: 0,
  sitToStand: 0,
  tug: 0,
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
        fatPercentage: assessment.fatPercentage ?? 0,
        vo2max: assessment.vo2max ?? 0,
        testNotes: assessment.testNotes ?? '',
        tenRmTest: assessment.tenRmTest ?? 0,
        sitToStand: assessment.sitToStand ?? 0,
        tug: assessment.tug ?? 0,
        waist: assessment.waist ?? 0,
        armR: assessment.armR ?? 0,
        armL: assessment.armL ?? 0,
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
    if (!formData.weight || !formData.height) return { imc: "0.0", classification: "--", age: 0, protocol: "Adulto" };
    
    const w = Number(formData.weight);
    const h = Number(formData.height);
    const imc = h > 0 ? (w / ((h / 100) ** 2)) : 0;
    
    let classification = "";
    if (imc < 18.5) classification = "Abaixo do peso";
    else if (imc < 25) classification = "Peso normal";
    else if (imc < 30) classification = "Sobrepeso";
    else if (imc < 35) classification = "Obesidade grau I";
    else if (imc < 40) classification = "Obesidade grau II";
    else classification = "Obesidade grau III";

    const age = formData.birthDate ? differenceInYears(new Date(), new Date(formData.birthDate)) : 0;
    let protocol = 'Adulto';
    if (age > 0 && age < 18) protocol = 'Adolescente';
    else if (age >= 60) protocol = 'Idoso';

    return { 
      imc: imc.toFixed(1), 
      classification, 
      age, 
      protocol 
    };
  }, [formData.weight, formData.height, formData.birthDate]);

  const notifyStudent = (title: string, message: string, type: string) => {
    if (!firestore || !studentId) return;
    const notificationRef = collection(firestore, 'users', studentId, 'notifications');
    addDocumentNonBlocking(notificationRef, {
      title,
      message,
      type,
      read: false,
      createdAt: new Date().toISOString()
    });
  };

  const handleSendQuestionnaire = () => {
    notifyStudent(
      "Responder Questionário de Saúde",
      "Seu professor enviou um novo questionário de saúde para você. Clique aqui para responder.",
      "health-questionnaire"
    );
    toast({
      title: "Questionário Enviado!",
      description: "O aluno foi notificado.",
    });
  };

  const handleRequestPhysicalAssessment = () => {
    notifyStudent(
      "Avaliação de Aptidão Física",
      "Seu professor solicitou que você preencha seus dados antropométricos.",
      "physical-assessment-request"
    );
    toast({
      title: "Solicitação Enviada!",
      description: "O aluno foi notificado.",
    });
  };

  const handleCreateNewAssessment = async () => {
    setIsCreating(true);
    try {
      const colRef = collection(firestore, 'users', studentId, 'physicalAssessments');
      const newAssessment = {
        userId: studentId,
        date: new Date().toISOString(),
        fullName: student?.name || '',
        gender: student?.gender || 'male',
        weight: 0,
        height: 0,
        fatPercentage: 0,
        createdAt: serverTimestamp(),
      };
      
      const docRef = await addDoc(colRef, newAssessment);
      setSelectedAssessmentId(docRef.id);
      
      toast({
        title: "Nova Ficha Aberta",
        description: "Preencha os campos para salvar.",
      });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao criar" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveFullAssessment = async () => {
    if (!selectedAssessmentId || !firestore) return;
    setIsSaving(true);

    const assessmentRef = doc(firestore, 'users', studentId, 'physicalAssessments', selectedAssessmentId);
    
    const w = Number(formData.weight) || 0;
    const h = Number(formData.height) || 0;
    const f = Number(formData.fatPercentage) || 0;
    const fatKg = ((w * f) / 100).toFixed(1);
    const leanKg = (w - Number(fatKg)).toFixed(1);

    const updateData = {
      ...formData,
      calculatedResults: { 
        imc: assessmentInsights.imc, 
        imcClassification: assessmentInsights.classification,
        fatKg, 
        leanKg, 
        leanPerc: (100 - f).toFixed(1) 
      },
      age: assessmentInsights.age,
      protocol: assessmentInsights.protocol,
      updatedAt: serverTimestamp(),
    };

    setDocumentNonBlocking(assessmentRef, updateData, { merge: true });

    notifyStudent(
      "Avaliação Física Atualizada",
      `Seus resultados já estão disponíveis. Status: ${assessmentInsights.classification}.`,
      "assessment-result"
    );

    toast({
      title: "Salvo com sucesso!",
      description: "O aluno foi notificado sobre os resultados.",
    });
    setIsSaving(false);
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  if (isLoadingList) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (selectedAssessmentId && assessment) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setSelectedAssessmentId(null)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <Button onClick={handleSaveFullAssessment} disabled={isSaving} className="rounded-full px-8 bg-primary">
            {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar e Notificar
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 bg-muted/50 text-center">
            <p className="text-[10px] font-black uppercase text-muted-foreground">IMC</p>
            <p className="text-2xl font-black">{assessmentInsights.imc}</p>
          </Card>
          <Card className="p-4 bg-primary/10 text-center col-span-1 md:col-span-2">
            <p className="text-[10px] font-black uppercase text-primary">Classificação IMC</p>
            <p className="text-lg font-black">{assessmentInsights.classification}</p>
          </Card>
          <Card className="p-4 bg-accent/10 text-center">
            <p className="text-[10px] font-black uppercase text-accent-foreground">Protocolo</p>
            <p className="text-xl font-black">{assessmentInsights.protocol}</p>
          </Card>
        </div>

        <Card className="border-primary/20 shadow-2xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="text-xl font-black text-primary uppercase">Ficha de Avaliação</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Tabs defaultValue="identification">
              <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-muted rounded-2xl mb-6">
                <TabsTrigger value="identification" className="rounded-xl py-2 text-xs font-bold uppercase">Dados</TabsTrigger>
                <TabsTrigger value="anthropometry" className="rounded-xl py-2 text-xs font-bold uppercase">Medidas</TabsTrigger>
                <TabsTrigger value="neuromotor" className="rounded-xl py-2 text-xs font-bold uppercase">Funcional</TabsTrigger>
                <TabsTrigger value="metabolic" className="rounded-xl py-2 text-xs font-bold uppercase">Metabólico</TabsTrigger>
              </TabsList>

              <TabsContent value="identification" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-primary">Nome Completo</Label>
                    <Input value={formData.fullName} onChange={e => updateField('fullName', e.target.value)} className="rounded-xl h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-primary">Gênero</Label>
                    <Select value={formData.gender} onValueChange={v => updateField('gender', v)}>
                      <SelectTrigger className="rounded-xl h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Masculino</SelectItem>
                        <SelectItem value="female">Feminino</SelectItem>
                        <SelectItem value="other">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-primary">Data de Nascimento</Label>
                    <Input type="date" value={formData.birthDate} onChange={e => updateField('birthDate', e.target.value)} className="rounded-xl h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-primary">Peso Atual (kg)</Label>
                    <Input type="number" step="0.1" value={formData.weight} onChange={e => updateField('weight', e.target.value)} className="rounded-xl h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black uppercase text-primary">Altura (cm)</Label>
                    <Input type="number" value={formData.height} onChange={e => updateField('height', e.target.value)} className="rounded-xl h-12" />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="anthropometry" className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase text-primary border-b pb-1">Perímetros (cm)</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                       {[
                         { id: "waist", label: "Abdômen" },
                         { id: "armR", label: "Braço D." },
                         { id: "armL", label: "Braço E." },
                         { id: "thighR", label: "Coxa D." },
                         { id: "thighL", label: "Coxa E." }
                       ].map(f => (
                         <div key={f.id} className="space-y-1">
                           <Label className="text-[10px]">{f.label}</Label>
                           <Input type="number" step="0.1" value={formData[f.id] ?? 0} onChange={e => updateField(f.id, e.target.value)} />
                         </div>
                       ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase text-primary border-b pb-1">Dobras Cutâneas (mm)</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "triceps", label: "Tric" },
                        { id: "biceps", label: "Bic" },
                        { id: "subscapular", label: "Sub" },
                        { id: "abdominal", label: "Abd" },
                        { id: "suprailiac", label: "Sup" },
                        { id: "thigh", label: "Coxa" }
                      ].map(d => (
                        <div key={d.id} className="space-y-1">
                          <Label className="text-[10px]">{d.label}</Label>
                          <Input type="number" step="0.1" value={formData[d.id] ?? 0} onChange={e => updateField(d.id, e.target.value)} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="neuromotor" className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 bg-primary/5 border-primary/20">
                  <h4 className="text-xs font-black uppercase text-primary mb-4 flex items-center gap-2"><Dumbbell className="h-4 w-4" /> Força</h4>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Teste 10 RM (kg)</Label>
                    <Input type="number" value={formData.tenRmTest ?? 0} onChange={e => updateField('tenRmTest', e.target.value)} />
                  </div>
                </Card>
                <Card className="p-6 bg-accent/5 border-accent/20">
                  <h4 className="text-xs font-black uppercase text-accent mb-4 flex items-center gap-2"><Activity className="h-4 w-4" /> Funcional</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><Label className="text-[10px]">Sentar e Levantar</Label><Input type="number" value={formData.sitToStand ?? 0} onChange={e => updateField('sitToStand', e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-[10px]">TUG (seg)</Label><Input type="number" step="0.1" value={formData.tug ?? 0} onChange={e => updateField('tug', e.target.value)} /></div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="metabolic" className="space-y-6">
                <Card className="p-6 bg-primary/5 border-primary/20">
                  <Label className="font-bold text-primary">VO2 Máximo Estimado</Label>
                  <Input type="number" step="0.1" value={formData.vo2max ?? 0} onChange={(e) => updateField('vo2max', e.target.value)} className="h-12 text-xl font-bold mt-2" />
                  <Label className="font-bold text-primary mt-4 block">Observações do Teste</Label>
                  <Textarea value={formData.testNotes ?? ''} onChange={(e) => updateField('testNotes', e.target.value)} className="mt-2" />
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-dashed border-2 hover:border-primary/50 bg-primary/5">
          <CardHeader className="text-center p-6">
            <FileText className="h-10 w-10 text-primary mx-auto mb-3" />
            <CardTitle className="text-xl">Questionário Saúde</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <Button onClick={handleSendQuestionnaire} className="w-full rounded-full h-12 font-bold gap-2">
              <Send className="h-4 w-4" /> Enviar Saúde
            </Button>
          </CardContent>
        </Card>

        <Card className="border-dashed border-2 hover:border-primary/50 bg-primary/5">
          <CardHeader className="text-center p-6">
            <ClipboardCheck className="h-10 w-10 text-primary mx-auto mb-3" />
            <CardTitle className="text-xl">Aptidão Física</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <Button onClick={handleRequestPhysicalAssessment} variant="outline" className="w-full rounded-full h-12 font-bold border-primary text-primary hover:bg-primary/10 gap-2">
              <Send className="h-4 w-4" /> Pedir Avaliação
            </Button>
          </CardContent>
        </Card>

        <Card className="border-dashed border-2 hover:border-accent/50 bg-accent/5">
          <CardHeader className="text-center p-6">
            <ClipboardList className="h-10 w-10 text-accent mx-auto mb-3" />
            <CardTitle className="text-xl">Ficha Manual</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <Button onClick={handleCreateNewAssessment} disabled={isCreating} variant="outline" className="w-full rounded-full h-12 font-bold border-accent text-accent hover:bg-accent/10 gap-2">
              {isCreating ? <Loader2 className="animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Nova Ficha
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/10 rounded-3xl overflow-hidden shadow-lg">
        <CardHeader className="bg-primary/5 border-b">
          <CardTitle className="text-sm font-black flex items-center gap-2 uppercase">
            <History className="h-4 w-4 text-primary" /> Histórico
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {assessments && assessments.length > 0 ? (
            <div className="divide-y divide-primary/5">
              {assessments.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-6 cursor-pointer hover:bg-primary/5 group" onClick={() => setSelectedAssessmentId(item.id)}>
                  <div>
                    <p className="font-black">
                      {item.date ? format(new Date(item.date), "dd/MM/yyyy", { locale: ptBR }) : '--'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.weight}kg | IMC: {item.calculatedResults?.imc} ({item.calculatedResults?.imcClassification})
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-muted-foreground italic">Nenhuma avaliação registrada.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
