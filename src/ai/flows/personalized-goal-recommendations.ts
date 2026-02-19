'use server';
/**
 * @fileOverview Personalized fitness goal recommendations flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizedGoalRecommendationsInputSchema = z.object({
  userData: z.object({
    name: z.string(),
    age: z.number(),
    gender: z.string(),
    weight: z.number(),
    height: z.number(),
    email: z.string().email(),
    whatsapp: z.string().optional(),
  }),
  bodyComposition: z.object({
    weight: z.number(),
    height: z.number(),
    circumferences: z.record(z.number()),
    skinfolds: z.record(z.number()),
  }),
  bioimpedanceData: z.object({
    age: z.number(),
    height: z.number(),
    gender: z.string(),
    totalBodyWater: z.number(),
    protein: z.number(),
    mineralContent: z.number(),
    bodyFatMass: z.number(),
  }),
  strengthTestResults: z.object({
    vo2max: z.number(),
    oneRepMaxTest: z.record(z.number()),
  }),
  workoutConsistency: z.number(),
});

export type PersonalizedGoalRecommendationsInput = z.infer<typeof PersonalizedGoalRecommendationsInputSchema>;

const PersonalizedGoalRecommendationsOutputSchema = z.object({
  goalSuggestions: z.array(z.string()),
});

export type PersonalizedGoalRecommendationsOutput = z.infer<typeof PersonalizedGoalRecommendationsOutputSchema>;

export async function personalizedGoalRecommendations(input: PersonalizedGoalRecommendationsInput): Promise<PersonalizedGoalRecommendationsOutput> {
  return personalizedGoalRecommendationsFlow(input);
}

const personalizedGoalRecommendationsPrompt = ai.definePrompt({
  name: 'personalizedGoalRecommendationsPrompt',
  input: {schema: PersonalizedGoalRecommendationsInputSchema},
  output: {schema: PersonalizedGoalRecommendationsOutputSchema},
  prompt: `Você é um personal trainer especialista. Com base nos dados abaixo, sugira 3 metas reais e motivadoras.

  Usuário: {{{userData.name}}}, {{{userData.age}}} anos, {{{userData.gender}}}.
  Peso: {{{userData.weight}}}kg, Altura: {{{userData.height}}}cm.
  Consistência: {{{workoutConsistency}}}%.

  Gordura Corporal (Bio): {{{bioimpedanceData.bodyFatMass}}} kg.
  Proteína: {{{bioimpedanceData.protein}}} kg.

  Responda em Português do Brasil.`,
});

const personalizedGoalRecommendationsFlow = ai.defineFlow(
  {
    name: 'personalizedGoalRecommendationsFlow',
    inputSchema: PersonalizedGoalRecommendationsInputSchema,
    outputSchema: PersonalizedGoalRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await personalizedGoalRecommendationsPrompt(input);
    if (!output) throw new Error('Falha na resposta da IA');
    return output;
  }
);
