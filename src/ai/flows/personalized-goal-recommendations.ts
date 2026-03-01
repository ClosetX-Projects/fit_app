
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
  prompt: `Você é um personal trainer especialista e coach motivacional de elite. 
  Com base nos dados técnicos do aluno abaixo, você deve sugerir exatamente 3 metas de curto e médio prazo que sejam realistas, desafiadoras e baseadas em evidências científicas.

  PERFIL DO ALUNO:
  Nome: {{{userData.name}}}
  Idade: {{{userData.age}}} anos
  Gênero: {{{userData.gender}}}
  Peso Atual: {{{userData.weight}}} kg
  Altura: {{{userData.height}}} cm
  Consistência nos Treinos: {{{workoutConsistency}}}%

  DADOS COMPLEMENTARES:
  Gordura Corporal Estimada: {{{bioimpedanceData.bodyFatMass}}} kg
  VO2 Máximo: {{{strengthTestResults.vo2max}}} ml/kg/min

  INSTRUÇÕES:
  1. Analise o IMC e a composição corporal para definir se o foco deve ser perda de gordura, hipertrofia ou condicionamento.
  2. Gere 3 sugestões de metas curtas (ex: "Reduzir 2kg de gordura em 30 dias").
  3. Seja motivador no tom, mas técnico na recomendação.
  4. Responda em Português do Brasil.`,
});

const personalizedGoalRecommendationsFlow = ai.defineFlow(
  {
    name: 'personalizedGoalRecommendationsFlow',
    inputSchema: PersonalizedGoalRecommendationsInputSchema,
    outputSchema: PersonalizedGoalRecommendationsOutputSchema,
  },
  async input => {
    try {
      const {output} = await personalizedGoalRecommendationsPrompt(input);
      if (!output) {
        throw new Error('Não foi possível obter uma resposta estruturada da IA.');
      }
      return output;
    } catch (error: any) {
      // Retornando o erro real para debug visual na tela
      console.error('Erro na execução do Flow de Metas:', error);
      throw new Error(`Erro na IA: ${error.message || 'Falha desconhecida na comunicação.'}`);
    }
  }
);
