
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
  Activity, 
  Dumbbell, 
  Zap, 
  ChevronRight, 
  ClipboardList, 
  Ruler, 
  Save,
  TrendingUp,
  History,
  Send,
  UserPlus,
  ArrowLeft,
  FileText
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

  // Estados locais para edição completa inicializados corretamente
  const [formData, setFormData] = useState<any>(INITIAL_FORM_DATA);

  // Buscar lista de avaliações do aluno em tempo real
  const assessmentsRef = useMemoFirebase(() => 
    query(
      collection(firestore, 'users', studentId, 'physicalAssessments'),
      orderBy('date', 'desc')
    )
  , [firestore, studentId]);

  const { data: assessments, isLoading: isLoadingList } = useCollection(assessmentsRef);

  // Buscar detalhes da avaliação selecionada
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

  const notifyStudent = (title: string, message: string) => {
    if (!firestore || !studentId) return;
    const notificationRef = collection(firestore, 'users', studentId, 'notifications');
    addDocumentNonBlocking(notificationRef, {
      title,
      message,
      type: 'assessment',
      read: false,
      createdAt: new Date().toISOString()
    });
  };

  const handleSendQuestionnaire = () => {
    notifyStudent(
      "Novo Questionário de Saúde",
      "Seu professor enviou um novo questionário de saúde para você responder."
    );
    toast({
      title: "Notificação Enviada!",
      description: "O aluno recebeu um alerta para responder os questionários.",
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
        calculatedResults: { imc: "0.0", fatKg: "0.0", leanKg: "0.0", leanPerc: "100" }
      };
      
      const docRef = await addDoc(colRef, newAssessment);
      setSelectedAssessmentId(docRef.id);
      
      toast({
        title: "Nova Ficha Aberta",
        description: "Você já pode preencher todos os campos da avaliação.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao criar",
        description: "Não foi possível abrir uma nova avaliação.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveFullAssessment = async () => {
    if (!selectedAssessmentId || !firestore) return;
    setIsSaving(true);

    const assessmentRef = doc(firestore, 'users', studentId, 'physicalAssessments', selectedAssessmentId);
    
    // Cálculos Básicos
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
      "Avaliação Atualizada",
      `Seu professor finalizou a avaliação física do dia ${format(new Date(assessment?.date), "dd/MM")}. Confira os resultados!`
    );

    toast({
      title: "Sincronizado com o Aluno!",
      description: "Todos os campos foram salvos e o aluno foi notificado.",
    });
    setIsSaving(false);
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  if (isLoadingList) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (selectedAssessmentId && assessment) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setSelectedAssessmentId(null)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <Button onClick={handleSaveFullAssessment} disabled={isSaving} className="rounded-full px-8 bg-primary shadow-lg shadow-primary/20">
            {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar e Notificar Aluno
          </Button>
        </div>

        <Card className="border-primary/20 shadow-2xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <CardTitle className="text-xl font-black text-primary uppercase tracking-tighter">
              Edição Completa do Personal
            </CardTitle>
            <CardDescription>
              Preencha todos os perímetros, dobras e testes funcionais.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="p-6">
            <Tabs defaultValue="anthropometry" className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-muted rounded-2xl mb-6">
                <TabsTrigger value="anthropometry" className="rounded-xl py-2 text-xs font-bold uppercase">Antropometria</TabsTrigger>
                <TabsTrigger value="neuromotor" className="rounded-xl py-2 text-xs font-bold uppercase">Neuromotor</TabsTrigger>
                <TabsTrigger value="metabolic" className="rounded-xl py-2 text-xs font-bold uppercase">Metabólico</TabsTrigger>
              </TabsList>

              <TabsContent value="anthropometry" className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase text-primary border-b pb-1 flex items-center gap-2">Básicos e Perímetros</h4>
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
                    <h4 className="text-xs font-black uppercase text-primary border-b pb-1 flex items-center gap-2">Dobras Cutâneas (mm)</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "triceps", label: "Tric" },
                        { id: "biceps", label: "Bic" },
                        { id: "subscapular", label: "Sub" },
                        { id: "abdominal", label: "Abd" },
                        { id: "suprailiac", label: "Sup" },
                        { id: "thigh", label: "Coxa" }
                      ].map(d => (
                        <div key={d.id} className="space-y-1 text-center">
                          <Label className="text-[10px]">{d.label}</Label>
                          <Input type="number" step="0.1" value={formData[d.id] ?? 0} onChange={e => updateField(d.id, e.target.value)} />
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 p-4 bg-primary/5 rounded-2xl border border-primary/20">
                       <Label className="text-[10px] font-black uppercase text-primary">% Gordura Estimado</Label>
                       <Input type="number" step="0.1" value={formData.fatPercentage} onChange={e => updateField('fatPercentage', e.target.value)} className="h-12 text-2xl font-black text-center" />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="neuromotor" className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="rounded-3xl p-6 border-primary/20 bg-primary/5">
                  <h4 className="font-black text-xs flex items-center gap-2 mb-4 uppercase text-primary"><Dumbbell className="h-5 w-5" /> Testes de Força</h4>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <Label className="text-[10px]">Teste 10 RM (kg)</Label>
                      <Input type="number" value={formData.tenRmTest ?? 0} onChange={e => updateField('tenRmTest', e.target.value)} />
                    </div>
                    <div className="p-4 bg-background rounded-2xl border border-primary/10">
                      <p className="text-[10px] font-black uppercase opacity-60">1 RM Estimado:</p>
                      <p className="text-2xl font-black text-primary">{(Number(formData.tenRmTest || 0) * 1.33).toFixed(1)} kg</p>
                    </div>
                  </div>
                </Card>
                <Card className="rounded-3xl p-6 border-accent/20 bg-accent/5">
                  <h4 className="font-black text-xs flex items-center gap-2 mb-4 uppercase text-accent"><TrendingUp className="h-5 w-5" /> Funcionalidade</h4>
                  <div className="space-y-4">
                    <div className="space-y-1"><Label className="text-[10px]">Sentar e Levantar (reps)</Label><Input type="number" value={formData.sitToStand ?? 0} onChange={e => updateField('sitToStand', e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-[10px]">TUG (segundos)</Label><Input type="number" step="0.1" value={formData.tug ?? 0} onChange={e => updateField('tug', e.target.value)} /></div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="metabolic" className="space-y-6">
                <Card className="rounded-[2rem] border-primary/20 bg-primary/5 p-8">
                  <div className="grid gap-6">
                    <div className="space-y-2">
                      <Label className="font-bold text-primary">VO2 Máximo Estimado (ml/kg/min)</Label>
                      <Input 
                        type="number" 
                        step="0.1" 
                        value={formData.vo2max ?? 0} 
                        onChange={(e) => updateField('vo2max', e.target.value)} 
                        className="h-16 text-3xl text-center font-black rounded-2xl bg-background border-primary/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-primary">Observações Técnicas</Label>
                      <Textarea 
                        value={formData.testNotes ?? ''} 
                        onChange={(e) => updateField('testNotes', e.target.value)}
                        placeholder="Descreva as percepções do teste..."
                        className="min-h-[100px] rounded-2xl bg-background"
                      />
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-dashed border-2 hover:border-primary/50 transition-colors bg-primary/5">
          <CardHeader className="text-center p-6">
            <Send className="h-10 w-10 text-primary mx-auto mb-3" />
            <CardTitle className="text-xl">Questionário de Saúde</CardTitle>
            <CardDescription>O aluno será notificado instantaneamente no app.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <Button onClick={handleSendQuestionnaire} className="w-full rounded-full h-14 text-lg font-bold gap-3">
              <FileText className="h-5 w-5" /> Enviar para o Aluno
            </Button>
          </CardContent>
        </Card>

        <Card className="border-dashed border-2 hover:border-accent/50 transition-colors bg-accent/5">
          <CardHeader className="text-center p-6">
            <UserPlus className="h-10 w-10 text-accent mx-auto mb-3" />
            <CardTitle className="text-xl">Avaliação Presencial</CardTitle>
            <CardDescription>Abra uma ficha agora para preencher com o aluno.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <Button onClick={handleCreateNewAssessment} disabled={isCreating} variant="outline" className="w-full rounded-full h-14 text-lg font-bold border-accent text-accent hover:bg-accent/10 gap-3">
              {isCreating ? <Loader2 className="animate-spin" /> : <ClipboardList className="h-5 w-5" />}
              Nova Avaliação Manual
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/10 rounded-3xl overflow-hidden shadow-lg">
        <CardHeader className="bg-primary/5 border-b">
          <CardTitle className="text-sm font-black flex items-center gap-2 uppercase tracking-widest">
            <History className="h-4 w-4 text-primary" /> Histórico de Avaliações
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-primary/5">
            {assessments && assessments.length > 0 ? (
              assessments.map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-center justify-between p-6 cursor-pointer hover:bg-primary/5 transition-all group"
                  onClick={() => setSelectedAssessmentId(item.id)}
                >
                  <div className="flex items-center gap-6">
                    <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <Calendar className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-black text-lg">{format(new Date(item.date), "dd 'de' MMMM, yyyy", { locale: ptBR })}</p>
                      <div className="flex gap-4 mt-1">
                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter bg-muted px-2 py-0.5 rounded">
                          Peso: {item.weight}kg
                        </p>
                        <p className="text-[10px] text-primary uppercase font-black tracking-tighter bg-primary/10 px-2 py-0.5 rounded">
                          Gordura: {item.fatPercentage}%
                        </p>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              ))
            ) : (
              <div className="p-24 text-center">
                <ClipboardList className="h-16 w-16 mx-auto mb-4 opacity-10" />
                <p className="text-muted-foreground font-medium italic">Nenhuma avaliação registrada.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
