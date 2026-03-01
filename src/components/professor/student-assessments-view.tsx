
'use client';

import { useState } from 'react';
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
  TrendingUp
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

  // Buscar lista de avaliações do aluno
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
      title: "Dados Metabólicos Atualizados",
      description: "O VO2 Máx e as notas foram salvos com sucesso.",
    });
    setIsSavingMetabolic(false);
  };

  const handleSelectAssessment = (id: string) => {
    setSelectedAssessmentId(id);
    const selected = assessments?.find(a => a.id === id);
    if (selected) {
      setMetabolicVo2(selected.vo2max?.toString() || '');
      setMetabolicNotes(selected.metabolicNotes || '');
    }
  };

  if (isLoadingList) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
      {/* Lista de Avaliações */}
      <Card className="md:col-span-4 h-fit border-primary/10">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" /> Histórico
          </CardTitle>
          <CardDescription>Clique para ver os detalhes.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {assessments && assessments.length > 0 ? (
              <div className="divide-y">
                {assessments.map((item) => (
                  <div 
                    key={item.id} 
                    className={`flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors ${selectedAssessmentId === item.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                    onClick={() => handleSelectAssessment(item.id)}
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
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-muted-foreground italic text-sm">Nenhuma avaliação realizada.</div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Detalhes da Avaliação Selecionada */}
      <div className="md:col-span-8">
        {selectedAssessmentId && assessment ? (
          <Card className="border-primary/20 shadow-xl rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl font-black text-primary uppercase tracking-tighter">
                    Detalhes da Avaliação
                  </CardTitle>
                  <CardDescription>
                    Realizada em {format(new Date(assessment.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </CardDescription>
                </div>
                <div className="bg-primary text-white px-4 py-2 rounded-2xl text-center">
                  <p className="text-[10px] font-black uppercase">Peso</p>
                  <p className="text-xl font-black">{assessment.weight}kg</p>
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
                  {/* Composição Corporal */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-muted/50 p-3 rounded-2xl border text-center">
                      <p className="text-[10px] font-black text-muted-foreground uppercase">IMC</p>
                      <p className="text-lg font-black text-primary">{assessment.calculatedResults?.imc || '--'}</p>
                    </div>
                    <div className="bg-primary/5 p-3 rounded-2xl border border-primary/20 text-center">
                      <p className="text-[10px] font-black text-primary uppercase">% Gordura</p>
                      <p className="text-lg font-black">{assessment.fatPercentage}%</p>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-2xl border text-center">
                      <p className="text-[10px] font-black text-muted-foreground uppercase">Gordura (kg)</p>
                      <p className="text-lg font-black">{assessment.calculatedResults?.fatKg || '--'} kg</p>
                    </div>
                    <div className="bg-primary/5 p-3 rounded-2xl border border-primary/20 text-center">
                      <p className="text-[10px] font-black text-primary uppercase">Massa Magra (kg)</p>
                      <p className="text-lg font-black">{assessment.calculatedResults?.leanKg || '--'} kg</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Circunferências */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase text-primary border-b pb-1 flex items-center gap-2">
                        <Ruler className="h-4 w-4" /> Circunferências (cm)
                      </h4>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        <div className="flex justify-between border-b border-dashed py-1"><span>Abdominal:</span> <b>{assessment.waist}</b></div>
                        <div className="flex justify-between border-b border-dashed py-1"><span>Braço D:</span> <b>{assessment.armR}</b></div>
                        <div className="flex justify-between border-b border-dashed py-1"><span>Braço E:</span> <b>{assessment.armL}</b></div>
                        <div className="flex justify-between border-b border-dashed py-1"><span>Antebraço D:</span> <b>{assessment.forearmR}</b></div>
                        <div className="flex justify-between border-b border-dashed py-1"><span>Antebraço E:</span> <b>{assessment.forearmL}</b></div>
                        <div className="flex justify-between border-b border-dashed py-1"><span>Coxa D:</span> <b>{assessment.thighR}</b></div>
                        <div className="flex justify-between border-b border-dashed py-1"><span>Coxa E:</span> <b>{assessment.thighL}</b></div>
                        <div className="flex justify-between border-b border-dashed py-1"><span>Perna D:</span> <b>{assessment.legR}</b></div>
                        <div className="flex justify-between border-b border-dashed py-1"><span>Perna E:</span> <b>{assessment.legL}</b></div>
                      </div>
                    </div>

                    {/* Dobras */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-black uppercase text-primary border-b pb-1 flex items-center gap-2">
                        <Activity className="h-4 w-4" /> Dobras Cutâneas (mm)
                      </h4>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                        <div className="flex justify-between border-b border-dashed py-1"><span>Subescapular:</span> <b>{assessment.subscapular}</b></div>
                        <div className="flex justify-between border-b border-dashed py-1"><span>Tricipital:</span> <b>{assessment.triceps}</b></div>
                        <div className="flex justify-between border-b border-dashed py-1"><span>Bicipital:</span> <b>{assessment.biceps}</b></div>
                        <div className="flex justify-between border-b border-dashed py-1"><span>Axilar Média:</span> <b>{assessment.midAxillary}</b></div>
                        <div className="flex justify-between border-b border-dashed py-1"><span>Peitoral:</span> <b>{assessment.pectoral}</b></div>
                        <div className="flex justify-between border-b border-dashed py-1"><span>Supra-ilíaca:</span> <b>{assessment.suprailiac}</b></div>
                        <div className="flex justify-between border-b border-dashed py-1"><span>Abdominal:</span> <b>{assessment.abdominal}</b></div>
                        <div className="flex justify-between border-b border-dashed py-1"><span>Coxa:</span> <b>{assessment.thigh}</b></div>
                        <div className="flex justify-between border-b border-dashed py-1"><span>Perna:</span> <b>{assessment.midLeg}</b></div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="neuromotor" className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
                  <Card className="rounded-3xl p-6 border-primary/10 bg-primary/5">
                    <h4 className="font-bold flex items-center gap-2 mb-4"><Dumbbell className="h-5 w-5 text-primary" /> Força Muscular</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center bg-background p-3 rounded-xl border">
                        <span className="text-xs font-bold uppercase">Teste 10 RM:</span>
                        <span className="text-lg font-black text-primary">{assessment.tenRmTest} kg</span>
                      </div>
                      <div className="flex justify-between items-center bg-primary text-white p-3 rounded-xl">
                        <span className="text-xs font-black uppercase">1 RM Estimado:</span>
                        <span className="text-xl font-black">{(Number(assessment.tenRmTest) * 1.33).toFixed(1)} kg</span>
                      </div>
                    </div>
                  </Card>
                  <Card className="rounded-3xl p-6 border-accent/10 bg-accent/5">
                    <h4 className="font-bold flex items-center gap-2 mb-4"><TrendingUp className="h-5 w-5 text-accent" /> Funcionalidade</h4>
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
                  <Card className="rounded-[2rem] border-primary/20 bg-primary/5 p-6 md:p-10">
                    <div className="text-center mb-8">
                      <Zap className="h-10 w-10 text-primary mx-auto mb-4" />
                      <h4 className="text-xl font-black uppercase tracking-tight">Prescrição Metabólica</h4>
                      <p className="text-sm text-muted-foreground">O personal pode preencher estes dados para o aluno.</p>
                    </div>

                    <div className="grid gap-6">
                      <div className="space-y-2">
                        <Label className="font-bold text-primary">VO2 Máximo Estimado (ml/kg/min)</Label>
                        <Input 
                          type="number" 
                          step="0.1" 
                          value={metabolicVo2} 
                          onChange={(e) => setMetabolicVo2(e.target.value)} 
                          className="h-16 text-3xl text-center font-black rounded-2xl bg-background"
                          placeholder="Ex: 45.5"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-bold text-primary">Observações do Teste Metabólico</Label>
                        <Textarea 
                          value={metabolicNotes} 
                          onChange={(e) => setMetabolicNotes(e.target.value)}
                          placeholder="Descreva o protocolo utilizado e percepções..."
                          className="min-h-[120px] rounded-2xl bg-background"
                        />
                      </div>
                      <Button 
                        onClick={handleSaveMetabolic} 
                        disabled={isSavingMetabolic} 
                        className="w-full h-14 rounded-full text-lg font-black uppercase tracking-widest bg-primary shadow-lg shadow-primary/20"
                      >
                        {isSavingMetabolic ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                        Salvar Dados Metabólicos
                      </Button>
                    </div>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ) : (
          <div className="h-[600px] flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-[3rem] opacity-30 bg-muted/20">
            <ClipboardList className="h-24 w-24 mb-6" />
            <h3 className="text-2xl font-black uppercase">Nenhuma avaliação selecionada</h3>
            <p className="text-sm max-w-xs font-medium">Selecione uma data no histórico ao lado para analisar os dados do aluno.</p>
          </div>
        )}
      </div>
    </div>
  );
}
