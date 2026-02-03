'use server';

/**
 * @fileOverview Flow para gerar insights diários para o aluno.
 * 
 * - generateStudentDailyInsight - Função que invoca o fluxo da IA.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const StudentDailyInsightInputSchema = z.object({
  recentSessions: z.array(z.any()).describe('Lista de sessões de treino recentes do aluno.'),
  lastAssessment: z.any().optional().describe('Dados da última avaliação física do aluno.'),
});

const StudentDailyInsightOutputSchema = z.object({
  insight: z.string().describe('Um insight motivador e curto baseado no progresso.'),
  tip: z.string().describe('Uma dica prática para o próximo treino.'),
});

export type StudentDailyInsightInput = z.infer<typeof StudentDailyInsightInputSchema>;
export type StudentDailyInsightOutput = z.infer<typeof StudentDailyInsightOutputSchema>;

export async function generateStudentDailyInsight(input: StudentDailyInsightInput): Promise<StudentDailyInsightOutput> {
  return studentDailyInsightFlow(input);
}

const studentDailyInsightPrompt = ai.definePrompt({
  name: 'studentDailyInsightPrompt',
  input: { schema: StudentDailyInsightInputSchema },
  output: { schema: StudentDailyInsightOutputSchema },
  prompt: `Você é um coach de fitness de elite, altamente motivador e focado em dados.
  Analise os treinos recentes do aluno e sua última avaliação física (se fornecida).
  Gere um insight motivador (máximo 2 frases) e uma dica prática muito específica para o dia de hoje.
  
  Treinos Recentes: {{JSON.stringify(recentSessions)}}
  Última Avaliação: {{JSON.stringify(lastAssessment)}}
  
  Responda sempre em Português do Brasil com um tom encorajador.`,
});

const studentDailyInsightFlow = ai.defineFlow(
  {
    name: 'studentDailyInsightFlow',
    inputSchema: StudentDailyInsightInputSchema,
    outputSchema: StudentDailyInsightOutputSchema,
  },
  async (input) => {
    const { output } = await studentDailyInsightPrompt(input);
    if (!output) throw new Error('Falha ao gerar o insight do Coach IA.');
    return output;
  }
);
