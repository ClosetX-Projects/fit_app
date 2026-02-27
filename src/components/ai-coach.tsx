'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Loader2, BrainCircuit } from 'lucide-react';
import { getStudentDailyInsight } from '@/lib/actions';

interface AICoachProps {
  recentSessions: any[];
  lastAssessment: any;
}

export function AICoach({ recentSessions, lastAssessment }: AICoachProps) {
  const [insight, setInsight] = useState<{ insight: string; tip: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadInsight() {
      if (!recentSessions || recentSessions.length === 0) return;
      
      setLoading(true);
      try {
        // Sanitizar dados para objetos planos antes de enviar para a Server Action
        const sanitizedData = JSON.parse(JSON.stringify({ 
          recentSessions: recentSessions, 
          lastAssessment: lastAssessment 
        }));

        const res = await getStudentDailyInsight(sanitizedData);

        if (res.success && res.data) {
          setInsight(res.data);
        }
      } catch (error) {
        console.error("Erro ao buscar insight da IA:", error);
      } finally {
        setLoading(false);
      }
    }
    loadInsight();
  }, [recentSessions, lastAssessment]);

  if (loading) {
    return (
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary mr-3" />
          <span className="text-sm font-medium">Analisando seu progresso...</span>
        </CardContent>
      </Card>
    );
  }

  if (!insight) return null;

  return (
    <Card className="bg-primary/5 border-primary/20 animate-in fade-in slide-in-from-top-2 duration-500">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-yellow-500" />
          Dica do Coach IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed text-foreground/90 italic">
          "{insight.insight}"
        </p>
        <div className="bg-background/60 p-3 rounded-lg border border-primary/10">
          <div className="flex items-center gap-2 mb-1">
            <BrainCircuit className="h-3 w-3 text-primary" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Ação sugerida</p>
          </div>
          <p className="text-sm font-medium">{insight.tip}</p>
        </div>
      </CardContent>
    </Card>
  );
}
