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
import { 
  Loader2, 
  Dumbbell, 
  ChevronRight, 
  ClipboardList, 
  Save,
  ArrowLeft,
  ClipboardCheck,
  Activity,
  Timer,
  Ruler,
  HeartPulse
} from 'lucide-react';
import { format, differenceInYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { getBloodPressureClassification } from '@/lib/constants';
import { cn } from '@/lib/utils';

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
  tenRmExercise: 'Supino Reto',
  tenRmWeight: 0,
  tenRmReps: 0,
  cooperDistance: 0,
  yoYoDistance: 0,
  bruceTime: 0,
  wellsDistance: 0,
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
    else if (student) setFormData({ ...INITIAL_FORM_DATA, fullName: student.name, gender: student.gender || 'male' });
  }, [assessment, student]);

  const assessmentInsights = useMemo(() => {
    const { weight: w, height: h, waist, hip, tenRmWeight, tenRmReps, cooperDistance, yoYoDistance, bruceTime, wellsDistance, gender, birthDate, subscapular, triceps, pectoral, suprailiac, abdominal, thigh, midLeg, systolic, diastolic } = formData;
    const age = birthDate ? differenceInYears(new Date(), new Date(birthDate)) : 30;
    
    // IMC
    const imc = h > 0 ? (w / ((h / 100) ** 2)) : 0;
    
    // 1RM
    const oneRm = tenRmReps > 0 ? (tenRmWeight / (1.0278 - (0.0278 * tenRmReps))) : 0;
    const oneRmTable = [95, 90, 85, 80, 75, 70, 60, 50].map(p => ({ perc: p, val: (oneRm * (p / 100)).toFixed(1) }));

    // VO2
    const vo2Cooper = cooperDistance > 0 ? (cooperDistance - 504.9) / 44.73 : 0;
    const vo2YoYo = yoYoDistance > 0 ? (yoYoDistance * 0.0084) + 36.4 : 0;
    let vo2Bruce = 0;
    if (bruceTime > 0) vo2Bruce = gender === 'male' ? (14.8 - (1.379 * bruceTime) + (0.451 * (bruceTime ** 2)) - (0.012 * (bruceTime ** 3))) : (4.38 * bruceTime - 3.9);

    // Gordura Corporal (Protocolos por idade)
    let fatPerc = 0;
    let fatClassification = "";
    const sum7 = Number(subscapular) + Number(triceps) + Number(formData.midAxillary || 0) + Number(pectoral) + Number(abdominal) + Number(suprailiac) + Number(thigh);
    const sum4Idoso = Number(subscapular) + Number(triceps) + Number(suprailiac) + Number(midLeg);

    if (age < 18) {
      // Slaughter
      if (gender === 'male') fatPerc = 0.735 * (Number(triceps) + Number(midLeg)) + 1.0;
      else fatPerc = 0.610 * (Number(triceps) + Number(midLeg)) + 5.1;
    } else if (age >= 60) {
      // Petroski (1995)
      let dc = 0;
      if (gender === 'male') {
        dc = 1.10726863 - (0.00081201 * sum4Idoso) + (0.00000212 * Math.pow(sum4Idoso, 2)) - (0.00041761 * age);
      } else {
        dc = 1.02902361 - (0.00067159 * sum4Idoso) + (0.00000242 * Math.pow(sum4Idoso, 2)) - (0.0002073 * age) - (0.00056009 * w) + (0.00054649 * h);
      }
      fatPerc = ((4.95 / dc) - 4.50) * 100;
    } else {
      // Jackson & Pollock 7
      let dc = 0;
      if (gender === 'male') dc = 1.112 - (0.00043499 * sum7) + (0.00000055 * Math.pow(sum7, 2)) - (0.00028826 * age);
      else dc = 1.0970 - (0.00046971 * sum7) + (0.00000056 * Math.pow(sum7, 2)) - (0.00012828 * age);
      fatPerc = ((4.95 / dc) - 4.50) * 100;
    }

    const finalFatPerc = Math.max(0, fatPerc);

    // Classificações Idoso Petroski
    if (age >= 60) {
      if (gender === 'female') {
        if (age < 70) {
          if (finalFatPerc < 17.0) fatClassification = "Abaixo";
          else if (finalFatPerc <= 20.7) fatClassification = "Regular";
          else if (finalFatPerc <= 24.6) fatClassification = "Acima";
          else fatClassification = "Muito Acima";
        } else {
          if (finalFatPerc < 14.9) fatClassification = "Abaixo";
          else if (finalFatPerc <= 18.7) fatClassification = "Regular";
          else if (finalFatPerc <= 23.2) fatClassification = "Acima";
          else fatClassification = "Muito Acima";
        }
      } else { // male
        if (age < 70) {
          if (finalFatPerc < 15.0) fatClassification = "Abaixo";
          else if (finalFatPerc <= 19.5) fatClassification = "Regular";
          else if (finalFatPerc <= 23.0) fatClassification = "Acima";
          else fatClassification = "Muito Acima";
        } else {
          if (finalFatPerc < 13.5) fatClassification = "Abaixo";
          else if (finalFatPerc <= 18.0) fatClassification = "Regular";
          else if (finalFatPerc <= 22.0) fatClassification = "Acima";
          else fatClassification = "Muito Acima";
        }
      }
    } else if (age >= 18) {
      if (gender === 'male') {
        if (finalFatPerc < 5) fatClassification = "Essencial";
        else if (finalFatPerc <= 13) fatClassification = "Atleta";
        else if (finalFatPerc <= 17) fatClassification = "Boa Forma";
        else if (finalFatPerc <= 24) fatClassification = "Aceitável";
        else fatClassification = "Obesidade";
      } else {
        if (finalFatPerc < 14) fatClassification = "Essencial";
        else if (finalFatPerc <= 20) fatClassification = "Atleta";
        else if (finalFatPerc <= 24) fatClassification = "Boa Forma";
        else if (finalFatPerc <= 31) fatClassification = "Aceitável";
        else fatClassification = "Obesidade";
      }
    }

    // Blood Pressure
    const bpClassification = getBloodPressureClassification(Number(systolic), Number(diastolic));

    return { 
      imc: imc.toFixed(1), oneRm: oneRm.toFixed(1), oneRmTable, vo2Cooper: vo2Cooper.toFixed(1), vo2Bruce: vo2Bruce.toFixed(1), fatPerc: finalFatPerc.toFixed(1), fatClassification, bpClassification
    };
  }, [formData]);

  const handleSave = async () => {
    if (!selectedAssessmentId || !firestore) return;
    setIsSaving(true);
    const assessmentRef = doc(firestore, 'users', studentId, 'physicalAssessments', selectedAssessmentId);
    setDocumentNonBlocking(assessmentRef, { ...formData, calculatedResults: assessmentInsights, updatedAt: serverTimestamp() }, { merge: true });
    toast({ title: "Avaliação Atualizada!" });
    setIsSaving(false);
  };

  if (isLoadingList) return <div className="flex justify-center py-12"><Loader2 className="animate-spin" /></div>;

  if (selectedAssessmentId && assessment) {
    return (
      <div className="space-y-6 pb-20">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setSelectedAssessmentId(null)}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
          <Button onClick={handleSave} disabled={isSaving} className="bg-primary">{isSaving ? <Loader2 className="animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Salvar Alterações</Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-primary/10 text-center"><p className="text-[10px] font-black uppercase text-primary">1RM Est.</p><p className="text-xl font-black">{assessmentInsights.oneRm}kg</p></Card>
          <Card className="p-4 bg-accent/10 text-center"><p className="text-[10px] font-black uppercase text-accent-foreground">VO2 Cooper</p><p className="text-xl font-black">{assessmentInsights.vo2Cooper}</p></Card>
          <Card className="p-4 bg-muted/50 text-center"><p className="text-[10px] font-black uppercase">% Gordura</p><p className="text-xl font-black">{assessmentInsights.fatPerc}% ({assessmentInsights.fatClassification})</p></Card>
          <Card className="p-4 bg-primary/5 text-center"><p className="text-[10px] font-black uppercase">IMC</p><p className="text-xl font-black">{assessmentInsights.imc}</p></Card>
        </div>

        {assessmentInsights.bpClassification && (
          <div className={cn("p-4 rounded-2xl text-center font-black uppercase text-xs flex items-center justify-center gap-2", assessmentInsights.bpClassification.color, assessmentInsights.bpClassification.textColor)}>
            <HeartPulse className="h-4 w-4" /> {assessmentInsights.bpClassification.label} ({formData.systolic}/{formData.diastolic} mmHg)
          </div>
        )}

        <Tabs defaultValue="testes">
          <TabsList className="grid w-full grid-cols-4 h-auto p-1 bg-muted rounded-2xl mb-8">
            <TabsTrigger value="testes" className="rounded-xl py-2 text-[10px] font-black uppercase">Testes Físicos</TabsTrigger>
            <TabsTrigger value="perimetros" className="rounded-xl py-2 text-[10px] font-black uppercase">Perímetros</TabsTrigger>
            <TabsTrigger value="dobras" className="rounded-xl py-2 text-[10px] font-black uppercase">Dobras</TabsTrigger>
            <TabsTrigger value="funcional" className="rounded-xl py-2 text-[10px] font-black uppercase">Clínica</TabsTrigger>
          </TabsList>

          <TabsContent value="testes" className="space-y-8">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h4 className="text-sm font-black uppercase flex items-center gap-2 mb-4 text-primary"><Dumbbell className="h-4 w-4" /> Força (10RM)</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><Label>Carga (kg)</Label><Input type="number" value={formData.tenRmWeight} onChange={e => setFormData({...formData, tenRmWeight: e.target.value})} /></div>
                    <div className="space-y-1"><Label>Reps</Label><Input type="number" value={formData.tenRmReps} onChange={e => setFormData({...formData, tenRmReps: e.target.value})} /></div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {assessmentInsights.oneRmTable.slice(0, 4).map(row => (
                      <div key={row.perc} className="p-2 bg-muted rounded text-center"><p className="text-[8px] font-bold">{row.perc}%</p><p className="text-xs font-black">{row.val}</p></div>
                    ))}
                  </div>
                </div>
              </Card>
              <Card className="p-6">
                <h4 className="text-sm font-black uppercase flex items-center gap-2 mb-4 text-primary"><Activity className="h-4 w-4" /> Cardiorrespiratório</h4>
                <div className="space-y-4">
                  <div className="space-y-1"><Label>Distância Cooper (m)</Label><Input type="number" value={formData.cooperDistance} onChange={e => setFormData({...formData, cooperDistance: e.target.value})} /></div>
                  <div className="space-y-1"><Label>Tempo Bruce (min)</Label><Input type="number" value={formData.bruceTime} onChange={e => setFormData({...formData, bruceTime: e.target.value})} /></div>
                </div>
              </Card>
            </div>
            <Card className="p-6">
              <h4 className="text-sm font-black uppercase flex items-center gap-2 mb-4 text-primary"><Ruler className="h-4 w-4" /> Flexibilidade (Wells)</h4>
              <div className="grid grid-cols-2 gap-8 items-center">
                <div className="space-y-1"><Label>Alcance (cm)</Label><Input type="number" value={formData.wellsDistance} onChange={e => setFormData({...formData, wellsDistance: e.target.value})} /></div>
                <div className="aspect-video bg-black rounded-xl relative flex items-center justify-center text-[10px] text-white/50 uppercase font-black">Vídeo Instrução</div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="perimetros" className="grid grid-cols-3 md:grid-cols-5 gap-4">
            {["neck", "waist", "hip", "armContractedR", "legR"].map(f => (
              <div key={f} className="space-y-1"><Label className="text-[10px]">{f}</Label><Input type="number" value={formData[f]} onChange={e => setFormData({...formData, [f]: e.target.value})} /></div>
            ))}
          </TabsContent>

          <TabsContent value="dobras" className="grid grid-cols-3 md:grid-cols-5 gap-4">
            {["triceps", "subscapular", "suprailiac", "midLeg", "abdominal", "pectoral", "thigh"].map(f => (
              <div key={f} className="space-y-1"><Label className="text-[10px] uppercase">{f}</Label><Input type="number" step="0.1" value={formData[f]} onChange={e => setFormData({...formData, [f]: e.target.value})} /></div>
            ))}
          </TabsContent>

          <TabsContent value="funcional" className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label>Sistólica (mmHg)</Label><Input type="number" value={formData.systolic} onChange={e => setFormData({...formData, systolic: e.target.value})} /></div>
              <div className="space-y-1"><Label>Diastólica (mmHg)</Label><Input type="number" value={formData.diastolic} onChange={e => setFormData({...formData, diastolic: e.target.value})} /></div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button onClick={async () => {
        const docRef = await addDoc(collection(firestore, 'users', studentId, 'physicalAssessments'), { userId: studentId, date: new Date().toISOString(), createdAt: serverTimestamp() });
        setSelectedAssessmentId(docRef.id);
      }} className="bg-primary">Nova Ficha de Avaliação</Button>
      <div className="grid gap-4">
        {assessments?.map(a => (
          <Card key={a.id} className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50" onClick={() => setSelectedAssessmentId(a.id)}>
            <div>
              <p className="font-bold">{format(new Date(a.date), 'dd/MM/yyyy')}</p>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-[10px] opacity-60 uppercase font-black">% Gord: {a.calculatedResults?.fatPerc}% ({a.calculatedResults?.fatClassification})</p>
                {a.calculatedResults?.bpClassification && (
                  <Badge variant="outline" className={cn("text-[8px] font-black uppercase border-none", a.calculatedResults.bpClassification.color, a.calculatedResults.bpClassification.textColor)}>
                    {a.calculatedResults.bpClassification.label}
                  </Badge>
                )}
              </div>
            </div>
            <ChevronRight className="h-4 w-4" />
          </Card>
        ))}
      </div>
    </div>
  );
}
