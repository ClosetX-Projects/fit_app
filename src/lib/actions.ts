
'use server';

import { personalizedGoalRecommendations, type PersonalizedGoalRecommendationsInput } from '@/ai/flows/personalized-goal-recommendations';
import { generateStudentDailyInsight, type StudentDailyInsightInput } from '@/ai/flows/student-daily-insight';

/**
 * Limpa objetos recursivamente para garantir que sejam apenas objetos simples (POJO).
 */
function cleanObject(obj: any): any {
  if (!obj) return obj;
  return JSON.parse(JSON.stringify(obj));
}

export async function getAIGoalRecommendations(data: PersonalizedGoalRecommendationsInput) {
  try {
    const cleanData = cleanObject(data);
    const result = await personalizedGoalRecommendations(cleanData);
    return { success: true, goals: result.goalSuggestions };
  } catch (error: any) {
    console.error('Erro detalhado da IA (Metas):', error);
    return { success: false, error: 'Ocorreu um erro ao processar as metas pela IA.' };
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

/**
 * Simula a geração e o envio de um código de autenticação.
 */
export async function sendLoginCode(email: string) {
  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    
    // Em um app real, aqui você usaria o Admin SDK para salvar no Firestore de forma segura
    // e enviaria o e-mail via SendGrid/Resend.
    // Como estamos em um protótipo, retornaremos o código para exibição no Toast.
    
    return { success: true, code, expiresAt, message: 'Código gerado com sucesso.' };
  } catch (error) {
    return { success: false, error: 'Erro ao gerar código.' };
  }
}
