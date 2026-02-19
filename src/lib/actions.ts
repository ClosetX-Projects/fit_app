'use server';

import { personalizedGoalRecommendations, type PersonalizedGoalRecommendationsInput } from '@/ai/flows/personalized-goal-recommendations';
import { generateStudentDailyInsight, type StudentDailyInsightInput } from '@/ai/flows/student-daily-insight';

export async function getAIGoalRecommendations(data: PersonalizedGoalRecommendationsInput) {
  try {
    const result = await personalizedGoalRecommendations(data);
    return { success: true, goals: result.goalSuggestions };
  } catch (error: any) {
    console.error('Erro detalhado da IA (Metas):', error);
    return { success: false, error: 'Ocorreu um erro ao processar as metas pela IA. Tente novamente em alguns instantes.' };
  }
}

export async function getStudentDailyInsight(data: StudentDailyInsightInput) {
  try {
    const result = await generateStudentDailyInsight(data);
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Erro detalhado da IA (Insight):', error);
    return { success: false, error: 'Falha ao obter dica do Coach.' };
  }
}
