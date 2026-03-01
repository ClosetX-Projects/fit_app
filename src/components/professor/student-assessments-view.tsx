
'use client';

import { useState, useEffect } from 'react';
import { useFirebase, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, serverTimestamp } from 'firebase/firestore';
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
  History
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

  // Buscar detalhes da avaliação selecionada em tempo real
  const selectedAssessmentRef = useMemoFirebase(() => 
    selectedAssessmentId ? doc(firestore, 'users', studentId, 'physicalAssessments', selectedAssessmentId) : null
  , [firestore, studentId, selectedAssessmentId]);
  
  const { data: assessment } = useDoc(selectedAssessmentRef);

  // Sincronizar estados locais quando a avaliação mudar no banco
  useEffect(() => {
    if (assessment) {
      setMetabolicVo2(assessment.vo2max?.toString() || '');
      setMetabolicNotes(assessment.metabolicNotes || '');
    }
  }, [assessment]);

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
      title: "Dados Metabólicos Sincronizados",
      description: "O aluno já pode visualizar os resultados na página dele.",
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Lista de Avaliações */}
      <Card className="lg:col-span-4 h-fit border-primary/10 rounded-3xl overflow-hidden shadow-md">
        <CardHeader className="bg-primary/5">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5 text-primary" /> Histórico do Aluno
          </CardTitle>
          <CardDescription>Dados atualizados em tempo real.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {assessments && assessments.length > 0 ? (
              <div className="divide-y divide-primary/5">
                {assessments.map((item) => (
                  <div 
                    key={item.id} 
                    className={`flex items-center justify-between p-4 cursor-pointer hover:bg-primary/5 transition-colors ${selectedAssessmentId === item.id ? 'bg-primary/10 border-l-4 border-l-primary' : ''}`}
                    onClick={() => setSelectedAssessmentId(item.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-bold text-sm">{format(new Date(item.date), "dd/MM/yyyy", { locale: ptBR })}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-black">
                          {item.weight}kg | {item.fatPercentage}% GORD.
                        </p>
                      </div>
                    </div>
                    <ChevronRight className={`h-4 w-4 transition-colors ${selectedAssessmentId === item.id ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-muted-foreground italic text-sm">O aluno ainda não possui avaliações.</div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Detalhes da Avaliação Selecionada */}
      <div className="lg:col-span-8">
        {selectedAssessmentId && assessment ? (
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

                <TabsContent value="anthropometry" className="space-y-8 animate-in fade-in duration-500">
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

                <TabsContent value="neuromotor" className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
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

                <TabsContent value="metabolic" className="space-y-6 animate-in fade-in duration-500">
                  <Card className="rounded-[2rem] border-primary/20 bg-primary/5 p-8">
                    <div className="text-center mb-8">
                      <Zap className="h-10 w-10 text-primary mx-auto mb-4" />
                      <h4 className="text-xl font-black uppercase">Prescrição Metabólica</h4>
                      <p className="text-sm text-muted-foreground">Atualize os dados de VO2 e desempenho do aluno.</p>
                    </div>

                    <div className="grid gap-6">
                      <div className="space-y-2">
                        <Label className="font-bold text-primary">VO2 Máximo Estimado (ml/kg/min)</Label>
                        <Input 
                          type="number" 
                          step="0.1" 
                          value={metabolicVo2} 
                          onChange={(e) => setMetabolicVo2(e.target.value)} 
                          className="h-16 text-3xl text-center font-black rounded-2xl bg-background border-primary/40 focus:ring-primary"
                          placeholder="00.0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold text-primary">Observações Técnicas</Label>
                        <Textarea 
                          value={metabolicNotes} 
                          onChange={(e) => setMetabolicNotes(e.target.value)}
                          placeholder="Descreva as percepções do teste e ajustes necessários..."
                          className="min-h-[120px] rounded-2xl bg-background border-primary/20"
                        />
                      </div>
                      <Button 
                        onClick={handleSaveMetabolic} 
                        disabled={isSavingMetabolic} 
                        className="w-full h-16 rounded-full text-lg font-black uppercase tracking-widest bg-primary shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform"
                      >
                        {isSavingMetabolic ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-5 w-5" />}
                        Sincronizar com Aluno
                      </Button>
                    </div>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ) : (
          <div className="h-[600px] flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-[3rem] opacity-30 bg-muted/20">
            <ClipboardList className="h-20 w-20 mb-6 text-primary" />
            <h3 className="text-2xl font-black uppercase">Aguardando Seleção</h3>
            <p className="text-sm max-w-xs font-medium">Selecione uma data no histórico do aluno para gerenciar a avaliação.</p>
          </div>
        )}
      </div>
    </div>
  );
}
