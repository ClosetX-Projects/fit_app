
'use client';

import { useState, useEffect } from 'react';
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
import { 
  Loader2, 
  Calendar, 
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
  ClipboardCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StudentAssessmentsViewProps {
  studentId: string;
}

const INITIAL_FORM_DATA = {
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

  useEffect(() => {
    if (assessment) {
      setFormData({
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
      setFormData(INITIAL_FORM_DATA);
    }
  }, [assessment]);

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
      description: "O aluno foi notificado e redirecionado para a aba Saúde.",
    });
  };

  const handleRequestPhysicalAssessment = () => {
    notifyStudent(
      "Avaliação de Aptidão Física",
      "Seu professor solicitou que você preencha seus dados antropométricos. Clique aqui para iniciar.",
      "physical-assessment-request"
    );
    toast({
      title: "Solicitação Enviada!",
      description: "O aluno foi notificado e será levado à aba de Avaliação Física.",
    });
  };

  const handleCreateNewAssessment = async () => {
    setIsCreating(true);
    try {
      const colRef = collection(firestore, 'users', studentId, 'physicalAssessments');
      const newAssessment = {
        userId: studentId,
        date: new Date().toISOString(),
        weight: 0,
        height: 0,
        fatPercentage: 0,
        createdAt: serverTimestamp(),
      };
      
      const docRef = await addDoc(colRef, newAssessment);
      setSelectedAssessmentId(docRef.id);
      
      toast({
        title: "Nova Ficha Aberta",
        description: "Você já pode preencher todos os campos.",
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
    const imc = h > 0 ? (w / ((h / 100) ** 2)).toFixed(1) : "0.0";
    const fatKg = ((w * f) / 100).toFixed(1);
    const leanKg = (w - Number(fatKg)).toFixed(1);

    const updateData = {
      ...formData,
      calculatedResults: { imc, fatKg, leanKg, leanPerc: (100 - f).toFixed(1) },
      updatedAt: serverTimestamp(),
    };

    setDocumentNonBlocking(assessmentRef, updateData, { merge: true });

    notifyStudent(
      "Sua Avaliação Física foi Atualizada",
      `Os resultados da avaliação de ${format(new Date(assessment?.date), "dd/MM")} já estão disponíveis. Confira aqui!`,
      "assessment-result"
    );

    toast({
      title: "Sincronizado!",
      description: "O aluno foi notificado sobre a atualização dos dados.",
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

        <Card className="border-primary/20 shadow-2xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="text-xl font-black text-primary uppercase">Edição de Avaliação</CardTitle>
            <CardDescription>Preencha todos os campos antropométricos e funcionais.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <Tabs defaultValue="anthropometry">
              <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-muted rounded-2xl mb-6">
                <TabsTrigger value="anthropometry" className="rounded-xl py-2 text-xs font-bold uppercase">Antropometria</TabsTrigger>
                <TabsTrigger value="neuromotor" className="rounded-xl py-2 text-xs font-bold uppercase">Neuromotor</TabsTrigger>
                <TabsTrigger value="metabolic" className="rounded-xl py-2 text-xs font-bold uppercase">Metabólico</TabsTrigger>
              </TabsList>

              <TabsContent value="anthropometry" className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase text-primary border-b pb-1">Básicos e Perímetros</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1"><Label className="text-[10px]">Peso (kg)</Label><Input type="number" step="0.1" value={formData.weight} onChange={e => updateField('weight', e.target.value)} /></div>
                      <div className="space-y-1"><Label className="text-[10px]">Altura (cm)</Label><Input type="number" value={formData.height} onChange={e => updateField('height', e.target.value)} /></div>
                    </div>
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
                    <h4 className="text-xs font-black uppercase text-primary border-b pb-1">Dobras Cutâneas</h4>
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
                    <div className="mt-4 p-4 bg-primary/5 rounded-2xl">
                       <Label className="text-[10px] font-black uppercase text-primary">% Gordura Final</Label>
                       <Input type="number" step="0.1" value={formData.fatPercentage} onChange={e => updateField('fatPercentage', e.target.value)} className="h-10 font-bold" />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="neuromotor" className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 bg-primary/5 border-primary/20">
                  <h4 className="text-xs font-black uppercase text-primary mb-4 flex items-center gap-2"><Dumbbell className="h-4 w-4" /> Força</h4>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <Label className="text-[10px]">Teste 10 RM (kg)</Label>
                      <Input type="number" value={formData.tenRmTest ?? 0} onChange={e => updateField('tenRmTest', e.target.value)} />
                    </div>
                  </div>
                </Card>
                <Card className="p-6 bg-accent/5 border-accent/20">
                  <h4 className="text-xs font-black uppercase text-accent mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Funcional</h4>
                  <div className="space-y-4">
                    <div className="space-y-1"><Label className="text-[10px]">Sentar e Levantar (reps)</Label><Input type="number" value={formData.sitToStand ?? 0} onChange={e => updateField('sitToStand', e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-[10px]">TUG (segundos)</Label><Input type="number" step="0.1" value={formData.tug ?? 0} onChange={e => updateField('tug', e.target.value)} /></div>
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
            <CardDescription>Peça para o aluno responder aos questionários.</CardDescription>
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
            <CardDescription>Solicite que o aluno preencha seus perímetros.</CardDescription>
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
            <CardTitle className="text-xl">Ficha Presencial</CardTitle>
            <CardDescription>Preencha os dados agora junto com o aluno.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <Button onClick={handleCreateNewAssessment} disabled={isCreating} variant="outline" className="w-full rounded-full h-12 font-bold border-accent text-accent hover:bg-accent/10 gap-2">
              {isCreating ? <Loader2 className="animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Nova Ficha Manual
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/10 rounded-3xl overflow-hidden shadow-lg">
        <CardHeader className="bg-primary/5 border-b">
          <CardTitle className="text-sm font-black flex items-center gap-2 uppercase">
            <History className="h-4 w-4 text-primary" /> Histórico de Avaliações
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {assessments && assessments.length > 0 ? (
            <div className="divide-y divide-primary/5">
              {assessments.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-6 cursor-pointer hover:bg-primary/5 group" onClick={() => setSelectedAssessmentId(item.id)}>
                  <div>
                    <p className="font-black">{format(new Date(item.date), "dd/MM/yyyy", { locale: ptBR })}</p>
                    <p className="text-xs text-muted-foreground">{item.weight}kg | {item.fatPercentage}% Gord.</p>
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
