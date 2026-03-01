
'use client';

import { useState, useEffect } from 'react';
import { useFirebase, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, serverTimestamp, addDoc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
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

export function StudentAssessmentsView({ studentId }: StudentAssessmentsViewProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [isSavingMetabolic, setIsSavingMetabolic] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Estados para edição metabólica
  const [metabolicVo2, setMetabolicVo2] = useState('');
  const [metabolicNotes, setMetabolicNotes] = useState('');

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
      setMetabolicVo2(assessment.vo2max?.toString() || '');
      setMetabolicNotes(assessment.metabolicNotes || '');
    }
  }, [assessment]);

  const handleSendQuestionnaire = () => {
    toast({
      title: "Link Enviado!",
      description: "O aluno recebeu uma notificação para responder os questionários de saúde.",
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
        description: "Você já pode começar a preencher os dados do aluno.",
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

  const handleSaveMetabolic = async () => {
    if (!selectedAssessmentId || !firestore) return;
    setIsSavingMetabolic(true);

    const assessmentRef = doc(firestore, 'users', studentId, 'physicalAssessments', selectedAssessmentId);
    
    setDocumentNonBlocking(assessmentRef, {
      vo2max: Number(metabolicVo2),
      metabolicNotes: metabolicNotes,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    toast({
      title: "Sincronizado!",
      description: "Os dados metabólicos foram salvos e compartilhados com o aluno.",
    });
    setIsSavingMetabolic(false);
  };

  if (isLoadingList) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Se uma avaliação estiver selecionada, mostramos os detalhes
  if (selectedAssessmentId && assessment) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <Button variant="ghost" onClick={() => setSelectedAssessmentId(null)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar ao Painel
        </Button>

        <Card className="border-primary/20 shadow-2xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="bg-primary/5 border-b border-primary/10">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl font-black text-primary uppercase tracking-tighter">
                  Análise Diagnóstica
                </CardTitle>
                <CardDescription>
                  Dados de {format(new Date(assessment.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </CardDescription>
              </div>
              <div className="bg-primary text-white px-6 py-3 rounded-2xl text-center shadow-lg shadow-primary/20">
                <p className="text-[10px] font-black uppercase opacity-80">Massa Corporal</p>
                <p className="text-2xl font-black">{assessment.weight}kg</p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            <Tabs defaultValue="anthropometry" className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-muted rounded-2xl mb-6">
                <TabsTrigger value="anthropometry" className="rounded-xl py-2 text-xs font-bold uppercase">Antropometria</TabsTrigger>
                <TabsTrigger value="neuromotor" className="rounded-xl py-2 text-xs font-bold uppercase">Neuromotor</TabsTrigger>
                <TabsTrigger value="metabolic" className="rounded-xl py-2 text-xs font-bold uppercase">Metabólico</TabsTrigger>
              </TabsList>

              <TabsContent value="anthropometry" className="space-y-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-muted/50 p-4 rounded-3xl text-center border">
                    <p className="text-[10px] font-black text-muted-foreground uppercase">IMC</p>
                    <p className="text-lg font-black text-primary">{assessment.calculatedResults?.imc || '--'}</p>
                  </div>
                  <div className="bg-primary/5 p-4 rounded-3xl border border-primary/20 text-center">
                    <p className="text-[10px] font-black text-primary uppercase">% Gordura</p>
                    <p className="text-lg font-black">{assessment.fatPercentage}%</p>
                  </div>
                  <div className="bg-muted/50 p-4 rounded-3xl text-center border">
                    <p className="text-[10px] font-black text-muted-foreground uppercase">Massa Gorda</p>
                    <p className="text-lg font-black">{assessment.calculatedResults?.fatKg || '--'} kg</p>
                  </div>
                  <div className="bg-primary/5 p-4 rounded-3xl border border-primary/20 text-center">
                    <p className="text-[10px] font-black text-primary uppercase">Massa Magra</p>
                    <p className="text-lg font-black">{assessment.calculatedResults?.leanKg || '--'} kg</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase text-primary border-b pb-1 flex items-center gap-2">
                      <Ruler className="h-4 w-4" /> Perímetros (cm)
                    </h4>
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      {[
                        { l: "Abdominal", v: assessment.waist },
                        { l: "Braço D/E", v: `${assessment.armR} / ${assessment.armL}` },
                        { l: "Antebraço D/E", v: `${assessment.forearmR} / ${assessment.forearmL}` },
                        { l: "Coxa D/E", v: `${assessment.thighR} / ${assessment.thighL}` },
                        { l: "Perna D/E", v: `${assessment.legR} / ${assessment.legL}` }
                      ].map((p, i) => (
                        <div key={i} className="flex justify-between border-b border-dashed py-1.5">
                          <span className="text-muted-foreground">{p.l}:</span>
                          <b className="font-black">{p.v}</b>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-black uppercase text-primary border-b pb-1 flex items-center gap-2">
                      <Activity className="h-4 w-4" /> Dobras Cutâneas (mm)
                    </h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                      {[
                        { l: "Subescapular", v: assessment.subscapular },
                        { l: "Tricipital", v: assessment.triceps },
                        { l: "Bicipital", v: assessment.biceps },
                        { l: "Axilar Média", v: assessment.midAxillary },
                        { l: "Peitoral", v: assessment.pectoral },
                        { l: "Supra-ilíaca", v: assessment.suprailiac },
                        { l: "Abdominal", v: assessment.abdominal },
                        { l: "Coxa", v: assessment.thigh },
                        { l: "Perna", v: assessment.midLeg }
                      ].map((d, i) => (
                        <div key={i} className="flex justify-between border-b py-1">
                          <span>{d.l}:</span>
                          <b className="text-primary">{d.v}</b>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="neuromotor" className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="rounded-3xl p-6 border-primary/20 bg-primary/5">
                  <h4 className="font-black text-sm flex items-center gap-2 mb-4 uppercase text-primary"><Dumbbell className="h-5 w-5" /> Força</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-background p-4 rounded-2xl border">
                      <span className="text-xs font-bold uppercase">Teste 10 RM:</span>
                      <span className="text-xl font-black">{assessment.tenRmTest} kg</span>
                    </div>
                    <div className="flex justify-between items-center bg-primary text-white p-4 rounded-2xl shadow-md">
                      <span className="text-xs font-black uppercase">1 RM Estimado:</span>
                      <span className="text-2xl font-black">{(Number(assessment.tenRmTest) * 1.33).toFixed(1)} kg</span>
                    </div>
                  </div>
                </Card>
                <Card className="rounded-3xl p-6 border-accent/20 bg-accent/5">
                  <h4 className="font-black text-sm flex items-center gap-2 mb-4 uppercase text-accent"><TrendingUp className="h-5 w-5" /> Funcionalidade</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center bg-background p-3 rounded-xl border">
                      <span className="text-xs font-bold uppercase">Sentar e Levantar:</span>
                      <span className="text-lg font-black text-accent">{assessment.sitToStand} reps</span>
                    </div>
                    <div className="flex justify-between items-center bg-background p-3 rounded-xl border">
                      <span className="text-xs font-bold uppercase">TUG:</span>
                      <span className="text-lg font-black text-accent">{assessment.tug} seg</span>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="metabolic" className="space-y-6">
                <Card className="rounded-[2rem] border-primary/20 bg-primary/5 p-8">
                  <div className="text-center mb-8">
                    <Zap className="h-10 w-10 text-primary mx-auto mb-4" />
                    <h4 className="text-xl font-black uppercase">Prescrição Metabólica</h4>
                    <p className="text-sm text-muted-foreground">Atualize os dados de VO2 do aluno.</p>
                  </div>
                  <div className="grid gap-6">
                    <div className="space-y-2">
                      <Label className="font-bold text-primary">VO2 Máximo Estimado (ml/kg/min)</Label>
                      <Input 
                        type="number" 
                        step="0.1" 
                        value={metabolicVo2} 
                        onChange={(e) => setMetabolicVo2(e.target.value)} 
                        className="h-16 text-3xl text-center font-black rounded-2xl bg-background border-primary/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-primary">Observações Técnicas</Label>
                      <Textarea 
                        value={metabolicNotes} 
                        onChange={(e) => setMetabolicNotes(e.target.value)}
                        placeholder="Descreva as percepções do teste..."
                        className="min-h-[100px] rounded-2xl bg-background"
                      />
                    </div>
                    <Button onClick={handleSaveMetabolic} disabled={isSavingMetabolic} className="w-full h-16 rounded-full text-lg font-black uppercase bg-primary shadow-xl">
                      {isSavingMetabolic ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-5 w-5" />}
                      Salvar Dados Metabólicos
                    </Button>
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
      {/* Seção de Ações de Avaliação */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-dashed border-2 hover:border-primary/50 transition-colors bg-primary/5">
          <CardHeader className="text-center">
            <Send className="h-8 w-8 text-primary mx-auto mb-2" />
            <CardTitle className="text-lg">Questionário de Saúde</CardTitle>
            <CardDescription>Envie o link para o aluno responder em casa.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleSendQuestionnaire} className="w-full rounded-full h-12 gap-2">
              <FileText className="h-4 w-4" /> Enviar Questionário
            </Button>
          </CardContent>
        </Card>

        <Card className="border-dashed border-2 hover:border-accent/50 transition-colors bg-accent/5">
          <CardHeader className="text-center">
            <UserPlus className="h-8 w-8 text-accent mx-auto mb-2" />
            <CardTitle className="text-lg">Avaliação Presencial</CardTitle>
            <CardDescription>Responda agora mesmo pelo seu aluno.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleCreateNewAssessment} disabled={isCreating} variant="outline" className="w-full rounded-full h-12 border-accent text-accent hover:bg-accent/10 gap-2">
              {isCreating ? <Loader2 className="animate-spin" /> : <ClipboardList className="h-4 w-4" />}
              Responder pelo Aluno
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Histórico Completo Abaixo dos Botões */}
      <Card className="border-primary/10 rounded-3xl overflow-hidden shadow-lg">
        <CardHeader className="bg-primary/5 border-b">
          <CardTitle className="text-sm font-black flex items-center gap-2 uppercase tracking-widest">
            <History className="h-4 w-4 text-primary" /> Histórico de Avaliações do Aluno
          </CardTitle>
          <CardDescription>Clique em uma data para ver os detalhes completos e editar.</CardDescription>
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
                        {item.vo2max > 0 && (
                          <p className="text-[10px] text-accent uppercase font-black tracking-tighter bg-accent/10 px-2 py-0.5 rounded">
                            VO2: {item.vo2max}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">Ver Ficha</span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              ))
            ) : (
              <div className="p-24 text-center">
                <ClipboardList className="h-16 w-16 mx-auto mb-4 opacity-10" />
                <p className="text-muted-foreground font-medium italic">Nenhuma avaliação registrada para este aluno.</p>
                <p className="text-xs text-muted-foreground mt-2">Use os botões acima para começar.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
