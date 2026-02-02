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
  prompt: `You are a personal trainer providing insights to users based on their logged workout data. Analyze the following data and provide actionable insights to help the user make better training choices and optimize their fitness progress. Consider factors such as exercise type, duration, volume (sets, reps, weight), and Rate of Perceived Exertion (RPE).

Exercise: {{{exercise}}}
Duration: {{{duration}}} minutes
Volume: {{{volume.sets}}} sets, {{{volume.reps}}} reps, {{{volume.weight}}} kg
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
