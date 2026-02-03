'use server';

import { personalizedGoalRecommendations, type PersonalizedGoalRecommendationsInput } from '@/ai/flows/personalized-goal-recommendations';
import { generateStudentDailyInsight, type StudentDailyInsightInput } from '@/ai/flows/student-daily-insight';

export async function getAIGoalRecommendations(data: PersonalizedGoalRecommendationsInput) {
  try {
    const result = await personalizedGoalRecommendations(data);
    return { success: true, goals: result.goalSuggestions };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Falha ao gerar recomendações. Por favor, verifique sua chave de API e tente novamente.' };
  }
}

export async function getStudentDailyInsight(data: StudentDailyInsightInput) {
  try {
    const result = await generateStudentDailyInsight(data);
    return { success: true, data: result };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Falha ao obter dica do Coach.' };
  }
}
