
'use client';

import { useState } from 'react';
import { useFirebase, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Calendar, Activity, Dumbbell, Zap, ChevronRight, ClipboardList } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StudentAssessmentsViewProps {
  studentId: string;
}

export function StudentAssessmentsView({ studentId }: StudentAssessmentsViewProps) {
  const { firestore } = useFirebase();
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);

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
  const { data: assessmentDetails } = useDoc(selectedAssessmentRef);

  // Subcoleções da avaliação selecionada
  const circRef = useMemoFirebase(() => 
    selectedAssessmentId ? collection(firestore, 'users', studentId, 'physicalAssessments', selectedAssessmentId, 'circumferenceMeasurements') : null
  , [firestore, studentId, selectedAssessmentId]);
  const { data: circumferences } = useCollection(circRef);

  const adipRef = useMemoFirebase(() => 
    selectedAssessmentId ? collection(firestore, 'users', studentId, 'physicalAssessments', selectedAssessmentId, 'adiposityMeasurements') : null
  , [firestore, studentId, selectedAssessmentId]);
  const { data: adiposity } = useCollection(adipRef);

  const bioRef = useMemoFirebase(() => 
    selectedAssessmentId ? collection(firestore, 'users', studentId, 'physicalAssessments', selectedAssessmentId, 'bioimpedanceAnalyses') : null
  , [firestore, studentId, selectedAssessmentId]);
  const { data: bioimpedance } = useCollection(bioRef);

  const strengthRef = useMemoFirebase(() => 
    selectedAssessmentId ? collection(firestore, 'users', studentId, 'physicalAssessments', selectedAssessmentId, 'strengthAssessments') : null
  , [firestore, studentId, selectedAssessmentId]);
  const { data: strength } = useCollection(strengthRef);

  const vo2Ref = useMemoFirebase(() => 
    selectedAssessmentId ? collection(firestore, 'users', studentId, 'physicalAssessments', selectedAssessmentId, 'vo2MaxAssessments') : null
  , [firestore, studentId, selectedAssessmentId]);
  const { data: vo2max } = useCollection(vo2Ref);

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
      <Card className="md:col-span-4 h-fit">
        <CardHeader>
          <CardTitle className="text-lg">Histórico</CardTitle>
          <CardDescription>Avaliações realizadas pelo aluno.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            {assessments && assessments.length > 0 ? (
              <div className="divide-y">
                {assessments.map((item) => (
                  <div 
                    key={item.id} 
                    className={`flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors ${selectedAssessmentId === item.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                    onClick={() => setSelectedAssessmentId(item.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{format(new Date(item.date), "dd 'de' MMMM, yyyy", { locale: ptBR })}</p>
                        <p className="text-xs text-muted-foreground">{item.weight}kg | {item.height}cm</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">Nenhuma avaliação encontrada.</div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Detalhes da Avaliação Selecionada */}
      <div className="md:col-span-8">
        {selectedAssessmentId ? (
          <Card className="border-primary/20">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Dados da Avaliação
              </CardTitle>
              <CardDescription>
                {assessmentDetails && format(new Date(assessmentDetails.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto p-1 mb-6">
                  <TabsTrigger value="overview">Básicos</TabsTrigger>
                  <TabsTrigger value="measurements">Medidas</TabsTrigger>
                  <TabsTrigger value="pollock">Pollock</TabsTrigger>
                  <TabsTrigger value="bio">Bioimp.</TabsTrigger>
                  <TabsTrigger value="perf">Desemp.</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <Label className="text-xs text-muted-foreground">Peso Atual</Label>
                      <p className="text-2xl font-bold">{assessmentDetails?.weight} kg</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <Label className="text-xs text-muted-foreground">Estatura</Label>
                      <p className="text-2xl font-bold">{assessmentDetails?.height} cm</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="measurements">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {circumferences?.[0] && Object.entries(circumferences[0]).map(([key, val]) => {
                      if (['id', 'physicalAssessmentId'].includes(key)) return null;
                      return (
                        <div key={key} className="border-b pb-2">
                          <p className="text-[10px] uppercase text-muted-foreground font-bold">{key}</p>
                          <p className="text-lg font-medium">{val as number} cm</p>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="pollock">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-accent/5">
                      <CardHeader className="p-4">
                        <CardTitle className="text-sm">Protocolos Pollock</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 space-y-4">
                         <div>
                            <Label className="text-xs">3 Pollock</Label>
                            <p className="text-xl font-bold">{adiposity?.[0]?.threePollock || 0} mm</p>
                         </div>
                         <div>
                            <Label className="text-xs">4 Pollock</Label>
                            <p className="text-xl font-bold">{adiposity?.[0]?.fourPollock || 0} mm</p>
                         </div>
                         <div>
                            <Label className="text-xs">7 Pollock</Label>
                            <p className="text-xl font-bold">{adiposity?.[0]?.sevenPollock || 0} mm</p>
                         </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="bio" className="space-y-6">
                  {bioimpedance?.[0] && (
                    <>
                      <div>
                        <h4 className="font-bold text-sm mb-3 border-b pb-1">Indicadores Gerais</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="space-y-1">
                            <Label className="text-[10px]">IMC</Label>
                            <p className="font-bold">{bioimpedance[0].imc}</p>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px]">% GORDURA</Label>
                            <p className="font-bold text-primary">{bioimpedance[0].fatPercentage}%</p>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px]">MASSA MUSCULAR</Label>
                            <p className="font-bold">{bioimpedance[0].muscleMass} kg</p>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px]">IDADE METABÓLICA</Label>
                            <p className="font-bold">{bioimpedance[0].metabolicAge}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="p-4 bg-muted/30 rounded-lg">
                            <h5 className="text-xs font-bold mb-2 uppercase">Gordura Segmentar (kg)</h5>
                            <div className="space-y-1 text-sm">
                               <div className="flex justify-between"><span>Sup. Esq:</span> <b>{bioimpedance[0].upperLeftSegmentFat}</b></div>
                               <div className="flex justify-between"><span>Sup. Dir:</span> <b>{bioimpedance[0].upperRightSegmentFat}</b></div>
                               <div className="flex justify-between"><span>Tronco:</span> <b>{bioimpedance[0].trunkSegmentFat}</b></div>
                               <div className="flex justify-between"><span>Inf. Esq:</span> <b>{bioimpedance[0].lowerLeftSegmentFat}</b></div>
                               <div className="flex justify-between"><span>Inf. Dir:</span> <b>{bioimpedance[0].lowerRightSegmentFat}</b></div>
                            </div>
                         </div>
                         <div className="p-4 bg-muted/30 rounded-lg">
                            <h5 className="text-xs font-bold mb-2 uppercase">Massa Segmentar (kg)</h5>
                            <div className="space-y-1 text-sm">
                               <div className="flex justify-between"><span>Sup. Esq:</span> <b>{bioimpedance[0].upperLeftSegmentMass}</b></div>
                               <div className="flex justify-between"><span>Sup. Dir:</span> <b>{bioimpedance[0].upperRightSegmentMass}</b></div>
                               <div className="flex justify-between"><span>Tronco:</span> <b>{bioimpedance[0].trunkSegmentMass}</b></div>
                               <div className="flex justify-between"><span>Inf. Esq:</span> <b>{bioimpedance[0].lowerLeftSegmentMass}</b></div>
                               <div className="flex justify-between"><span>Inf. Dir:</span> <b>{bioimpedance[0].lowerRightSegmentMass}</b></div>
                            </div>
                         </div>
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="perf" className="space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-4 border rounded-lg border-primary/20 bg-primary/5">
                         <h4 className="font-bold text-sm mb-4 flex items-center gap-2">
                            <Dumbbell className="h-4 w-4" /> Força Muscular
                         </h4>
                         <div className="space-y-3">
                            <div>
                               <Label className="text-xs">Bryzick (Reps Máx)</Label>
                               <p className="text-2xl font-bold">{strength?.[0]?.bryzickRepetitionsMax || 0}</p>
                            </div>
                            <div>
                               <Label className="text-xs">Teste de 1RM</Label>
                               <p className="text-2xl font-bold">{strength?.[0]?.oneRmTest || 0} kg</p>
                            </div>
                         </div>
                      </div>

                      <div className="p-4 border rounded-lg border-accent/20 bg-accent/5">
                         <h4 className="font-bold text-sm mb-4 flex items-center gap-2">
                            <Zap className="h-4 w-4" /> Capacidade Aeróbica
                         </h4>
                         <div>
                            <Label className="text-xs">VO2Max Estimado</Label>
                            <p className="text-2xl font-bold text-accent">{vo2max?.[0]?.vo2Max || 0} <span className="text-xs font-normal text-muted-foreground">ml/kg/min</span></p>
                         </div>
                      </div>
                   </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-xl opacity-50">
            <ClipboardList className="h-16 w-16 mb-4" />
            <h3 className="text-xl font-bold">Nenhuma avaliação selecionada</h3>
            <p className="text-muted-foreground">Selecione uma avaliação no histórico ao lado para ver os detalhes completos.</p>
          </div>
        )}
      </div>
    </div>
  );
}
