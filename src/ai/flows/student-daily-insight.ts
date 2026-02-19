'use server';

/**
 * @fileOverview Flow para gerar insights diários para o aluno.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const StudentDailyInsightInputSchema = z.object({
  recentSessions: z.array(z.any()),
  lastAssessment: z.any().optional(),
});

const StudentDailyInsightOutputSchema = z.object({
  insight: z.string(),
  tip: z.string(),
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
  prompt: `Você é um coach de elite. Analise o progresso e gere um insight motivador e uma dica prática.
  
  {{#if lastAssessment}}
  Última Avaliação: {{{lastAssessment.weight}}}kg, {{{lastAssessment.height}}}cm.
  {{/if}}

  Sessões Recentes: {{{recentSessions.length}}}.
  
  Responda em Português do Brasil.`,
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
