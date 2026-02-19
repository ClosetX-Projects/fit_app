'use server';

import { personalizedGoalRecommendations, type PersonalizedGoalRecommendationsInput } from '@/ai/flows/personalized-goal-recommendations';
import { generateStudentDailyInsight, type StudentDailyInsightInput } from '@/ai/flows/student-daily-insight';

/**
 * Limpa objetos recursivamente para garantir que sejam apenas objetos simples (POJO),
 * removendo métodos toJSON e instâncias de classes (como Timestamps do Firestore).
 */
function cleanObject(obj: any): any {
  return JSON.parse(JSON.stringify(obj));
}

export async function getAIGoalRecommendations(data: PersonalizedGoalRecommendationsInput) {
  try {
    const cleanData = cleanObject(data);
    const result = await personalizedGoalRecommendations(cleanData);
    return { success: true, goals: result.goalSuggestions };
  } catch (error: any) {
    console.error('Erro detalhado da IA (Metas):', error);
    return { success: false, error: 'Ocorreu um erro ao processar as metas pela IA. Verifique sua chave de API ou tente novamente.' };
  }
}

export async function getStudentDailyInsight(data: StudentDailyInsightInput) {
  try {
    const cleanData = cleanObject(data);
    const result = await generateStudentDailyInsight(cleanData);
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Erro detalhado da IA (Insight):', error);
    return { success: false, error: 'Falha ao obter dica do Coach IA.' };
  }
}
