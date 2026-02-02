'use server';

/**
 * @fileOverview Provides AI-generated insights based on logged workout data.
 *
 * - generateTrainingInsights - A function that generates training insights.
 * - TrainingInsightsInput - The input type for the generateTrainingInsights function.
 * - TrainingInsightsOutput - The return type for the generateTrainingInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TrainingInsightsInputSchema = z.object({
  exercise: z.string().describe('The name of the exercise performed.'),
  duration: z.number().describe('The duration of the exercise in minutes.'),
  volume: z.object({
    sets: z.number().describe('The number of sets performed.'),
    reps: z.number().describe('The number of repetitions performed per set.'),
    weight: z.number().describe('The weight used in kilograms.'),
  }).describe('The volume of the exercise performed.'),
  rpe: z.number().describe('The Rate of Perceived Exertion (RPE) on a scale of 1 to 10.'),
});
export type TrainingInsightsInput = z.infer<typeof TrainingInsightsInputSchema>;

const TrainingInsightsOutputSchema = z.object({
  insights: z.string().describe('AI-generated insights based on the workout data.'),
});
export type TrainingInsightsOutput = z.infer<typeof TrainingInsightsOutputSchema>;

export async function generateTrainingInsights(input: TrainingInsightsInput): Promise<TrainingInsightsOutput> {
  return generateTrainingInsightsFlow(input);
}

const trainingInsightsPrompt = ai.definePrompt({
  name: 'trainingInsightsPrompt',
  input: {schema: TrainingInsightsInputSchema},
  output: {schema: TrainingInsightsOutputSchema},
  prompt: `Você é um personal trainer que fornece insights aos usuários com base em seus dados de treino registrados. Analise os dados a seguir e forneça insights práticos para ajudar o usuário a fazer melhores escolhas de treinamento e otimizar seu progresso de condicionamento físico. Considere fatores como tipo de exercício, duração, volume (séries, repetições, peso) e Nível de Esforço Percebido (RPE).

Exercício: {{{exercise}}}
Duração: {{{duration}}} minutos
Volume: {{{volume.sets}}} séries, {{{volume.reps}}} repetições, {{{volume.weight}}} kg
RPE: {{{rpe}}}

Insights:`,
});

const generateTrainingInsightsFlow = ai.defineFlow(
  {
    name: 'generateTrainingInsightsFlow',
    inputSchema: TrainingInsightsInputSchema,
    outputSchema: TrainingInsightsOutputSchema,
  },
  async input => {
    const {output} = await trainingInsightsPrompt(input);
    return output!;
  }
);
