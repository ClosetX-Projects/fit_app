'use server';
/**
 * @fileOverview Personalized fitness goal recommendations flow.
 *
 * This file defines a Genkit flow that suggests personalized and achievable
 * fitness goals based on user assessment data and workout progress.
 *
 * @Exported Members:
 *   - personalizedGoalRecommendations - The main function to trigger the flow.
 *   - PersonalizedGoalRecommendationsInput - The input type for the flow.
 *   - PersonalizedGoalRecommendationsOutput - The output type for the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizedGoalRecommendationsInputSchema = z.object({
  userData: z.object({
    name: z.string().describe('User name'),
    age: z.number().describe('User age'),
    gender: z.string().describe('User gender'),
    weight: z.number().describe('User weight in kilograms'),
    height: z.number().describe('User height in centimeters'),
    email: z.string().email().describe('User email address'),
    whatsapp: z.string().optional().describe('User WhatsApp number'),
  }).describe('User profile data'),
  bodyComposition: z.object({
    weight: z.number().describe('Weight in kilograms'),
    height: z.number().describe('Height in centimeters'),
    circumferences: z.record(z.number()).describe('Circumference measurements'),
    skinfolds: z.record(z.number()).describe('Skinfold measurements'),
  }).describe('Body composition measurements'),
  bioimpedanceData: z.object({
    age: z.number().describe('Age'),
    height: z.number().describe('Height in centimeters'),
    gender: z.string().describe('Gender'),
    totalBodyWater: z.number().describe('Total body water'),
    protein: z.number().describe('Protein content'),
    mineralContent: z.number().describe('Mineral content'),
    bodyFatMass: z.number().describe('Body fat mass'),
  }).describe('Bioimpedance data'),
  strengthTestResults: z.object({
    vo2max: z.number().describe('VO2max result'),
    oneRepMaxTest: z.record(z.number()).describe('1RM test results'),
  }).describe('Strength test results'),
  workoutConsistency: z.number().describe('Workout consistency score (0-100)'),
}).describe('User fitness assessment data');

export type PersonalizedGoalRecommendationsInput = z.infer<typeof PersonalizedGoalRecommendationsInputSchema>;

const PersonalizedGoalRecommendationsOutputSchema = z.object({
  goalSuggestions: z.array(z.string()).describe('A list of personalized fitness goal suggestions'),
});

export type PersonalizedGoalRecommendationsOutput = z.infer<typeof PersonalizedGoalRecommendationsOutputSchema>;

export async function personalizedGoalRecommendations(input: PersonalizedGoalRecommendationsInput): Promise<PersonalizedGoalRecommendationsOutput> {
  return personalizedGoalRecommendationsFlow(input);
}

const personalizedGoalRecommendationsPrompt = ai.definePrompt({
  name: 'personalizedGoalRecommendationsPrompt',
  input: {schema: PersonalizedGoalRecommendationsInputSchema},
  output: {schema: PersonalizedGoalRecommendationsOutputSchema},
  prompt: `Você é um personal trainer que fornece sugestões de metas de condicionamento físico personalizadas para os usuários.

  Com base nas informações a seguir, sugira 3 metas de condicionamento físico alcançáveis para o usuário.
  Certifique-se de que a meta seja realista e motivadora.

  Dados do Usuário:
  - Nome: {{{userData.name}}}
  - Idade: {{{userData.age}}}
  - Gênero: {{{userData.gender}}}
  - Peso: {{{userData.weight}}}kg
  - Altura: {{{userData.height}}}cm

  Composição Corporal:
  - Peso: {{{bodyComposition.weight}}}kg
  - Altura: {{{bodyComposition.height}}}cm

  Bioimpedância:
  - Massa de Gordura Corporal: {{{bioimpedanceData.bodyFatMass}}}
  - Proteína: {{{bioimpedanceData.protein}}}

  Consistência do Treino: {{{workoutConsistency}}}%

  Responda com uma lista de metas. Seja específico sobre as metas e mantenha o usuário motivado.
  `,
});

const personalizedGoalRecommendationsFlow = ai.defineFlow(
  {
    name: 'personalizedGoalRecommendationsFlow',
    inputSchema: PersonalizedGoalRecommendationsInputSchema,
    outputSchema: PersonalizedGoalRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await personalizedGoalRecommendationsPrompt(input);
    return output!;
  }
);
