
'use client';

import { useState } from 'react';
import { useUser } from '@/contexts/auth-provider';
import { useApi } from '@/hooks/use-api';
import { fetchApi } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Dumbbell, Loader2, ArrowLeft, ChevronRight, BookOpen, Search, Timer, TrendingUp, Layers } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TRAINING_METHODS, PROGRESSION_TYPES } from "@/lib/constants";

export function ProgramLibrary() {
  const { user } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [newMethod, setNewMethod] = useState('Múltiplas Séries');
  const [newProgression, setNewProgression] = useState('Linear');
  const [newDuration, setNewDuration] = useState('4');

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const [exName, setExName] = useState('');
  const [exSets, setExSets] = useState('');
  const [exReps, setExReps] = useState('');
  const [exRm, setExRm] = useState('');

  const { data: templates, loading: isLoadingTemplates, mutate: mutateTemplates } = useApi<any[]>('/programas/');
  const selectedTemplate = templates?.find((t: any) => t.id === selectedTemplateId);
  const { data: exercises, loading: isLoadingExercises, mutate: mutateExercises } = useApi<any[]>(selectedTemplateId ? `/treinos/?programa_id=${selectedTemplateId}` : null);
  const { data: catalogExercises } = useApi<any[]>('/exercicios/');

  const mapMethod = (m: string) => {
    const map: Record<string, string> = {
      'Múltiplas Séries': 'multiplas_series', 'Bi-Set': 'bi_set', 'Tri-Set': 'tri_set',
      'Pirâmide': 'piramide', 'Drop-Set': 'drop_set', 'Cluster Set': 'cluster_set',
      'GVT': 'gvt', 'Rest-Pause': 'rest_pause'
    };
    return map[m] || 'multiplas_series';
  };
  const mapProgression = (p: string) => p === 'Ondulatória' ? 'ondulatoria' : 'linear';

  const handleCreateTemplate = async () => {
    if (!newTemplateName || !user) return;
    setLoading(true);
    try {
      await fetchApi('/programas/', {
        method: 'POST',
        data: {
          professor_id: user.id,
          nome: newTemplateName,
          descricao: newTemplateDesc,
          metodo: mapMethod(newMethod),
          progressao: mapProgression(newProgression),
          semanas: Number(newDuration),
        }
      });
      toast({ title: "Template criado", description: "O programa base foi adicionado à sua biblioteca." });
      mutateTemplates();
      setNewTemplateName('');
      setNewTemplateDesc('');
      setShowEditor(false);
    } catch {
      toast({ variant: 'destructive', title: "Erro", description: "Erro ao criar template" });
    }
    setLoading(false);
  };

  const handleAddExercise = async () => {
    if (!user || !selectedTemplateId || !exName) return;
    setLoading(true);
    try {
      // Buscar o exercicio_id pelo nome no catálogo
      const searchResults = await fetchApi(`/exercicios/busca?nome=${encodeURIComponent(exName)}`);
      let exercicioId: string;
      if (searchResults && searchResults.length > 0) {
        exercicioId = searchResults[0].id;
      } else {
        // Criamos se não existir no catálogo
        const newEx = await fetchApi('/exercicios/', { method: 'POST', data: { nome: exName } });
        exercicioId = newEx.id;
      }
      const currentExercises = exercises || [];
      await fetchApi('/treinos/', {
        method: 'POST',
        data: {
          programa_id: selectedTemplateId,
          ordem: currentExercises.length + 1,
          exercicio_id: exercicioId,
          series: Number(exSets) || 3,
          reps_tempo: exReps || '3x10',
          pct_1rm: Number(exRm) || 0,
        }
      });
      toast({ title: "Exercício adicionado", description: `${exName} faz parte do template agora.` });
      mutateExercises();
      setExName(''); setExSets(''); setExReps(''); setExRm('');
    } catch {
      toast({ variant: 'destructive', title: "Erro" });
    }
    setLoading(false);
  };

  const handleDeleteExercise = async (exerciseId: string) => {
    if (!selectedTemplateId) return;
    try {
      await fetchApi(`/treinos/${exerciseId}`, { method: 'DELETE' });
      toast({ title: "Exercício removido" });
      mutateExercises();
    } catch {}
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await fetchApi(`/programas/${templateId}`, { method: 'DELETE' });
      toast({ title: "Template excluído" });
      mutateTemplates();
      if (selectedTemplateId === templateId) setSelectedTemplateId(null);
    } catch {}
  };

  if (selectedTemplateId && selectedTemplate) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setSelectedTemplateId(null)} className="rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h3 className="text-xl font-black text-primary uppercase tracking-tighter">{selectedTemplate.nome}</h3>
            <div className="flex flex-wrap gap-2 mt-1">
               <span className="text-[9px] font-black uppercase bg-primary/10 text-primary px-2 py-0.5 rounded-full">{selectedTemplate.metodo}</span>
               <span className="text-[9px] font-black uppercase bg-accent/20 text-accent-foreground px-2 py-0.5 rounded-full">Progresso {selectedTemplate.progressao}</span>
               <span className="text-[9px] font-black uppercase bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{selectedTemplate.semanas} Semanas</span>
            </div>
          </div>
        </div>

        <Card className="rounded-3xl border-primary/20 shadow-lg">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-wider">Novo Exercício no Modelo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="md:col-span-2 space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Exercício</Label>
                <Select value={exName} onValueChange={setExName}>
                  <SelectTrigger className="rounded-xl h-12">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(catalogExercises || []).map((ex: any) => (
                      <SelectItem key={ex.id} value={ex.nome}>{ex.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Séries</Label>
                <Input type="number" placeholder="Ex: 3" value={exSets} onChange={(e) => setExSets(e.target.value)} className="rounded-xl h-12" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Reps/Tempo</Label>
                <Input placeholder="Ex: 12" value={exReps} onChange={(e) => setExReps(e.target.value)} className="rounded-xl h-12" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">% 1RM</Label>
                <Input type="number" placeholder="Ex: 75" value={exRm} onChange={(e) => setExRm(e.target.value)} className="rounded-xl h-12" />
              </div>
              <Button onClick={handleAddExercise} disabled={loading || !exName} className="h-12 rounded-xl font-bold bg-primary shadow-md md:col-start-4">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h4 className="font-black text-xs uppercase text-primary tracking-widest flex items-center gap-2">
            <Dumbbell className="h-4 w-4" /> Composição do Template
          </h4>
          {isLoadingExercises ? (
            <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : exercises && exercises.length > 0 ? (
            <div className="grid gap-3">
              {exercises.map((ex) => (
                <div key={ex.id} className="nubank-card group flex items-center justify-between py-4 px-6">
                  <div className="flex gap-6 items-center">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black">
                      {ex.series}x
                    </div>
                    <div>
                      <p className="font-bold text-lg">{ex.exercicios?.nome || 'Exercício'}</p>
                      <p className="text-xs text-muted-foreground font-black uppercase tracking-tight">
                        {ex.reps_tempo} | {ex.pct_1rm || 0}% do 1RM
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-destructive/10" onClick={() => handleDeleteExercise(ex.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-16 text-center border-2 border-dashed rounded-[2rem] bg-muted/20">
              <p className="text-sm font-medium text-muted-foreground">Este template ainda não possui exercícios.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tighter uppercase">Biblioteca de treinos</h2>
          <p className="text-muted-foreground text-sm font-medium">Monte seus modelos base para agilizar a prescrição.</p>
        </div>
        {!showEditor && (
          <Button onClick={() => setShowEditor(true)} className="rounded-full px-8 h-12 font-bold shadow-lg bg-primary">
            <Plus className="mr-2 h-5 w-5" /> Criar novo treino
          </Button>
        )}
      </div>

      {showEditor && (
        <Card className="rounded-[2.5rem] border-primary/20 shadow-2xl overflow-hidden animate-in slide-in-from-top-4 duration-300">
          <CardHeader className="bg-primary/5 p-8 text-center border-b border-primary/10">
            <CardTitle className="text-2xl font-black uppercase text-primary">Novo Template de Treino</CardTitle>
            <CardDescription>Defina as bases do seu novo programa reutilizável.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="grid gap-2">
              <Label className="text-xs font-black uppercase tracking-widest text-primary">Nome do Programa</Label>
              <Input placeholder="Ex: Hipertrofia A/B (Foco em Quadríceps)" value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} className="rounded-2xl h-14 text-lg font-bold" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-primary flex items-center gap-1"><Layers className="h-3 w-3" /> Método</Label>
                  <Select value={newMethod} onValueChange={setNewMethod}>
                    <SelectTrigger className="rounded-xl h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                       {TRAINING_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
               </div>
               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-primary flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Progressão</Label>
                  <Select value={newProgression} onValueChange={setNewProgression}>
                    <SelectTrigger className="rounded-xl h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                       {PROGRESSION_TYPES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
               </div>
               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-primary flex items-center gap-1"><Timer className="h-3 w-3" /> Semanas</Label>
                  <Input type="number" value={newDuration} onChange={e => setNewDuration(e.target.value)} className="rounded-xl h-12" />
               </div>
            </div>

            <div className="grid gap-2">
              <Label className="text-xs font-black uppercase tracking-widest text-primary">Objetivo / Descrição</Label>
              <Textarea placeholder="Descreva brevemente para quem este treino é indicado..." value={newTemplateDesc} onChange={(e) => setNewTemplateDesc(e.target.value)} className="rounded-2xl min-h-[100px]" />
            </div>

            <div className="flex gap-4">
              <Button variant="ghost" onClick={() => setShowEditor(false)} className="flex-1 rounded-full h-14 font-bold">Cancelar</Button>
              <Button onClick={handleCreateTemplate} disabled={loading || !newTemplateName} className="flex-[2] rounded-full h-14 text-lg font-black bg-primary">
                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Salvar na Biblioteca"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoadingTemplates ? (
          <div className="col-span-full flex justify-center p-12"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
        ) : templates && templates.length > 0 ? (
          templates.map((template) => (
            <Card key={template.id} className="nubank-card group cursor-pointer hover:border-primary/50" onClick={() => setSelectedTemplateId(template.id)}>
              <div className="flex flex-col h-full justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <BookOpen className="h-5 w-5 text-primary opacity-50" />
                    <Button variant="ghost" size="icon" className="text-destructive opacity-0 group-hover:opacity-100 rounded-full hover:bg-destructive/10" onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTemplate(template.id);
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <h3 className="text-lg font-black text-foreground group-hover:text-primary transition-colors">{template.nome}</h3>
                  <div className="flex gap-2 flex-wrap">
                     <span className="text-[8px] font-black uppercase bg-primary/10 text-primary px-2 rounded-full">{template.metodo}</span>
                     <span className="text-[8px] font-black uppercase bg-accent/20 text-accent-foreground px-2 rounded-full">{template.semanas} Sem.</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 font-medium">{template.descricao}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-primary/5">
                   <p className="text-[10px] font-black uppercase text-primary/60 tracking-widest">Editar Estrutura</p>
                   <ChevronRight className="h-4 w-4 text-primary" />
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-24 text-center border-2 border-dashed rounded-[3rem] bg-muted/10">
             <BookOpen className="h-16 w-16 mx-auto mb-6 opacity-10" />
             <h3 className="text-xl font-black text-muted-foreground mb-2">Sua biblioteca está vazia</h3>
             <p className="text-sm text-muted-foreground max-w-xs mx-auto">Crie templates de treino para agilizar a montagem de fichas para seus alunos.</p>
          </div>
        )}
      </div>
    </div>
  );
}
