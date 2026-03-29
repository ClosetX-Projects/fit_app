'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirebase, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, serverTimestamp, addDoc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Loader2, 
  Dumbbell, 
  ChevronRight, 
  Save,
  ArrowLeft,
  Activity,
  Timer,
  Ruler,
  HeartPulse,
  Zap,
  PlayCircle,
  Info,
  Trophy,
  History
} from 'lucide-react';
import { format, differenceInYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { getBloodPressureClassification } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { getIAFG } from '@/lib/sft-scoring';

interface StudentAssessmentsViewProps {
  studentId: string;
}

const INITIAL_FORM_DATA = {
  fullName: '',
  birthDate: '',
  gender: 'male',
  weight: 0,
  height: 0,
  systolic: 0,
  diastolic: 0,
  waist: 0,
  hip: 0,
  neck: 0,
  shoulder: 0,
  chest: 0,
  armContractedR: 0,
  armContractedL: 0,
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
  // Novos Campos de Testes
  tenRmExercise: 'Supino Reto',
  tenRmWeight: 0,
  tenRmReps: 0,
  cooperDistance: 0,
  yoYoDistance: 0,
  bruceTime: 0,
  wellsDistance: 0,
  // Performance
  verticalJump: 0,
  horizontalJump: 0,
  pushUpReps: 0,
  sitUpReps: 0,
  // SFT Idoso
  chairStandReps: 0,
  armCurlReps: 0,
  sixMinWalkDist: 0,
  chairSitAndReach: 0,
  backScratch: 0,
  tugTime: 0,
};

export function StudentAssessmentsView({ studentId }: StudentAssessmentsViewProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<any>(INITIAL_FORM_DATA);

  const assessmentsRef = useMemoFirebase(() => 
    query(collection(firestore, 'users', studentId, 'physicalAssessments'), orderBy('date', 'desc'))
  , [firestore, studentId]);

  const { data: assessments, isLoading: isLoadingList } = useCollection(assessmentsRef);
  const { data: student } = useDoc(useMemoFirebase(() => doc(firestore, 'users', studentId), [firestore, studentId]));
  const { data: assessment } = useDoc(useMemoFirebase(() => 
    selectedAssessmentId ? doc(firestore, 'users', studentId, 'physicalAssessments', selectedAssessmentId) : null
  , [firestore, studentId, selectedAssessmentId]));

  useEffect(() => {
    if (assessment) setFormData({ ...INITIAL_FORM_DATA, ...assessment });
    else if (student) setFormData({ ...INITIAL_FORM_DATA, fullName: student.name, gender: student.gender || 'male', birthDate: student.birthDate || '' });
  }, [assessment, student]);

  const age = useMemo(() => {
    if (!formData.birthDate) return 30;
    try {
      return differenceInYears(new Date(), new Date(formData.birthDate));
    } catch {
      return 30;
    }
  }, [formData.birthDate]);

  const isElderly = age >= 60;

  const results = useMemo(() => {
    const { 
      weight: w, height: h, tenRmWeight, tenRmReps, cooperDistance, yoYoDistance, bruceTime, gender,
      chairStandReps, armCurlReps, sixMinWalkDist, chairSitAndReach, backScratch, tugTime,
      systolic, diastolic 
    } = formData;
    
    // IMC
    const imc = h > 0 ? (w / ((h / 100) ** 2)) : 0;
    
    // 1RM Est. (Brzycki)
    const oneRm = tenRmReps > 0 ? (tenRmWeight / (1.0278 - (0.0278 * tenRmReps))) : 0;
    const oneRmTable = [95, 90, 85, 80, 75, 70, 60, 50].map(p => ({ perc: p, val: (oneRm * (p / 100)).toFixed(1) }));

    // VO2 Max
    const vo2Cooper = cooperDistance > 0 ? (cooperDistance - 504.9) / 44.73 : 0;
    const vo2YoYo = yoYoDistance > 0 ? (yoYoDistance * 0.0084) + 36.4 : 0;
    let vo2Bruce = 0;
    if (bruceTime > 0) {
      vo2Bruce = gender === 'male' 
        ? (14.8 - (1.379 * bruceTime) + (0.451 * Math.pow(bruceTime, 2)) - (0.012 * Math.pow(bruceTime, 3))) 
        : (4.38 * bruceTime - 3.9);
    }

    // SFT Pontuação (IAFG) - Apenas se for idoso
    const iafg = isElderly ? getIAFG(gender, age, {
      chairStandReps: Number(chairStandReps),
      armCurlReps: Number(armCurlReps),
      sixMinWalkDist: Number(sixMinWalkDist),
      chairSitAndReach: Number(chairSitAndReach),
      backScratch: Number(backScratch),
      tugTime: Number(tugTime)
    }) : null;

    const bpClassification = getBloodPressureClassification(Number(systolic), Number(diastolic));

    return { 
      imc: imc.toFixed(1), oneRm: oneRm.toFixed(1), oneRmTable, 
      vo2Cooper: vo2Cooper.toFixed(1), vo2YoYo: vo2YoYo.toFixed(1), vo2Bruce: vo2Bruce.toFixed(1),
      iafg, bpClassification 
    };
  }, [formData, age, isElderly]);

  const handleSave = async () => {
    if (!selectedAssessmentId || !firestore) return;
    setIsSaving(true);
    const assessmentRef = doc(firestore, 'users', studentId, 'physicalAssessments', selectedAssessmentId);
    setDocumentNonBlocking(assessmentRef, { ...formData, calculatedResults: results, updatedAt: serverTimestamp() }, { merge: true });
    toast({ title: "Avaliação Técnica Atualizada!" });
    setIsSaving(false);
  };

  if (isLoadingList) return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

  if (selectedAssessmentId && assessment) {
    return (
      <div className="space-y-8 pb-32 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-20 bg-background/80 backdrop-blur-md py-4 border-b">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setSelectedAssessmentId(null)} className="rounded-full h-12">
              <ArrowLeft className="mr-2 h-5 w-5" /> Voltar
            </Button>
            <div>
              <h3 className="font-black uppercase text-lg text-primary tracking-tighter">Bateria de Testes Físicos</h3>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Sessão: {format(new Date(assessment.date), 'dd/MM/yyyy')}</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="bg-primary rounded-full h-12 px-8 font-black shadow-xl shadow-primary/20">
            {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-5 w-5" />} SALVAR TUDO
          </Button>
        </div>

        {/* Dash de Resultados Rápidos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-6 bg-primary/5 border-primary/10 text-center rounded-[2rem]">
            <p className="text-[10px] font-black uppercase text-primary mb-2">Força Máx (1RM)</p>
            <p className="text-3xl font-black">{results.oneRm}<span className="text-xs ml-1">kg</span></p>
          </Card>
          <Card className="p-6 bg-accent/5 border-accent/10 text-center rounded-[2rem]">
            <p className="text-[10px] font-black uppercase text-accent-foreground mb-2">VO2 Máx (Cooper)</p>
            <p className="text-3xl font-black">{results.vo2Cooper}</p>
          </Card>
          <Card className="p-6 bg-muted/50 border-primary/5 text-center rounded-[2rem]">
            <p className="text-[10px] font-black uppercase text-muted-foreground mb-2">{isElderly ? 'Aptidão Geral (IAFG)' : 'IMC'}</p>
            <p className="text-3xl font-black">{isElderly ? (results.iafg?.total || '--') : results.imc}</p>
            {isElderly && results.iafg && <p className="text-[10px] font-black text-primary uppercase mt-1">{results.iafg.classification}</p>}
          </Card>
          <Card className="p-6 bg-background border-primary/10 text-center rounded-[2rem] flex flex-col justify-center items-center">
            <p className="text-[10px] font-black uppercase text-muted-foreground mb-2">Status Clínico</p>
            {results.bpClassification ? (
              <Badge className={cn("font-black uppercase text-[10px] border-none px-4", results.bpClassification.color, results.bpClassification.textColor)}>
                {results.bpClassification.label}
              </Badge>
            ) : <span className="text-sm font-bold opacity-30 italic">Sem Dados</span>}
          </Card>
        </div>

        <Tabs defaultValue="neuromotor" className="w-full">
          <TabsList className={cn(
            "grid w-full h-auto p-1 bg-muted rounded-3xl mb-10",
            isElderly ? "grid-cols-2 md:grid-cols-5" : "grid-cols-2 md:grid-cols-4"
          )}>
            <TabsTrigger value="neuromotor" className="rounded-2xl py-3 text-[10px] font-black uppercase gap-2"><Zap className="h-4 w-4" /> Neuromotor</TabsTrigger>
            <TabsTrigger value="vo2" className="rounded-2xl py-3 text-[10px] font-black uppercase gap-2"><Activity className="h-4 w-4" /> VO2 Máx</TabsTrigger>
            {isElderly && <TabsTrigger value="senior" className="rounded-2xl py-3 text-[10px] font-black uppercase gap-2"><History className="h-4 w-4" /> Funcional Idoso</TabsTrigger>}
            <TabsTrigger value="performance" className="rounded-2xl py-3 text-[10px] font-black uppercase gap-2"><Trophy className="h-4 w-4" /> Desempenho</TabsTrigger>
            <TabsTrigger value="manual" className="rounded-2xl py-3 text-[10px] font-black uppercase gap-2"><Info className="h-4 w-4" /> Guia</TabsTrigger>
          </TabsList>

          {/* 1. TESTE NEUROMOTOR */}
          <TabsContent value="neuromotor" className="space-y-8 animate-in fade-in slide-in-from-top-2">
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="rounded-[2.5rem] p-8 border-primary/10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary"><Dumbbell className="h-6 w-6" /></div>
                  <div>
                    <h4 className="font-black text-primary uppercase">Predição de 1RM (10RM)</h4>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Teste de carga submáxima</p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase">Exercício Base</Label>
                    <Select value={formData.tenRmExercise} onValueChange={v => setFormData({...formData, tenRmExercise: v})}>
                      <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Supino Reto">Supino Reto</SelectItem>
                        <SelectItem value="Agachamento">Agachamento</SelectItem>
                        <SelectItem value="Leg Press">Leg Press</SelectItem>
                        <SelectItem value="Levantamento Terra">Levantamento Terra</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase">Carga Utilizada (kg)</Label>
                      <Input type="number" value={formData.tenRmWeight} onChange={e => setFormData({...formData, tenRmWeight: Number(e.target.value)})} className="h-12 rounded-xl text-lg font-black" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase">Repetições (Max 10)</Label>
                      <Input type="number" value={formData.tenRmReps} onChange={e => setFormData({...formData, tenRmReps: Number(e.target.value)})} className="h-12 rounded-xl text-lg font-black" />
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="rounded-[2.5rem] p-8 bg-primary text-primary-foreground border-none">
                <h4 className="font-black uppercase mb-6 tracking-widest text-xs opacity-80">Zoneamento de Intensidade</h4>
                <div className="grid grid-cols-2 gap-4">
                  {results.oneRmTable.map(row => (
                    <div key={row.perc} className="bg-white/10 p-4 rounded-2xl flex justify-between items-center border border-white/5">
                      <span className="text-[10px] font-black">{row.perc}%</span>
                      <span className="text-xl font-black">{row.val}kg</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* 2. VO2 MAX */}
          <TabsContent value="vo2" className="space-y-8 animate-in fade-in slide-in-from-top-2">
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="rounded-[2rem] p-6 border-primary/10 hover:border-primary transition-colors group">
                <div className="flex justify-between items-start mb-6">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all"><Timer className="h-5 w-5" /></div>
                  <Badge variant="outline" className="text-[8px] font-black uppercase">Cooper 12'</Badge>
                </div>
                <h5 className="font-black text-sm uppercase mb-4">Distância Percorrida</h5>
                <div className="relative">
                  <Input type="number" value={formData.cooperDistance} onChange={e => setFormData({...formData, cooperDistance: Number(e.target.value)})} className="h-14 rounded-2xl text-2xl font-black pl-4 pr-12" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase opacity-40">metros</span>
                </div>
                <p className="text-[9px] text-muted-foreground font-bold mt-4 uppercase leading-relaxed">Resultado Estimado: <span className="text-primary">{results.cooperDistance > 0 ? results.vo2Cooper : '--'} ml/kg/min</span></p>
              </Card>

              <Card className="rounded-[2rem] p-6 border-primary/10 hover:border-primary transition-colors group">
                <div className="flex justify-between items-start mb-6">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all"><Activity className="h-5 w-5" /></div>
                  <Badge variant="outline" className="text-[8px] font-black uppercase">Yo-Yo Test</Badge>
                </div>
                <h5 className="font-black text-sm uppercase mb-4">Distância Final</h5>
                <div className="relative">
                  <Input type="number" value={formData.yoYoDistance} onChange={e => setFormData({...formData, yoYoDistance: Number(e.target.value)})} className="h-14 rounded-2xl text-2xl font-black pl-4 pr-12" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase opacity-40">metros</span>
                </div>
              </Card>

              <Card className="rounded-[2rem] p-6 border-primary/10 hover:border-primary transition-colors group">
                <div className="flex justify-between items-start mb-6">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all"><HeartPulse className="h-5 w-5" /></div>
                  <Badge variant="outline" className="text-[8px] font-black uppercase">Bruce (Rampa)</Badge>
                </div>
                <h5 className="font-black text-sm uppercase mb-4">Tempo Total</h5>
                <div className="relative">
                  <Input type="number" step="0.1" value={formData.bruceTime} onChange={e => setFormData({...formData, bruceTime: Number(e.target.value)})} className="h-14 rounded-2xl text-2xl font-black pl-4 pr-12" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase opacity-40">min</span>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* 3. SENIOR FITNESS TEST (SFT) */}
          {isElderly && (
            <TabsContent value="senior" className="space-y-10 animate-in fade-in slide-in-from-top-2">
              <Alert className="rounded-[2rem] bg-accent/10 border-accent/20">
                <Info className="h-5 w-5 text-accent-foreground" />
                <AlertTitle className="font-black uppercase text-xs">Protocolo SFT (Rikli & Jones)</AlertTitle>
                <AlertDescription className="text-[11px] font-medium opacity-80 uppercase leading-relaxed">
                  Aplique esta bateria para alunos com 60 anos ou mais. O sistema calculará o IAFG automaticamente.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { id: 'chairStandReps', label: 'Levantar e Sentar', icon: Ruler, unit: 'reps', desc: '30 seg. com braços cruzados' },
                  { id: 'armCurlReps', label: 'Flexão Antebraço', icon: Dumbbell, unit: 'reps', desc: '30 seg. (2kg F / 4kg M)' },
                  { id: 'sixMinWalkDist', label: 'Caminhada 6 Min', icon: Timer, unit: 'metros', desc: 'Maior distância sem correr' },
                  { id: 'chairSitAndReach', label: 'Sentar e Alcançar', icon: Ruler, unit: 'cm', desc: 'Distância até a ponta do pé' },
                  { id: 'backScratch', label: 'Alcançar Costas', icon: HeartPulse, unit: 'cm', desc: 'Sobreposição dos dedos médios' },
                  { id: 'tugTime', label: 'Agilidade (TUG)', icon: Zap, unit: 'seg', desc: 'Levantar, andar 2,44m e sentar' },
                ].map(test => (
                  <div key={test.id} className="nubank-card border-primary/5 bg-card p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <test.icon className="h-4 w-4 text-primary" />
                      <Label className="text-[10px] font-black uppercase tracking-widest">{test.label}</Label>
                    </div>
                    <div className="relative">
                      <Input type="number" step="0.1" value={formData[test.id]} onChange={e => setFormData({...formData, [test.id]: Number(e.target.value)})} className="h-12 rounded-xl text-lg font-black pr-12" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black uppercase opacity-40">{test.unit}</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-2 font-bold uppercase">{test.desc}</p>
                  </div>
                ))}
              </div>
            </TabsContent>
          )}

          {/* 4. PERFORMANCE */}
          <TabsContent value="performance" className="space-y-8 animate-in fade-in slide-in-from-top-2">
            <div className="grid md:grid-cols-2 gap-8">
              <section className="space-y-6">
                <h4 className="font-black text-xs uppercase text-primary tracking-widest flex items-center gap-2"><Zap className="h-4 w-4" /> Potência Muscular</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase">Impulsão Vertical (cm)</Label>
                    <Input type="number" value={formData.verticalJump} onChange={e => setFormData({...formData, verticalJump: Number(e.target.value)})} className="h-12 rounded-xl font-black" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase">Impulsão Horizontal (cm)</Label>
                    <Input type="number" value={formData.horizontalJump} onChange={e => setFormData({...formData, horizontalJump: Number(e.target.value)})} className="h-12 rounded-xl font-black" />
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <h4 className="font-black text-xs uppercase text-primary tracking-widest flex items-center gap-2"><Activity className="h-4 w-4" /> Resistência (RML)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase">Abdominais (1 min)</Label>
                    <Input type="number" value={formData.sitUpReps} onChange={e => setFormData({...formData, sitUpReps: Number(e.target.value)})} className="h-12 rounded-xl font-black" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase">Flexões de Braço</Label>
                    <Input type="number" value={formData.pushUpReps} onChange={e => setFormData({...formData, pushUpReps: Number(e.target.value)})} className="h-12 rounded-xl font-black" />
                  </div>
                </div>
              </section>
            </div>
          </TabsContent>

          {/* 5. MANUAL / GUIA */}
          <TabsContent value="manual" className="space-y-6 animate-in fade-in slide-in-from-top-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="rounded-[2rem] overflow-hidden border-primary/10">
                <div className="aspect-video bg-black relative flex items-center justify-center group cursor-pointer">
                  <PlayCircle className="h-16 w-16 text-white/50 group-hover:text-primary transition-colors" />
                  <div className="absolute inset-0 bg-primary/10 group-hover:bg-primary/5 transition-colors" />
                  <p className="absolute bottom-4 left-4 text-[10px] font-black text-white uppercase tracking-widest">Tutorial: Protocolo de Bruce</p>
                </div>
                <CardContent className="p-6">
                  <h5 className="font-black uppercase text-sm mb-2">Bruce (Esteira)</h5>
                  <p className="text-xs text-muted-foreground leading-relaxed">Incrementos de velocidade e inclinação a cada 3 minutos. Registre o tempo total até a exaustão ou interrupção por critérios de segurança.</p>
                </CardContent>
              </Card>

              <Card className="rounded-[2rem] overflow-hidden border-primary/10">
                <div className="aspect-video bg-black relative flex items-center justify-center group cursor-pointer">
                  <PlayCircle className="h-16 w-16 text-white/50 group-hover:text-primary transition-colors" />
                  <div className="absolute inset-0 bg-primary/10 group-hover:bg-primary/5 transition-colors" />
                  <p className="absolute bottom-4 left-4 text-[10px] font-black text-white uppercase tracking-widest">Tutorial: Senior Fitness Test</p>
                </div>
                <CardContent className="p-6">
                  <h5 className="font-black uppercase text-sm mb-2">Testes Funcionais</h5>
                  <p className="text-xs text-muted-foreground leading-relaxed">Padronização da cadeira (43cm), cones a 2,44m e cronometragem precisa para o TUG e Caminhada de 6 minutos.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-primary uppercase tracking-tighter">Histórico de Avaliações</h3>
        <Button onClick={async () => {
          const docRef = await addDoc(collection(firestore, 'users', studentId, 'physicalAssessments'), { userId: studentId, date: new Date().toISOString(), createdAt: serverTimestamp() });
          setSelectedAssessmentId(docRef.id);
        }} className="bg-primary rounded-full px-6 font-black h-12 shadow-lg shadow-primary/20">+ NOVA AVALIAÇÃO</Button>
      </div>

      <div className="grid gap-4">
        {assessments?.map(a => (
          <Card key={a.id} className="nubank-card group cursor-pointer py-5 px-8 border-l-4 border-l-primary/30 hover:border-l-primary" onClick={() => setSelectedAssessmentId(a.id)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex flex-col items-center justify-center">
                  <span className="text-sm font-black text-primary">{format(new Date(a.date), 'dd')}</span>
                  <span className="text-[8px] font-bold text-primary uppercase">{format(new Date(a.date), 'MMM', { locale: ptBR })}</span>
                </div>
                <div>
                  <p className="font-black text-base group-hover:text-primary transition-colors">Relatório Técnico Antropométrico</p>
                  <div className="flex items-center gap-3 mt-1">
                    <Badge variant="outline" className="text-[8px] font-black uppercase border-primary/20 text-primary">IMC: {a.calculatedResults?.imc}</Badge>
                    {a.calculatedResults?.bpClassification && (
                      <Badge className={cn("text-[8px] font-black uppercase border-none", a.calculatedResults.bpClassification.color, a.calculatedResults.bpClassification.textColor)}>
                        {a.calculatedResults.bpClassification.label}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-all" />
            </div>
          </Card>
        ))}
        {(!assessments || assessments.length === 0) && (
          <div className="py-24 text-center border-2 border-dashed rounded-[3rem] bg-muted/10">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-10" />
            <p className="text-xs font-black uppercase text-muted-foreground tracking-widest">Nenhuma avaliação registrada para este aluno.</p>
          </div>
        )}
      </div>
    </div>
  );
}
