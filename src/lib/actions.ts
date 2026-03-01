
'use server';

import { personalizedGoalRecommendations, type PersonalizedGoalRecommendationsInput } from '@/ai/flows/personalized-goal-recommendations';
import { generateStudentDailyInsight, type StudentDailyInsightInput } from '@/ai/flows/student-daily-insight';

/**
 * Limpa objetos recursivamente para garantir que sejam apenas objetos simples (POJO).
 * O Genkit exige que os inputs sigam estritamente o esquema Zod.
 */
function sanitizeForAI(obj: any): any {
  if (!obj) return obj;
  // Deep clone to remove any Firestore-specific hidden methods/properties
  return JSON.parse(JSON.stringify(obj));
}

export async function getAIGoalRecommendations(data: PersonalizedGoalRecommendationsInput) {
  try {
    const cleanData = sanitizeForAI(data);
    
    // Executa o flow de metas personalizado
    const result = await personalizedGoalRecommendations(cleanData);
    
    if (!result || !result.goalSuggestions) {
      throw new Error('A IA não retornou uma resposta válida. Verifique os dados de entrada.');
    }

    return { 
      success: true, 
      goals: result.goalSuggestions 
    };
  } catch (error: any) {
    console.error('Erro na Action de Metas IA:', error);
    
    // Captura erros específicos do modelo ou de validação para exibir no UI
    const errorMessage = error.message || 'Erro de comunicação com o serviço Gemini.';
    return { 
      success: false, 
      error: errorMessage
    };
  }
}

export async function getStudentDailyInsight(data: StudentDailyInsightInput) {
  try {
    const cleanData = sanitizeForAI(data);
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
    
    return { success: true, code, expiresAt, message: 'Código gerado com sucesso.' };
  } catch (error) {
    return { success: false, error: 'Erro ao gerar código.' };
  }
}
